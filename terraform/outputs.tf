output "applications_table_name" {
  value = aws_dynamodb_table.applications.name
}

output "admin_jobs_table_name" {
  value = aws_dynamodb_table.admin_jobs.name
}

output "api_base_url" {
  value = aws_apigatewayv2_stage.main.invoke_url
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.pool.id
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.client.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}

output "budget_alert_sns_topic_arn" {
  description = "SNS topic ARN for emergency alerts"
  value       = aws_sns_topic.emergency_stop.arn
}

output "emergency_stop_sns_topic_arn" {
  description = "SNS topic ARN for emergency alerts"
  value       = aws_sns_topic.emergency_stop.arn
}

output "emergency_shutdown_lambda_name" {
  description = "Emergency shutdown Lambda function name"
  value       = aws_lambda_function.emergency_shutdown.function_name
}
