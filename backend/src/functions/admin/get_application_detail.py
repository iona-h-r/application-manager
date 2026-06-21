"""GET /admin/applications/{applicationId} Lambda handler.

Target frontend page:
- frontend/src/pages/ApplicationDetail.jsx
"""

from common.auth import is_admin_event
from common.db import get_table_by_env
from common.response import create_response

table = get_table_by_env("APPLICATIONS_TABLE_NAME")

# Fields expected by ApplicationDetail.jsx — filter to only these keys.
DETAIL_FIELDS = {
    "id",
    "jobTitle",
    "applicantUserId",
    "applicantName",
    "rating",
    "achievementCount",
    "proposalAmount",
    "proposalContent",
    "createdAt",
}


def _fetch_item(application_id: str) -> dict | None:
    """Fetch a single application by its primary key."""
    resp = table.get_item(Key={"id": application_id})
    return resp.get("Item")


def _project(item: dict) -> dict:
    """Return only the fields ApplicationDetail.jsx needs."""
    return {k: item[k] for k in DETAIL_FIELDS if k in item}


def handler(event, context):
    # 1) Admin authorisation check
    if not is_admin_event(event):
        return create_response(
            403,
            {"message": "Forbidden: admin privileges required."},
        )

    # 2) Path parameter
    path_params = event.get("pathParameters") or {}
    application_id = path_params.get("applicationId", "").strip()

    if not application_id:
        return create_response(
            400,
            {"message": "Missing path parameter: applicationId."},
        )

    # 3) DynamoDB fetch
    try:
        item = _fetch_item(application_id)
    except Exception as exc:
        print(f"ERROR get_item: {exc}")
        return create_response(
            500,
            {"message": "An unexpected error occurred. Please try again later."},
        )

    # 4) Not found
    if item is None:
        return create_response(
            404,
            {"message": f"Application '{application_id}' not found."},
        )

    # 5) Return projected payload
    return create_response(200, _project(item))
