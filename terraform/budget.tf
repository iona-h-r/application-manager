# ============================================================
# Budget & Emergency Shutdown
#
# AWS Budget と CloudWatch Alarm を同一 SNS Topic に集約し、
# 緊急停止 Lambda を起動する。
# ============================================================

# ──────────────────────────────────────────
# SNS Topic（Budget / CloudWatch → Lambda の中継）
# ──────────────────────────────────────────
resource "aws_sns_topic" "emergency_stop" {
  name = "${local.name_prefix}-emergency-stop-topic"
  tags = local.common_tags
}

# Budget / CloudWatch が SNS へ Publish できるようにするポリシー
resource "aws_sns_topic_policy" "emergency_stop" {
  arn = aws_sns_topic.emergency_stop.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowBudgetsPublish"
        Effect = "Allow"
        Principal = {
          Service = "budgets.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.emergency_stop.arn
      },
      {
        Sid    = "AllowCloudWatchPublish"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.emergency_stop.arn
      }
    ]
  })
}

# ──────────────────────────────────────────
# Emergency Shutdown Lambda
# ──────────────────────────────────────────
resource "aws_lambda_function" "emergency_shutdown" {
  function_name = "${local.name_prefix}-emergency-shutdown"
  role          = aws_iam_role.emergency_shutdown_role.arn
  runtime       = "python3.12"
  handler       = "functions.emergency_shutdown.emergency_shutdown_handler.handler"
  timeout       = 60

  filename         = data.archive_file.backend.output_path
  source_code_hash = data.archive_file.backend.output_base64sha256

  environment {
    variables = {
      CLOUDFRONT_DISTRIBUTION_ID = aws_cloudfront_distribution.frontend.id
      API_GW_API_ID               = aws_apigatewayv2_api.main.id
      API_GW_STAGE_NAME           = "$default"
      COGNITO_USER_POOL_ID        = aws_cognito_user_pool.pool.id
      SES_FROM_ADDRESS            = aws_ses_email_identity.sender.email
      SES_ADMIN_ADDRESS           = var.ses_admin_address
    }
  }

  tags = local.common_tags
}

# SNS → Lambda トリガー
resource "aws_sns_topic_subscription" "emergency_stop_to_lambda" {
  topic_arn = aws_sns_topic.emergency_stop.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.emergency_shutdown.arn
}

# SNS が Lambda を呼び出す権限
resource "aws_lambda_permission" "allow_sns_shutdown" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.emergency_shutdown.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.emergency_stop.arn
}

# ──────────────────────────────────────────
# AWS Budgets（$1 アラーム）
# ──────────────────────────────────────────
resource "aws_budgets_budget" "monthly" {
  name         = "${local.name_prefix}-monthly-budget"
  budget_type  = "COST"
  limit_amount = "1"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # $1 に達した瞬間（ACTUAL = 実績コスト 100%）に SNS へ通知
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_sns_topic_arns  = [aws_sns_topic.emergency_stop.arn]
  }

  depends_on = [aws_sns_topic_policy.emergency_stop]
}

# ──────────────────────────────────────────
# Lambda 実行失敗アラーム（CloudWatch）
# ──────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "shutdown_lambda_errors" {
  alarm_name          = "${local.name_prefix}-shutdown-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Emergency shutdown Lambda が失敗しました。手動で確認してください。"

  dimensions = {
    FunctionName = aws_lambda_function.emergency_shutdown.function_name
  }

  tags = local.common_tags
}
