variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "app_security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "alb_security_group_id" {
  description = "Security group ID for ALB"
  type        = string
}

variable "ecr_repository_url" {
  description = "ECR repository URL"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
  default     = "latest"
}

variable "app_port" {
  description = "Application port"
  type        = number
  default     = 3000
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 3
}

variable "cpu" {
  description = "CPU units for task"
  type        = string
  default     = "512"
}

variable "memory" {
  description = "Memory for task"
  type        = string
  default     = "1024"
}

variable "documentdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  type        = string
  sensitive   = true
}

variable "documentdb_username" {
  description = "DocumentDB username"
  type        = string
  sensitive   = true
}

variable "documentdb_password" {
  description = "DocumentDB password"
  type        = string
  sensitive   = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "redis_endpoint" {
  description = "Redis endpoint (optional)"
  type        = string
  default     = ""
}

variable "kafka_bootstrap_brokers" {
  description = "Kafka bootstrap brokers (comma-separated list, optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "kafka_client_id" {
  description = "Kafka client ID"
  type        = string
  default     = "wokibrain-api"
}

variable "kafka_group_id" {
  description = "Kafka consumer group ID"
  type        = string
  default     = "wokibrain-api-group"
}

variable "kafka_ssl" {
  description = "Enable SSL for Kafka connections"
  type        = bool
  default     = false
}

variable "kafka_sasl_mechanism" {
  description = "Kafka SASL mechanism (plain, scram-sha-256, scram-sha-512)"
  type        = string
  default     = "scram-sha-512"
}

variable "kafka_sasl_username" {
  description = "Kafka SASL username (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "kafka_sasl_password" {
  description = "Kafka SASL password (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "webhook_worker_enabled" {
  description = "Enable webhook worker in the same process (optional)"
  type        = bool
  default     = false
}

variable "use_https" {
  description = "Whether to enable HTTPS listener (deterministic for count). Note: Certificate must be validated before HTTPS will work."
  type        = bool
  default     = false
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (manual, optional)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn_from_module" {
  description = "ACM certificate ARN from ACM module (optional)"
  type        = string
  default     = ""
}

