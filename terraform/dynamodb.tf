resource "aws_dynamodb_table" "applications" {
  name         = "${local.name_prefix}-applications"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # attribute {
  #   name = "jobId"
  #   type = "S"
  # }

  attribute {
    name = "ownerUserId"
    type = "S"
  }

  # attribute {
  #   name = "applicantUserId"
  #   type = "S"
  # }

  # attribute {
  #   name = "status"
  #   type = "S"
  # }

  attribute {
    name = "createdAt"
    type = "S"
  }

  # global_secondary_index {
  #   name            = "jobId-createdAt-index"
  #   projection_type = "ALL"

  #   key_schema {
  #     attribute_name = "jobId"
  #     key_type       = "HASH"
  #   }
  #   key_schema {
  #     attribute_name = "createdAt"
  #     key_type       = "RANGE"
  #   }
  # }

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

  # global_secondary_index {
  #   name            = "applicantUserId-createdAt-index"
  #   projection_type = "ALL"

  #   key_schema {
  #     attribute_name = "applicantUserId"
  #     key_type       = "HASH"
  #   }
  #   key_schema {
  #     attribute_name = "createdAt"
  #     key_type       = "RANGE"
  #   }
  # }

  # global_secondary_index {
  #   name            = "status-createdAt-index"
  #   projection_type = "ALL"

  #   key_schema {
  #     attribute_name = "status"
  #     key_type       = "HASH"
  #   }
  #   key_schema {
  #     attribute_name = "createdAt"
  #     key_type       = "RANGE"
  #   }
  # }

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
    name = "status"
    type = "S"
  }

  # attribute {
  #   name = "location"
  #   type = "S"
  # }

  # attribute {
  #   name = "employmentType"
  #   type = "S"
  # }

  attribute {
    name = "ownerUserId"
    type = "S"
  }

  global_secondary_index {
    name            = "status-createdAt-index"
    projection_type = "ALL"

    key_schema {
      attribute_name = "status"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "createdAt"
      key_type       = "RANGE"
    }
  }

  # global_secondary_index {
  #   name            = "location-createdAt-index"
  #   projection_type = "ALL"

  #   key_schema {
  #     attribute_name = "location"
  #     key_type       = "HASH"
  #   }
  #   key_schema {
  #     attribute_name = "createdAt"
  #     key_type       = "RANGE"
  #   }
  # }

  # global_secondary_index {
  #   name            = "employmentType-createdAt-index"
  #   projection_type = "ALL"

  #   key_schema {
  #     attribute_name = "employmentType"
  #     key_type       = "HASH"
  #   }
  #   key_schema {
  #     attribute_name = "createdAt"
  #     key_type       = "RANGE"
  #   }
  # }

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
