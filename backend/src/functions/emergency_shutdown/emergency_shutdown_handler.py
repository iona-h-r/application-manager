"""
Emergency Shutdown Lambda
─────────────────────────────────────────────────────────────
CloudWatch Alarm または AWS Budget のアラームを SNS 経由で受信し、
以下を順番に実行する冪等な緊急停止ハンドラ。

    1. CloudFront Distribution を無効化
    2. API Gateway $default ステージを削除
    3. Cognito User Pool の自己登録を無効化
    4. SES で管理者へ停止完了通知メールを送信
"""

import json
import logging
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ── 環境変数 ────────────────────────────────────────────────
CLOUDFRONT_DISTRIBUTION_ID = os.environ["CLOUDFRONT_DISTRIBUTION_ID"]
API_GW_API_ID              = os.environ["API_GW_API_ID"]
API_GW_STAGE_NAME          = os.environ["API_GW_STAGE_NAME"]          # "$default"
COGNITO_USER_POOL_ID       = os.environ["COGNITO_USER_POOL_ID"]
SES_FROM_ADDRESS           = os.environ["SES_FROM_ADDRESS"]
SES_ADMIN_ADDRESS          = os.environ["SES_ADMIN_ADDRESS"]
AWS_REGION                 = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "ap-northeast-1"))

# ── AWS クライアント ─────────────────────────────────────────
cf_client      = boto3.client("cloudfront")
apigw_client   = boto3.client("apigatewayv2", region_name=AWS_REGION)
cognito_client = boto3.client("cognito-idp", region_name=AWS_REGION)
ses_client     = boto3.client("ses", region_name=AWS_REGION)


# ────────────────────────────────────────────────────────────
# 1. CloudFront 停止
# ────────────────────────────────────────────────────────────
def disable_cloudfront() -> str:
    """Distribution の Enabled を false に変更する（冪等）。"""
    resp   = cf_client.get_distribution_config(Id=CLOUDFRONT_DISTRIBUTION_ID)
    config = resp["DistributionConfig"]
    etag   = resp["ETag"]

    if not config["Enabled"]:
        logger.info("[CloudFront] Already disabled. Skipping.")
        return "already_disabled"

    config["Enabled"] = False
    cf_client.update_distribution(
        Id=CLOUDFRONT_DISTRIBUTION_ID,
        DistributionConfig=config,
        IfMatch=etag,
    )
    logger.info("[CloudFront] Disabled successfully.")
    return "disabled"


# ────────────────────────────────────────────────────────────
# 2. API Gateway ステージ削除
# ────────────────────────────────────────────────────────────
def delete_api_gateway_stage() -> str:
    """
    本番ステージを削除する（冪等）。
    復旧は terraform apply で Stage を再作成する。
    """
    try:
        apigw_client.delete_stage(
            ApiId=API_GW_API_ID,
            StageName=API_GW_STAGE_NAME,
        )
        logger.info("[API Gateway] Stage '%s' deleted.", API_GW_STAGE_NAME)
        return "deleted"
    except ClientError as e:
        if e.response["Error"]["Code"] == "NotFoundException":
            logger.info("[API Gateway] Stage '%s' not found (already deleted). Skipping.", API_GW_STAGE_NAME)
            return "already_deleted"
        raise


# ────────────────────────────────────────────────────────────
# 3. Cognito サインアップ停止
# ────────────────────────────────────────────────────────────
def disable_cognito_signup() -> str:
    """User Pool の自己登録を無効化する（冪等）。"""
    response = cognito_client.describe_user_pool(UserPoolId=COGNITO_USER_POOL_ID)
    user_pool = response["UserPool"]
    admin_create_user_config = dict(user_pool.get("AdminCreateUserConfig") or {})

    if admin_create_user_config.get("AllowAdminCreateUserOnly") is True:
        logger.info("[Cognito] Self sign-up already disabled. Skipping.")
        return "already_disabled"

    admin_create_user_config["AllowAdminCreateUserOnly"] = True

    cognito_client.update_user_pool(
        UserPoolId=COGNITO_USER_POOL_ID,
        AdminCreateUserConfig=admin_create_user_config,
    )
    logger.info("[Cognito] Self sign-up disabled.")
    return "disabled"


