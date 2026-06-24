#!/usr/bin/env python3
"""DynamoDB test data seeder for local/prod-like verification.

Creates data for both viewpoints:
- Admin viewpoint (jobs): my jobs + other admins' jobs
- User viewpoint (applications): my applications + other users' applications

Usage examples:
  python scripts/seed_test_data.py --my-user-id local-user-001
  python scripts/seed_test_data.py --my-user-id local-user-001 --my-admin-id local-admin-001
  python scripts/seed_test_data.py --my-user-id user-123 --endpoint-url http://localhost:8000
"""

from __future__ import annotations

import argparse
import random
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3


JST_COMPANIES = [
    "さくらメディカル",
    "北斗クリニック",
    "東雲ヘルスケア",
    "みなと総合病院",
    "白樺診療所",
]

LOCATIONS = [
    "北海道札幌市中央区",
    "東京都港区",
    "愛知県名古屋市中区",
    "大阪府大阪市北区",
    "福岡県福岡市博多区",
]

EMPLOYMENT_TYPES = ["正社員", "契約社員", "業務委託", "パート"]

JOB_TITLES = [
    "放射線技師",
    "臨床検査技師",
    "看護師",
    "医療事務",
    "リハビリスタッフ",
]

APPLICATION_STATUSES = ["APPLIED", "REVIEWING", "INTERVIEW", "HIRED", "REJECTED"]


@dataclass
class Config:
    endpoint_url: str | None
    region: str
    admin_jobs_table: str
    applications_table: str
    my_user_id: str
    my_admin_id: str
    my_job_count: int
    other_job_count: int
    my_application_count: int
    other_application_count: int


def parse_args() -> Config:
    parser = argparse.ArgumentParser(description="Seed DynamoDB test data for jobs/applications.")

    parser.add_argument("--endpoint-url", default="http://localhost:8000", help="DynamoDB endpoint URL (set empty to use AWS).")
    parser.add_argument("--region", default="ap-northeast-1", help="AWS region.")

    parser.add_argument("--admin-jobs-table", default="admin-jobs", help="Admin jobs table name.")
    parser.add_argument("--applications-table", default="applications", help="Applications table name.")

    parser.add_argument("--my-user-id", required=True, help="Your Cognito sub (for applicantUserId).")
    parser.add_argument("--my-admin-id", default="", help="Your admin user id (for ownerUserId). Default: same as --my-user-id")

    parser.add_argument("--my-job-count", type=int, default=25, help="Number of my jobs.")
    parser.add_argument("--other-job-count", type=int, default=25, help="Number of other admins' jobs.")
    parser.add_argument("--my-application-count", type=int, default=25, help="Number of my applications.")
    parser.add_argument("--other-application-count", type=int, default=25, help="Number of other users' applications.")

    args = parser.parse_args()

    my_admin_id = args.my_admin_id.strip() or args.my_user_id.strip()

    endpoint = args.endpoint_url.strip()
    endpoint_url = endpoint if endpoint else None

    return Config(
        endpoint_url=endpoint_url,
        region=args.region,
        admin_jobs_table=args.admin_jobs_table,
        applications_table=args.applications_table,
        my_user_id=args.my_user_id.strip(),
        my_admin_id=my_admin_id,
        my_job_count=max(0, args.my_job_count),
        other_job_count=max(0, args.other_job_count),
        my_application_count=max(0, args.my_application_count),
        other_application_count=max(0, args.other_application_count),
    )


def dynamodb_resource(cfg: Config):
    if cfg.endpoint_url:
        return boto3.resource("dynamodb", region_name=cfg.region, endpoint_url=cfg.endpoint_url)
    return boto3.resource("dynamodb", region_name=cfg.region)


def new_job_id(ts: datetime) -> str:
    return f"JOB-{ts.strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


def new_application_id(ts: datetime) -> str:
    return f"APP-{ts.strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


def iso_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat()


def build_jobs(cfg: Config) -> tuple[list[dict], list[dict], list[dict]]:
    now = datetime.now(timezone.utc)

    my_jobs: list[dict] = []
    other_jobs: list[dict] = []
    all_jobs: list[dict] = []

    for i in range(cfg.my_job_count):
        ts = now - timedelta(minutes=i)
        job_id = new_job_id(ts)
        status = "OPEN" if i % 5 != 0 else "CLOSED"
        item = {
            "id": job_id,
            "ownerUserId": cfg.my_admin_id,
            "createdAt": iso_utc(ts),
            "updatedAt": iso_utc(ts),
            "jobTitle": f"{random.choice(JOB_TITLES)}(自分)-{i+1}",
            "company": random.choice(JST_COMPANIES),
            "location": random.choice(LOCATIONS),
            "employmentType": random.choice(EMPLOYMENT_TYPES),
            "budget": Decimal(str(random.randrange(3500000, 9000001, 100000))),
            "description": f"自分データ向け求人サンプル {i+1}",
            "status": status,
            "publishedAt": iso_utc(ts),
        }
        if status == "CLOSED":
            item["closedAt"] = iso_utc(ts + timedelta(days=30))

        my_jobs.append(item)
        all_jobs.append(item)

    for i in range(cfg.other_job_count):
        ts = now - timedelta(minutes=cfg.my_job_count + i)
        job_id = new_job_id(ts)
        status = "OPEN" if i % 4 != 0 else "DRAFT"
        other_owner = f"other-admin-{(i % 5) + 1:03d}"
        item = {
            "id": job_id,
            "ownerUserId": other_owner,
            "createdAt": iso_utc(ts),
            "updatedAt": iso_utc(ts),
            "jobTitle": f"{random.choice(JOB_TITLES)}(他人)-{i+1}",
            "company": random.choice(JST_COMPANIES),
            "location": random.choice(LOCATIONS),
            "employmentType": random.choice(EMPLOYMENT_TYPES),
            "budget": Decimal(str(random.randrange(3000000, 8500001, 100000))),
            "description": f"他者データ向け求人サンプル {i+1}",
            "status": status,
            "publishedAt": iso_utc(ts),
        }
        other_jobs.append(item)
        all_jobs.append(item)

    return my_jobs, other_jobs, all_jobs


