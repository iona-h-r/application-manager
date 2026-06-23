"""GET /jobs Lambda handler.

Returns job postings created by admins from admin-jobs table.
This endpoint is for Home page public listing.
"""

from boto3.dynamodb.conditions import Attr
from common.db import get_table_by_env
from common.response import create_response

table = get_table_by_env("ADMIN_JOBS_TABLE_NAME")


def _to_home_item(item: dict) -> dict:
    return {
        "id": item.get("jobId") or item.get("id"),
        "title": item.get("jobTitle"),
        "company": item.get("company"),
        "location": item.get("location"),
        "type": item.get("employmentType"),
        "budget": item.get("budget"),
        "description": item.get("description"),
        "createdAt": item.get("createdAt"),
    }


def handler(event, context):
    try:
        response = table.scan(
            FilterExpression=Attr("entityType").eq("JOB")
        )

        items = response.get("Items", [])
        items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

        return create_response(200, {"items": [_to_home_item(item) for item in items]})
    except Exception as exc:
        print(f"ERROR list_jobs: {exc}")
        return create_response(500, {"message": "Failed to fetch jobs"})
