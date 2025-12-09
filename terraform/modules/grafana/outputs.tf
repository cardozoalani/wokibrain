output "grafana_service_name" {
  description = "Name of the Grafana ECS service"
  value       = aws_ecs_service.grafana.name
}

output "grafana_target_group_arn" {
  description = "ARN of the Grafana target group"
  value       = aws_lb_target_group.grafana.arn
}

output "grafana_efs_id" {
  description = "EFS file system ID for Grafana storage"
  value       = aws_efs_file_system.grafana.id
}

output "grafana_security_group_id" {
  description = "Security Group ID for Grafana (for allowing connections from other services)"
  value       = aws_security_group.grafana.id
}

