# ============================================================
# CloudWatch Alarms for Emergency Shutdown
#
# CloudFront Requests > 60 / minute
# API Gateway Count    > 60 / minute
# ============================================================

resource "aws_cloudwatch_metric_alarm" "cloudfront_requests" {
  alarm_name          = "${local.name_prefix}-cloudfront-requests-high"
  alarm_description   = "CloudFront Requests exceeded 60 per minute."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 60
  metric_name         = "Requests"
  namespace           = "AWS/CloudFront"
  period              = 60
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = aws_cloudfront_distribution.frontend.id
    Region         = "Global"
  }

  alarm_actions = [aws_sns_topic.emergency_stop.arn]

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_count" {
  alarm_name          = "${local.name_prefix}-api-gateway-count-high"
  alarm_description   = "API Gateway Count exceeded 60 per minute."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 60
  metric_name         = "Count"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
    Stage = aws_apigatewayv2_stage.main.name
  }

  alarm_actions = [aws_sns_topic.emergency_stop.arn]

  tags = local.common_tags
}
