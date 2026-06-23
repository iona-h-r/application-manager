# ---------- Lambda 関数定義（1箇所に集約） ----------

locals {
  functions = {
    submit = {
      handler     = "functions.applications.create_application.handler"
      route_key   = "POST /applications"
      require_jwt = true
      env_extra = {
        SES_ENABLED       = "true"
        SES_FROM_ADDRESS  = var.ses_from_address
        SES_ADMIN_ADDRESS = var.ses_admin_address
        DOMAIN_NAME       = local.frontend_base_url
      }
    }
    admin_list_applications = {
      handler     = "functions.admin.list_applications.handler"
      route_key   = "GET /admin/applications"
      require_jwt = true
      env_extra   = {}
    }
    admin_get_application_detail = {
      handler     = "functions.admin.get_application_detail.handler"
      route_key   = "GET /admin/applications/{applicationId}"
      require_jwt = true
      env_extra   = {}
    }
    admin_create_job = {
      handler     = "functions.admin.create_job.handler"
      route_key   = "POST /admin/jobs"
      require_jwt = true
      env_extra   = {}
    }
    admin_list_my_jobs = {
      handler     = "functions.admin.list_my_jobs.handler"
      route_key   = "GET /admin/jobs"
      require_jwt = true
      env_extra   = {}
    }
    public_list_jobs = {
      handler     = "functions.jobs.list_jobs.handler"
      route_key   = "GET /jobs"
      require_jwt = false
      env_extra   = {}
    }
  }
}

# ---------- Lambda 関数 ----------

resource "aws_lambda_function" "this" {
  for_each = local.functions

  function_name = "${local.name_prefix}-${replace(each.key, "_", "-")}"
  role          = aws_iam_role.lambda_role.arn
  runtime       = "python3.12"
  handler       = each.value.handler
  timeout       = 30

  filename         = data.archive_file.backend.output_path
  source_code_hash = data.archive_file.backend.output_base64sha256

  environment {
    variables = merge(local.lambda_common_env, each.value.env_extra)
  }

  tags = local.common_tags
}

# ---------- API Gateway 本体 ----------

resource "aws_apigatewayv2_api" "main" {
  name          = "${local.name_prefix}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://${aws_cloudfront_distribution.frontend.domain_name}"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  name             = "${local.name_prefix}-cognito-jwt"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.client.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.pool.id}"
  }
}

resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    detailed_metrics_enabled = true
    logging_level            = "INFO"

    # スロットリング: 秒間10リクエスト、瞬間バースト10リクエストまで許可
    throttling_burst_limit = 10
    throttling_rate_limit  = 10
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "api_access" {
  name              = "/aws/apigateway/${local.name_prefix}-http-api"
  retention_in_days = 7
  tags              = local.common_tags
}

# ---------- API Gateway 統合・ルート・権限（functions マップを共有） ----------

resource "aws_apigatewayv2_integration" "this" {
  for_each = local.functions

  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.this[each.key].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "this" {
  for_each = local.functions

  api_id    = aws_apigatewayv2_api.main.id
  route_key = each.value.route_key
  target    = "integrations/${aws_apigatewayv2_integration.this[each.key].id}"

  authorization_type = each.value.require_jwt ? "JWT" : null
  authorizer_id      = each.value.require_jwt ? aws_apigatewayv2_authorizer.cognito.id : null
}

resource "aws_lambda_permission" "allow_api" {
  for_each = local.functions

  statement_id  = "AllowExecutionFromApiGateway${title(each.key)}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
