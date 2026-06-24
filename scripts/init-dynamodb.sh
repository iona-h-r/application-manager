#!/bin/bash

set -e

ENDPOINT="http://localhost:8000"

# ---------- テーブル作成ヘルパー ----------

create_table_if_not_exists() {
  local TABLE_NAME=$1
  shift

  echo "Checking DynamoDB table: $TABLE_NAME..."

  if aws dynamodb describe-table \
      --table-name "$TABLE_NAME" \
      --endpoint-url "$ENDPOINT" > /dev/null 2>&1
  then
    echo "Table already exists: $TABLE_NAME"
    return 0
  fi

  echo "Creating table: $TABLE_NAME"
  aws dynamodb create-table "$@" \
    --table-name "$TABLE_NAME" \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url "$ENDPOINT"

  echo "Waiting for table to become ACTIVE..."
  aws dynamodb wait table-exists \
    --table-name "$TABLE_NAME" \
    --endpoint-url "$ENDPOINT"

  echo "Done: $TABLE_NAME"
}

# ---------- applications テーブル ----------

create_table_if_not_exists "applications" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=jobId,AttributeType=S \
    AttributeName=applicantUserId,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "jobId-createdAt-index",
      "KeySchema": [
        {"AttributeName": "jobId", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    },
    {
      "IndexName": "applicantUserId-createdAt-index",
      "KeySchema": [
        {"AttributeName": "applicantUserId", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    },
    {
      "IndexName": "status-createdAt-index",
      "KeySchema": [
        {"AttributeName": "status", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]'

# ---------- admin-jobs テーブル ----------

create_table_if_not_exists "admin-jobs" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=location,AttributeType=S \
    AttributeName=employmentType,AttributeType=S \
    AttributeName=ownerUserId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "status-createdAt-index",
      "KeySchema": [
        {"AttributeName": "status", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    },
    {
      "IndexName": "location-createdAt-index",
      "KeySchema": [
        {"AttributeName": "location", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    },
    {
      "IndexName": "employmentType-createdAt-index",
      "KeySchema": [
        {"AttributeName": "employmentType", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    },
    {
      "IndexName": "ownerUserId-createdAt-index",
      "KeySchema": [
        {"AttributeName": "ownerUserId", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]'

echo "All tables ready."
