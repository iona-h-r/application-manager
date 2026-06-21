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
