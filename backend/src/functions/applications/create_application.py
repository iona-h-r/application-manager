"""POST /applications 用 Lambda ハンドラー。"""

import json
import os
import uuid
from decimal import Decimal, InvalidOperation
from datetime import datetime, timezone

import boto3
from common.auth import get_claims
from common.db import get_table_by_env
from common.response import create_response

table = get_table_by_env("APPLICATIONS_TABLE_NAME")
admin_jobs_table = get_table_by_env("ADMIN_JOBS_TABLE_NAME")

# SES は設定されている場合のみ使用
SES_ENABLED = os.environ.get("SES_ENABLED", "false").lower() == "true"
SES_FROM = os.environ.get("SES_FROM_ADDRESS", "")
SES_TO = os.environ.get("SES_ADMIN_ADDRESS", "")
DOMAIN_NAME = os.environ.get("DOMAIN_NAME", "http://localhost:5173")

print(f"SES_ENABLED: {SES_ENABLED}, SES_FROM: {SES_FROM}, SES_TO: {SES_TO}, DOMAIN_NAME: {DOMAIN_NAME}")

ses = boto3.client("ses") if SES_ENABLED else None

print(f"SES client initialized: {ses}")

REQUIRED_FIELDS = [
    "jobId",
    "jobTitle",
    "applicantName",
    "proposalAmount",
    "proposalContent",
]


# ---------- バリデーション ----------

def _validate(body: dict) -> list[str]:
    errors: list[str] = []

    # 必須項目の存在チェック
    for field in REQUIRED_FIELDS:
        if body.get(field) is None or body.get(field) == "":
            errors.append(f"'{field}' は必須項目です。")

    # 型・範囲チェック（存在する場合のみ）
    proposal_amount = body.get("proposalAmount")
    if proposal_amount is not None:
        try:
            pa = Decimal(str(proposal_amount))
            if pa < 0:
                errors.append("'proposalAmount' は 0 以上の値で指定してください。")
        except (TypeError, ValueError, InvalidOperation):
            errors.append("'proposalAmount' は数値で指定してください。")

    return errors


# ---------- ID 生成 ----------

def _generate_application_id() -> str:
    """APP-YYYYMMDD-<8桁 UUID> 形式で採番する。"""
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:8].upper()
    return f"APP-{date_str}-{unique_suffix}"


def _get_applicant_user_id(claims: dict, body: dict) -> str | None:
    if os.environ.get("SKIP_AUTH") == "true":
        user_id = str(body.get("applicantUserId") or "").strip()
        return user_id or None
    user_id = str(claims.get("sub") or "").strip()
    return user_id or None


def _get_job_owner_user_id(job_id: str) -> str | None:
    if not job_id:
        return None

    resp = admin_jobs_table.get_item(Key={"id": job_id})
    job = resp.get("Item")
    if not job:
        return None

    owner_user_id = str(job.get("ownerUserId") or "").strip()
    return owner_user_id or None


# ---------- SES 通知 ----------

def _notify_admin(item: dict) -> None:
    if not ses:
        print(f"INFO SES notification skipped: SES is not enabled")
        return
    try:
        print(f"INFO SES notification : SES is enabled")
        subject = f"[申請受付] {item['jobTitle']} - {item['applicantName']}"
        body_text = (
            f"新しい申請が登録されました。\n\n"
            f"申請ID      : {item['id']}\n"
            f"ポジション  : {item['jobTitle']}\n"
            f"申請者      : {item['applicantName']}\n"
            f"提案金額    : {item['proposalAmount']}\n"
            f"ステータス  : {item['status']}\n"
            f"登録日時    : {item['createdAt']}\n\n"
            f"提案内容:\n{item['proposalContent']}\n\n\n"
            f"詳細はこちら:\n"
            f"{DOMAIN_NAME}/admin/applications/{item['id']}\n\n"
        )
        ses.send_email(
            Source=SES_FROM,
            Destination={"ToAddresses": [SES_TO]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Text": {"Data": body_text, "Charset": "UTF-8"}},
            },
        )
    except Exception as exc:
        # 通知失敗はログに残すが、API レスポンスは成功のまま返す
        print(f"WARN SES notification failed: {exc}")


# ---------- ハンドラー ----------

def handler(event, context):
    claims = get_claims(event)

    # 1) ボディのパース
    try:
        body: dict = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return create_response(400, {"message": "リクエストボディが不正な JSON です。"})

    # 2) バリデーション
    errors = _validate(body)
    if errors:
        return create_response(400, {"message": "入力値にエラーがあります。", "errors": errors})

    # 3) id 採番
    application_id = _generate_application_id()

    # 4) サーバ時刻付与
    created_at = datetime.now(timezone.utc).isoformat()
    applicant_user_id = _get_applicant_user_id(claims, body)
    if not applicant_user_id:
        if os.environ.get("SKIP_AUTH") == "true":
            return create_response(400, {"message": "'applicantUserId' は必須項目です。"})
        return create_response(401, {"message": "認証情報からユーザーIDを取得できませんでした。"})

    owner_user_id = _get_job_owner_user_id(body["jobId"])
    if not owner_user_id:
        return create_response(404, {"message": "応募対象の求人が見つかりません。"})

    # 5) DynamoDB へ保存
    item = {
        "id": application_id,          # PK
        "createdAt": created_at,
        "jobId": body["jobId"],
        "jobTitle": body["jobTitle"],
        "ownerUserId": owner_user_id,
        "applicantUserId": applicant_user_id,
        "applicantName": body["applicantName"],
        "proposalAmount": Decimal(str(body["proposalAmount"])),
        "proposalContent": body["proposalContent"],
        "status": "APPLIED",
        # 任意項目があれば透過的に保存
        **{
            k: v for k, v in body.items()
            if k not in REQUIRED_FIELDS
            and k not in ["applicantUserId", "status", "createdAt", "reviewedBy", "reviewedAt"]
            and v is not None
        },
    }

    try:
        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(id)",  # 重複防止
        )
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        # 衝突した場合は再採番して 1 度だけリトライ
        application_id = _generate_application_id()
        item["id"] = application_id
        table.put_item(Item=item)
    except Exception as exc:
        print(f"ERROR put_item: {exc}")
        return create_response(500, {"message": "データの保存中にエラーが発生しました。"})

    # 6) SES 管理者通知（失敗してもレスポンスには影響しない）
    _notify_admin(item)

    # 7) 201 Created
    return create_response(
        201,
        {
            "message": "申請が正常に登録されました。",
            "id": application_id,
            "createdAt": created_at,
            "ownerUserId": owner_user_id,
        },
    )
