resource "aws_s3_bucket" "frontend" {
  bucket = "${local.name_prefix}-frontend"
  tags   = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name_prefix}-oac"
  description                       = "OAC for ${local.name_prefix} frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"

  # S3 バケットをオリジンとして設定（OAC 経由でのみアクセス許可）
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "frontendS3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    target_origin_id = "frontendS3Origin"

    # HTTP アクセスは自動的に HTTPS にリダイレクト
    viewer_protocol_policy = "redirect-to-https"

    # 静的サイトなので GET/HEAD/OPTIONS のみ許可
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    # AWS マネージドポリシー「CachingOptimized」を使用
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # 地域制限あり（日本からのみアクセス可能）
  restrictions {
    geo_restriction {
      restriction_type = "whitelist"

      locations = [
        "JP"
      ]
    }
  }

  # CloudFront のデフォルト証明書を使用（独自ドメインを使う場合は ACM 証明書 + aliases が別途必要）
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # SPA ルーティング対応: S3 が 403 を返した場合も index.html を返し、React Router に処理を委ねる
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  # SPA ルーティング対応: 404 の場合も同様に index.html を返す
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  tags = local.common_tags
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      },
      {
        Sid    = "AllowGitHubActionsDeployRole"
        Effect = "Allow"
        Principal = {
          AWS = var.github_actions_role_arn
        }
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObject",
        ]
        Resource = "${aws_s3_bucket.frontend.arn}/*"
      },
      {
        Sid    = "AllowGitHubActionsDeployRoleList"
        Effect = "Allow"
        Principal = {
          AWS = var.github_actions_role_arn
        }
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.frontend.arn
      },
    ]
  })
}
