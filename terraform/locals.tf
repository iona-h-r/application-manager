locals {
  name_prefix = "${var.app_name}-${var.environment}"

  common_tags = merge(
    {
      Application = var.app_name
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags
  )

  lambda_common_env = {
    APPLICATIONS_TABLE_NAME = aws_dynamodb_table.applications.name
    ADMIN_JOBS_TABLE_NAME   = aws_dynamodb_table.admin_jobs.name
    SKIP_AUTH               = "false"
  }

  frontend_base_url = var.frontend_domain_name != "" ? var.frontend_domain_name : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}
