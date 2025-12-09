# ACM Certificate Module
# Solicita un certificado SSL/TLS en AWS Certificate Manager

resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = var.subject_alternative_names

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.environment}-${var.domain_name}"
    Environment = var.environment
  }
}

# DNS Validation Records
# Estos registros deben agregarse a tu DNS para validar el certificado
resource "aws_acm_certificate_validation" "main" {
  count = var.wait_for_validation ? 1 : 0

  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}

# Route53 Records para validación (opcional, solo si usas Route53)
resource "aws_route53_record" "validation" {
  for_each = var.create_route53_validation_records ? {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}



