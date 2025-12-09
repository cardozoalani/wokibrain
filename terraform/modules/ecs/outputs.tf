output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "alb_arn_suffix" {
  description = "ARN suffix of the load balancer"
  value       = aws_lb.main.arn_suffix
}

output "target_group_arn_suffix" {
  description = "ARN suffix of the target group"
  value       = aws_lb_target_group.app.arn_suffix
}

output "alb_listener_http_arn" {
  description = "ARN of the HTTP listener"
  value       = length(aws_lb_listener.http_redirect) > 0 ? aws_lb_listener.http_redirect[0].arn : aws_lb_listener.http_forward[0].arn
}

output "alb_listener_https_arn" {
  description = "ARN of the HTTPS listener (empty string if not created)"
  value       = var.use_https && (var.acm_certificate_arn != "" || var.acm_certificate_arn_from_module != "") ? (length(aws_lb_listener.https) > 0 ? aws_lb_listener.https["create"].arn : "") : ""
}

output "ecs_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "alb_zone_id" {
  description = "The canonical hosted zone ID of the load balancer (to be used in route53 alias records)"
  value       = aws_lb.main.zone_id
}

