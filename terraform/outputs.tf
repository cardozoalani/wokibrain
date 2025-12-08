output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.ecs.alb_dns_name
}

output "alb_https_url" {
  description = "HTTPS URL of the ALB (if certificate is configured)"
  value       = var.alb_domain_name != "" || var.alb_acm_certificate_arn != "" ? "https://${module.ecs.alb_dns_name}" : null
}

output "alb_certificate_arn" {
  description = "ARN of the ACM certificate used by the ALB"
  value       = local.create_acm_certificate && length(module.alb_acm) > 0 ? module.alb_acm[0].certificate_arn : var.alb_acm_certificate_arn != "" ? var.alb_acm_certificate_arn : null
}

output "alb_certificate_validation_records" {
  description = "DNS validation records for the ALB certificate (if using automatic ACM)"
  value       = local.create_acm_certificate && length(module.alb_acm) > 0 ? module.alb_acm[0].validation_records : null
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = module.ecr.repository_url
}

output "documentdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = module.documentdb.cluster_endpoint
  sensitive   = true
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.ecs.service_name
}

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = module.redis.redis_endpoint
  sensitive   = true
}

output "kafka_bootstrap_brokers" {
  description = "Kafka bootstrap brokers (TLS)"
  value       = module.kafka.bootstrap_brokers_tls
  sensitive   = true
}

# CDN Outputs
output "cdn_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cdn.distribution_id
}

output "cdn_distribution_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cdn.distribution_domain_name
}

output "cdn_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = module.cdn.distribution_arn
}

# Prometheus outputs (if enabled)
output "prometheus_endpoint" {
  description = "Prometheus endpoint URL"
  value       = var.enable_prometheus && length(module.prometheus) > 0 ? module.prometheus[0].prometheus_endpoint : null
}

output "prometheus_service_name" {
  description = "Prometheus ECS service name"
  value       = var.enable_prometheus && length(module.prometheus) > 0 ? module.prometheus[0].prometheus_service_name : null
}

# Grafana outputs (if enabled)
output "grafana_service_name" {
  description = "Grafana ECS service name"
  value       = var.enable_grafana && length(module.grafana) > 0 ? module.grafana[0].grafana_service_name : null
}

output "grafana_endpoint" {
  description = "Grafana endpoint URL"
  value       = var.enable_grafana && var.grafana_domain_name != "" ? "https://${var.grafana_domain_name}" : (var.enable_grafana ? "http://${module.ecs.alb_dns_name}" : null)
}

# Route53 DNS Records (if created)
output "grafana_dns_record_fqdn" {
  description = "FQDN of the Grafana Route53 record (if created)"
  value       = length(aws_route53_record.grafana) > 0 ? aws_route53_record.grafana[0].fqdn : null
}

output "prometheus_dns_record_fqdn" {
  description = "FQDN of the Prometheus Route53 record (if created)"
  value       = length(aws_route53_record.prometheus) > 0 ? aws_route53_record.prometheus[0].fqdn : null
}

