# CloudFront Distribution for WokiBrain API
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled      = true
  price_class         = var.price_class
  default_root_object = ""
  comment             = "${var.environment} WokiBrain API CDN"

  aliases = var.domain_name != "" ? [var.domain_name] : []

  origin {
    domain_name = var.alb_dns_name
    origin_id   = "wokibrain-alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-Forwarded-Host"
      value = var.domain_name != "" ? var.domain_name : var.alb_dns_name
    }
  }

  # Default cache behavior
  default_cache_behavior {
    target_origin_id       = "wokibrain-alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    cache_policy_id = aws_cloudfront_cache_policy.default.id
  }

  # Cache OpenAPI spec (long TTL)
  ordered_cache_behavior {
    path_pattern     = "/api/v1/openapi*"
    target_origin_id = "wokibrain-alb"
    compress         = true

    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]

    cache_policy_id = aws_cloudfront_cache_policy.static.id
  }

  # Cache discovery results (short TTL)
  ordered_cache_behavior {
    path_pattern     = "/api/v1/woki/discover*"
    target_origin_id = "wokibrain-alb"
    compress         = true

    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]

    cache_policy_id = aws_cloudfront_cache_policy.discovery.id
  }

  # Cache restaurant data (medium TTL)
  ordered_cache_behavior {
    path_pattern     = "/api/v1/restaurants/*"
    target_origin_id = "wokibrain-alb"
    compress         = true

    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]

    cache_policy_id = aws_cloudfront_cache_policy.restaurant.id
  }

  # No cache for mutations (POST, PUT, DELETE, PATCH)
  ordered_cache_behavior {
    path_pattern     = "/api/v1/woki/bookings*"
    target_origin_id = "wokibrain-alb"
    compress         = true

    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]

    cache_policy_id = aws_cloudfront_cache_policy.no_cache.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == "" ? true : false
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : null
  }

  # WAF Web ACL (optional)
  web_acl_id = var.waf_web_acl_id != "" ? var.waf_web_acl_id : null

  tags = {
    Name = "${var.environment}-wokibrain-cdn"
  }
}

# Cache Policy: Default (for general API responses)
resource "aws_cloudfront_cache_policy" "default" {
  name        = "${var.environment}-wokibrain-default-cache"
  comment     = "Default cache policy for WokiBrain API"
  default_ttl = 3600
  max_ttl     = 86400
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Host", "Authorization", "Accept", "X-Request-ID"]
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# Cache Policy: Static assets (OpenAPI spec, docs)
resource "aws_cloudfront_cache_policy" "static" {
  name        = "${var.environment}-wokibrain-static-cache"
  comment     = "Cache policy for static assets (OpenAPI spec, docs)"
  default_ttl = 31536000 # 1 year
  max_ttl     = 31536000
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept"]
      }
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# Cache Policy: Discovery results (short TTL)
resource "aws_cloudfront_cache_policy" "discovery" {
  name        = "${var.environment}-wokibrain-discovery-cache"
  comment     = "Cache policy for discovery results (2 min TTL)"
  default_ttl = 120 # 2 minutes
  max_ttl     = 300  # 5 minutes
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept"]
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# Cache Policy: Restaurant data (medium TTL)
resource "aws_cloudfront_cache_policy" "restaurant" {
  name        = "${var.environment}-wokibrain-restaurant-cache"
  comment     = "Cache policy for restaurant data (1 hour TTL)"
  default_ttl = 3600 # 1 hour
  max_ttl     = 7200  # 2 hours
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept"]
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# Cache Policy: No cache (for mutations)
# When caching is disabled (TTL = 0), all behaviors must be "none" and compression must be disabled
resource "aws_cloudfront_cache_policy" "no_cache" {
  name        = "${var.environment}-wokibrain-no-cache"
  comment     = "No cache policy for mutations"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = false
    enable_accept_encoding_gzip   = false

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# Origin Request Policy (for forwarding headers)
resource "aws_cloudfront_origin_request_policy" "main" {
  name    = "${var.environment}-wokibrain-origin-request"
  comment = "Origin request policy for WokiBrain API"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Host", "Accept", "Content-Type", "X-Request-ID"]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

