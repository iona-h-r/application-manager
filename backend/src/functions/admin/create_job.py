"""POST /admin/jobs Lambda handler.

Target frontend page:
- frontend/src/pages/AdminJobCreate.jsx
"""

import json
import uuid
from decimal import Decimal, InvalidOperation
from datetime import datetime, timezone

from common.auth import get_claims, get_user_sub, is_admin_event
from common.db import get_table_by_env
from common.response import create_response

table = get_table_by_env("ADMIN_JOBS_TABLE_NAME")

REQUIRED_FIELDS = [
    "jobTitle",
    "company",
    "location",
    "employmentType",
    "budget",
    "description",
]


# ---------- バリデーション ----------

def _validate(body: dict) -> list[str]:
    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        if body.get(field) is None or body.get(field) == "":
            errors.append(f"'{field}' is required.")

    budget = body.get("budget")
    if budget is not None:
        try:
            if Decimal(str(budget)) < 0:
                errors.append("'budget' must be >= 0.")
        except (TypeError, ValueError, InvalidOperation):
            errors.append("'budget' must be a number.")

    return errors


# ---------- ID 生成 ----------

def _generate_job_id() -> str:
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:8].upper()
    return f"JOB-{date_str}-{suffix}"


# ---------- ハンドラー ----------

def handler(event, context):
    # 1) 認可
    claims = get_claims(event)
    if not is_admin_event(event):
        return create_response(403, {"message": "Forbidden: admin privileges required."})

    # 2) ボディのパース
    try:
        body: dict = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return create_response(400, {"message": "Invalid JSON body."})

    # 3) バリデーション
    errors = _validate(body)
    if errors:
        return create_response(400, {"message": "Validation error.", "errors": errors})

    # 4) ID・タイムスタンプ・ユーザーID生成
    job_id = _generate_job_id()
    now = datetime.now(timezone.utc).isoformat()
    owner_user_id = get_user_sub(claims, local_fallback="local-admin")
    if not owner_user_id:
        return create_response(401, {"message": "認証情報からユーザーIDを取得できませんでした。"})

    # 5) DynamoDB へ保存
    item = {
        "id": job_id,
        "ownerUserId": owner_user_id,
        "createdAt": now,
        "updatedAt": now,
        "jobTitle": body["jobTitle"],
        "company": body["company"],
        "location": body["location"],
        "employmentType": body["employmentType"],
        "budget": Decimal(str(body["budget"])),
        "description": body["description"],
        "status": "OPEN",
        "publishedAt": now,
        # 任意項目を透過的に保存
        **{
            k: v for k, v in body.items()
            if k not in REQUIRED_FIELDS and k not in ["status", "publishedAt", "closedAt"] and v is not None
        },
    }

    try:
        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(id)",
        )
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        job_id = _generate_job_id()
        item["id"] = job_id
        table.put_item(Item=item)
    except Exception as exc:
        print(f"ERROR put_item: {exc}")
        return create_response(500, {"message": "Failed to save job record."})

    # 6) 201 Created
    return create_response(
        201,
        {
            "message": "Job created successfully.",
            "jobId": job_id,
            "status": "OPEN",
            "jobTitle": body["jobTitle"],
            "createdAt": now,
        },
    )