# ────────────────────────────────────────────────────────────
# 4. 管理者通知
# ────────────────────────────────────────────────────────────
def notify_admin(trigger_source: str, trigger_detail: str, results: dict) -> None:
    """緊急停止の実施内容を SES で管理者へ通知する。"""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    body = f"""【緊急停止通知】Emergency Shutdown が実行されました

発動日時  : {now}
発動理由  : {trigger_source}
詳細      : {trigger_detail}

■ 実施した停止処理
  - CloudFront  : {results.get("cloudfront",  "N/A")}
  - API Gateway : {results.get("api_gateway", "N/A")}
  - Cognito     : {results.get("cognito",     "N/A")}

■ 復旧手順
  1. Cognito サインアップ再開
      aws cognito-idp update-user-pool --user-pool-id {COGNITO_USER_POOL_ID} --admin-create-user-config AllowAdminCreateUserOnly=false

  2. API Gateway / CloudFront 再有効化
      cd terraform && terraform apply

※ このメールは自動送信されています。
"""

    try:
        ses_client.send_email(
            Source=SES_FROM_ADDRESS,
            Destination={"ToAddresses": [SES_ADMIN_ADDRESS]},
            Message={
                "Subject": {"Data": "【緊急】Emergency Shutdown が実行されました", "Charset": "UTF-8"},
                "Body":    {"Text": {"Data": body, "Charset": "UTF-8"}},
            },
        )
        logger.info("[Notify] Admin notification sent to %s.", SES_ADMIN_ADDRESS)
    except ClientError as e:
        # 通知失敗は停止処理の成否に影響させない
        logger.error("[Notify] Failed to send email: %s", e)


# ────────────────────────────────────────────────────────────
# SNS メッセージ解析
# ────────────────────────────────────────────────────────────
def parse_trigger(event: dict) -> tuple[str, str]:
    """
    SNS Records からトリガー種別と詳細を抽出する。

    Returns:
        (trigger_source, trigger_detail)
        trigger_source : "CloudWatch Alarm" | "AWS Budget" | "Unknown"
    """
    try:
        record  = event["Records"][0]
        message = json.loads(record["Sns"]["Message"])

        # CloudWatch Alarm
        alarm_name = message.get("AlarmName") or message.get("alarmName")
        if alarm_name:
            reason = message.get("NewStateReason") or message.get("newStateReason") or ""
            return "CloudWatch Alarm", f"{alarm_name} / {reason}".strip(" /")

        # AWS Budget（メッセージ形式が異なる）
        budget_name = message.get("budgetName") or message.get("BudgetName")
        if budget_name:
            budget_state = (
                message.get("newStateReason")
                or message.get("newState")
                or message.get("message")
                or message.get("budgetType")
                or ""
            )
            return "AWS Budget", f"{budget_name} / {budget_state}".strip(" /")

        return "Unknown", json.dumps(message)

    except Exception as e:
        logger.warning("Failed to parse trigger: %s", e)
        return "Unknown", str(event)


# ────────────────────────────────────────────────────────────
# Lambda Handler
# ────────────────────────────────────────────────────────────
def handler(event, context):
    logger.info("Emergency shutdown triggered. event=%s", json.dumps(event))

    trigger_source, trigger_detail = parse_trigger(event)
    logger.info("Trigger: source=%s detail=%s", trigger_source, trigger_detail)

    results = {}
    errors  = []

    # 1. CloudFront
    try:
        results["cloudfront"] = disable_cloudfront()
    except Exception as e:
        logger.error("[CloudFront] Error: %s", e, exc_info=True)
        results["cloudfront"] = f"ERROR: {e}"
        errors.append(f"CloudFront: {e}")

    # 2. API Gateway
    try:
        results["api_gateway"] = delete_api_gateway_stage()
    except Exception as e:
        logger.error("[API Gateway] Error: %s", e, exc_info=True)
        results["api_gateway"] = f"ERROR: {e}"
        errors.append(f"API Gateway: {e}")

    # 3. Cognito
    try:
        results["cognito"] = disable_cognito_signup()
    except Exception as e:
        logger.error("[Cognito] Error: %s", e, exc_info=True)
        results["cognito"] = f"ERROR: {e}"
        errors.append(f"Cognito: {e}")

    # 4. 管理者通知（停止処理の成否に関わらず実行）
    notify_admin(trigger_source, trigger_detail, results)

    logger.info("Shutdown results: %s", json.dumps(results))

    if errors:
        raise RuntimeError("Partial shutdown failure:\n" + "\n".join(errors))

    return {"status": "shutdown_complete", "results": results}
