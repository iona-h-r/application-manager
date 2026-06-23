# This backend block assumes the state bucket and lock table already exist.
# Bootstrap these resources once from a separate stack, then use this backend.
terraform {
  backend "s3" {
    bucket         = "application-manager-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "application-manager-terraform-lock"
    encrypt        = true
  }
}
