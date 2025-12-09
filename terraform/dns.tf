# Route53 DNS Records for WokiBrain Services
# This file creates DNS records for Grafana and Prometheus
#
# Prerequisites:
# 1. Set alb_route53_zone_id in terraform.tfvars with your Route53 hosted zone ID
# 2. Ensure the hosted zone exists in Route53 for the domain (e.g., grgcrew.com)

# Route53 Record for Grafana (if enabled and zone_id is provided)
resource "aws_route53_record" "grafana" {
  count   = var.enable_grafana && var.grafana_domain_name != "" && var.alb_route53_zone_id != "" ? 1 : 0
  zone_id = var.alb_route53_zone_id
  name    = var.grafana_domain_name
  type    = "A"

  alias {
    name                   = module.ecs.alb_dns_name
    zone_id                = module.ecs.alb_zone_id
    evaluate_target_health = true
  }
}

# Route53 Record for Prometheus (if enabled and zone_id is provided)
resource "aws_route53_record" "prometheus" {
  count   = var.enable_prometheus && var.prometheus_domain_name != "" && var.alb_route53_zone_id != "" ? 1 : 0
  zone_id = var.alb_route53_zone_id
  name    = var.prometheus_domain_name
  type    = "A"

  alias {
    name                   = module.ecs.alb_dns_name
    zone_id                = module.ecs.alb_zone_id
    evaluate_target_health = true
  }
}

