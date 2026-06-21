variable "app_name" {
  type        = string
  default     = "application-manager"
  description = "Application name prefix used for AWS resource naming."
}

variable "aws_region" {
  type        = string
  default     = "ap-northeast-1"
  description = "AWS region for all resources."
}

variable "environment" {
  type        = string
  default     = "prod"
  description = "Deployment environment label."
}

variable "ses_from_address" {
  type        = string
  description = "Verified SES sender email address."
}

variable "ses_admin_address" {
  type        = string
  description = "Admin destination email address for application notifications."
}

variable "frontend_domain_name" {
  type        = string
  default     = ""
  description = "Optional custom domain for frontend links in notification emails. If empty, CloudFront domain is used."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Common tags applied to resources."
}
