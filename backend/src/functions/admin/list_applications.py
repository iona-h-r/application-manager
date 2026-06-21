"""GET /admin/applications 用 Lambda ハンドラー。

対象フロントページ:
- frontend/src/pages/Admin.jsx
"""

from boto3.dynamodb.conditions import Key
from common.auth import is_admin_event
from common.db import get_table_by_env
from common.response import create_response

table = get_table_by_env("APPLICATIONS_TABLE_NAME")

DEFAULT_LIMIT = 20
MAX_LIMIT = 100


def _get_single(application_id: str) -> dict:
    """id を指定して単一アイテムを取得する。"""
    resp = table.get_item(Key={"id": application_id})
    item = resp.get("Item")
    if item is None:
        return None
    return item


def _list_items(limit: int, next_token: str | None) -> tuple[list, str | None]:
    """createdAt 降順で一覧を取得する (GSI: createdAt-index を想定)。

    GSI 設定例:
      - IndexName: createdAt-index
            - Partition key: entityType (固定値 "APPLICATION")
      - Sort key: createdAt (降順スキャン)

    GSI がない環境では Scan にフォールバックする。
    """
    kwargs: dict = {
        "Limit": limit,
        "ScanIndexForward": False,  # 降順
    }
    if next_token:
        kwargs["ExclusiveStartKey"] = {"nextToken": next_token}

    try:
        resp = table.query(
            IndexName="createdAt-index",
            KeyConditionExpression=Key("entityType").eq("APPLICATION"),
            **kwargs,
        )
    except Exception:
        # GSI が存在しない場合は Scan にフォールバック
        scan_kwargs: dict = {"Limit": limit}
        if next_token:
            scan_kwargs["ExclusiveStartKey"] = {"nextToken": next_token}
        resp = table.scan(**scan_kwargs)

    items = resp.get("Items", [])
    last_key = resp.get("LastEvaluatedKey")
    out_token = last_key.get("nextToken") if last_key else None
    return items, out_token


def handler(event, context):
    # 1) 管理者権限チェック
    if not is_admin_event(event):
        return create_response(
            403,
            {"message": "Forbidden: 管理者権限が必要です。"},
        )

    params = event.get("queryStringParameters") or {}

    # 2) id の有無で単一取得 / 一覧取得を分岐
    application_id = params.get("id")

    # --- 単一取得 ---
    if application_id:
        item = _get_single(application_id)
        if item is None:
            return create_response(
                404,
                {"message": f"Application '{application_id}' が見つかりません。"},
            )
        return create_response(200, {"item": item})

    # --- 一覧取得 ---
    try:
        raw_limit = int(params.get("limit", DEFAULT_LIMIT))
        limit = max(1, min(raw_limit, MAX_LIMIT))
    except (ValueError, TypeError):
        limit = DEFAULT_LIMIT

    next_token = params.get("nextToken") or None

    try:
        items, out_token = _list_items(limit, next_token)
    except Exception as exc:
        print(f"ERROR list_applications: {exc}")
        return create_response(
            500,
            {"message": "内部エラーが発生しました。しばらくしてから再試行してください。"},
        )

    body: dict = {"items": items}
    if out_token:
        body["nextToken"] = out_token

    return create_response(200, body)
