variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "ecs_cluster_id" {
  description = "ECS Cluster ID"
  type        = string
}

variable "ecs_execution_role_arn" {
  description = "ECS Task Execution Role ARN"
  type        = string
}

variable "ecs_task_role_arn" {
  description = "ECS Task Role ARN"
  type        = string
}

variable "alb_security_group_id" {
  description = "ALB Security Group ID"
  type        = string
}

variable "alb_listener_arn" {
  description = "ALB HTTP Listener ARN"
  type        = string
}

variable "alb_https_listener_arn" {
  description = "ALB HTTPS Listener ARN (optional)"
  type        = string
  default     = ""
}

variable "use_https" {
  description = "Whether HTTPS is enabled (determines if HTTPS listener rules should be created)"
  type        = bool
  default     = false
}

variable "grafana_domain_name" {
  description = "Domain name for Grafana (e.g., grafana.wokibrain.grgcrew.com)"
  type        = string
  default     = ""
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "prometheus_endpoint" {
  description = "Prometheus endpoint URL (for datasource configuration)"
  type        = string
  default     = "http://prometheus:9090"
}

variable "alb_dns_name" {
  description = "ALB DNS name for internal service communication"
  type        = string
}

variable "prometheus_domain_name" {
  description = "Prometheus domain name for Host header"
  type        = string
  default     = ""
}

