resource "aws_iam_role" "lambda_role" {
  name = "${local.name_prefix}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "lambda_app_policy" {
  name = "${local.name_prefix}-lambda-app-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ApplicationsTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
        ]
        Resource = [
          aws_dynamodb_table.applications.arn,
          "${aws_dynamodb_table.applications.arn}/index/*",
        ]
      },
      {
        Sid    = "AdminJobsTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
        ]
        Resource = [
          aws_dynamodb_table.admin_jobs.arn,
          "${aws_dynamodb_table.admin_jobs.arn}/index/*",
        ]
      },
      {
        Sid    = "SESSendAccess"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
        ]
        Resource = aws_ses_email_identity.sender.arn
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_app_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_app_policy.arn
}

# ============================================================
# IAM Role / Policy for Emergency Shutdown Lambda
#
# 既存の lambda_role とは分離し、
# 遮断操作に必要な最小権限のみ付与する。
# ============================================================

resource "aws_iam_role" "emergency_shutdown_role" {
  name = "${local.name_prefix}-emergency-shutdown-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# CloudWatch Logs（基本実行ロール）
resource "aws_iam_role_policy_attachment" "shutdown_basic" {
  role       = aws_iam_role.emergency_shutdown_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 遮断操作に必要な最小権限
resource "aws_iam_policy" "emergency_shutdown_policy" {
  name = "${local.name_prefix}-emergency-shutdown-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudFront: 設定取得 + 無効化
      {
        Sid    = "CloudFrontDisable"
        Effect = "Allow"
        Action = [
          "cloudfront:GetDistributionConfig",
          "cloudfront:UpdateDistribution",
        ]
        Resource = aws_cloudfront_distribution.frontend.arn
      },
      # API Gateway: 本番ステージ削除
      {
        Sid    = "ApiGatewayDeleteStage"
        Effect = "Allow"
        Action = [
          "apigateway:DELETE",
        ]
        Resource = "arn:aws:apigateway:${var.aws_region}::/apis/${aws_apigatewayv2_api.main.id}/stages/${aws_apigatewayv2_stage.main.name}"
      },
      # Cognito: User Pool の自己登録停止
      {
        Sid    = "CognitoDisableSelfSignup"
        Effect = "Allow"
        Action = [
          "cognito-idp:DescribeUserPool",
          "cognito-idp:UpdateUserPool",
        ]
        Resource = aws_cognito_user_pool.pool.arn
      },
      # SES: 管理者通知
      {
        Sid    = "EmergencyNotificationSend"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
        ]
        Resource = aws_ses_email_identity.sender.arn
      },
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "shutdown_policy_attach" {
  role       = aws_iam_role.emergency_shutdown_role.name
  policy_arn = aws_iam_policy.emergency_shutdown_policy.arn
}
