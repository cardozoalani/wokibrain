output "prometheus_service_name" {
  description = "Name of the Prometheus ECS service"
  value       = aws_ecs_service.prometheus.name
}

output "prometheus_target_group_arn" {
  description = "ARN of the Prometheus target group"
  value       = aws_lb_target_group.prometheus.arn
}

output "prometheus_efs_id" {
  description = "EFS file system ID for Prometheus storage"
  value       = aws_efs_file_system.prometheus.id
}

output "prometheus_endpoint" {
  description = "Prometheus endpoint URL"
  value       = var.prometheus_domain_name != "" ? "https://${var.prometheus_domain_name}" : "http://${var.alb_dns_name}:9090"
}