def build_applications(cfg: Config, jobs: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    now = datetime.now(timezone.utc)

    my_apps: list[dict] = []
    other_apps: list[dict] = []
    all_apps: list[dict] = []

    if not jobs:
        return my_apps, other_apps, all_apps

    for i in range(cfg.my_application_count):
        ts = now - timedelta(minutes=i)
        job = jobs[i % len(jobs)]
        app_id = new_application_id(ts)
        status = "APPLIED" if i % 6 != 0 else random.choice(APPLICATION_STATUSES)

        item = {
            "id": app_id,
            "createdAt": iso_utc(ts),
            "jobId": job["id"],
            "jobTitle": job["jobTitle"],
            "ownerUserId": job["ownerUserId"],
            "applicantUserId": cfg.my_user_id,
            "applicantName": "テストユーザー(自分)",
            "proposalAmount": Decimal(str(random.randrange(200000, 900001, 10000))),
            "proposalContent": f"自分応募データ {i+1}: 長期参画可能です。",
            "status": status,
        }
        if status in {"REVIEWING", "INTERVIEW", "HIRED", "REJECTED"}:
            item["reviewedBy"] = cfg.my_admin_id
            item["reviewedAt"] = iso_utc(ts + timedelta(days=1))
        if status == "INTERVIEW":
            item["interviewDate"] = iso_utc(ts + timedelta(days=3))
            item["interviewMemo"] = "オンライン面談予定"
        if status == "REJECTED":
            item["rejectionReason"] = "要件との不一致"

        my_apps.append(item)
        all_apps.append(item)

    for i in range(cfg.other_application_count):
        ts = now - timedelta(minutes=cfg.my_application_count + i)
        job = jobs[(cfg.my_application_count + i) % len(jobs)]
        app_id = new_application_id(ts)
        status = random.choice(APPLICATION_STATUSES)
        other_user = f"other-user-{(i % 8) + 1:03d}"

        item = {
            "id": app_id,
            "createdAt": iso_utc(ts),
            "jobId": job["id"],
            "jobTitle": job["jobTitle"],
            "ownerUserId": job["ownerUserId"],
            "applicantUserId": other_user,
            "applicantName": f"他ユーザー{i+1}",
            "proposalAmount": Decimal(str(random.randrange(180000, 800001, 10000))),
            "proposalContent": f"他人応募データ {i+1}: 経験を活かして貢献します。",
            "status": status,
        }
        if status in {"REVIEWING", "INTERVIEW", "HIRED", "REJECTED"}:
            item["reviewedBy"] = f"other-admin-{(i % 5) + 1:03d}"
            item["reviewedAt"] = iso_utc(ts + timedelta(days=1))
        if status == "INTERVIEW":
            item["interviewDate"] = iso_utc(ts + timedelta(days=2))
            item["interviewMemo"] = "来社面談"
        if status == "REJECTED":
            item["rejectionReason"] = "スキルマッチ不足"

        other_apps.append(item)
        all_apps.append(item)

    return my_apps, other_apps, all_apps


def put_items(table, items: list[dict]) -> None:
    with table.batch_writer(overwrite_by_pkeys=["id"]) as batch:
        for item in items:
            batch.put_item(Item=item)


def main() -> None:
    cfg = parse_args()
    ddb = dynamodb_resource(cfg)

    jobs_table = ddb.Table(cfg.admin_jobs_table)
    applications_table = ddb.Table(cfg.applications_table)

    my_jobs, other_jobs, all_jobs = build_jobs(cfg)
    my_apps, other_apps, all_apps = build_applications(cfg, all_jobs)

    put_items(jobs_table, all_jobs)
    put_items(applications_table, all_apps)

    print("Seed completed")
    print(f"- jobs: total={len(all_jobs)} my={len(my_jobs)} other={len(other_jobs)}")
    print(f"- applications: total={len(all_apps)} my={len(my_apps)} other={len(other_apps)}")
    print(f"- my_user_id={cfg.my_user_id}")
    print(f"- my_admin_id={cfg.my_admin_id}")
    print("Tips:")
    print("  - admin/jobs では my_admin_id の25件を確認できます")
    print("  - applications の status/applicantUserId/jobId 系ページネーション確認に使えます")


if __name__ == "__main__":
    main()
