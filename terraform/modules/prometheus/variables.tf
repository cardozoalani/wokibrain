variable "environment" {
  description = "Environment name"
  type        = string
}

variable "ecr_repository_url_prometheus" {
  description = "ECR repository URL for Prometheus"
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

variable "vpc_cidr_block" {
  description = "VPC CIDR block for internal communication"
  type        = string
}

variable "app_security_group_id" {
  description = "Application Security Group ID (for scraping metrics)"
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

variable "prometheus_domain_name" {
  description = "Domain name for Prometheus (e.g., prometheus.wokibrain.grgcrew.com)"
  type        = string
  default     = ""
}

variable "alb_dns_name" {
  description = "ALB DNS name for scraping API metrics"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

