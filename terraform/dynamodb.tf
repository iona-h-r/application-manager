resource "aws_dynamodb_table" "applications" {
  name         = "${local.name_prefix}-applications"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "entityType"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "createdAt-index"
    projection_type = "ALL"

    key_schema {
      attribute_name = "entityType"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "createdAt"
      key_type       = "RANGE"
    }
  }

  tags = local.common_tags
}

resource "aws_dynamodb_table" "admin_jobs" {
  name         = "${local.name_prefix}-admin-jobs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  attribute {
    name = "ownerUserId"
    type = "S"
  }

  global_secondary_index {
    name            = "ownerUserId-createdAt-index"
    projection_type = "ALL"

    key_schema {
      attribute_name = "ownerUserId"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "createdAt"
      key_type       = "RANGE"
    }
  }

  tags = local.common_tags
}
