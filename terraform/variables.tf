variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS Account ID for ECR repository URLs"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "documentdb_instance_class" {
  description = "Instance class for DocumentDB"
  type        = string
  default     = "db.t3.medium"
}

variable "documentdb_cluster_size" {
  description = "Number of DocumentDB instances"
  type        = number
  default     = 3
}

variable "documentdb_master_username" {
  description = "Master username for DocumentDB"
  type        = string
  default     = "wokiadmin"
  sensitive   = true
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "app_port" {
  description = "Application port"
  type        = number
  default     = 3000
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 3
}

variable "task_cpu" {
  description = "CPU units for ECS task"
  type        = string
  default     = "512"
}

variable "task_memory" {
  description = "Memory for ECS task"
  type        = string
  default     = "1024"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "alarm_email" {
  description = "Email for CloudWatch alarms"
  type        = string
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_cluster_size" {
  description = "Number of Redis cache clusters"
  type        = number
  default     = 3
}

# Kafka Configuration
variable "kafka_broker_nodes" {
  description = "Number of Kafka broker nodes"
  type        = number
  default     = 3
}

variable "kafka_broker_instance_type" {
  description = "Instance type for Kafka brokers"
  type        = string
  default     = "kafka.m5.large"
}

variable "kafka_volume_size" {
  description = "EBS volume size in GB for Kafka brokers"
  type        = number
  default     = 100
}

# CDN Configuration
variable "cdn_domain_name" {
  description = "Custom domain name for CloudFront (optional)"
  type        = string
  default     = ""
}

variable "cdn_acm_certificate_arn" {
  description = "ACM certificate ARN for CloudFront custom domain (optional)"
  type        = string
  default     = ""
}

variable "cdn_price_class" {
  description = "CloudFront price class (PriceClass_All, PriceClass_200, PriceClass_100)"
  type        = string
  default     = "PriceClass_All"
}

variable "cdn_waf_web_acl_id" {
  description = "WAF Web ACL ID for CloudFront (optional)"
  type        = string
  default     = ""
}

# ALB HTTPS Configuration
variable "alb_domain_name" {
  description = "Domain name for the ALB (required for HTTPS)"
  type        = string
  default     = ""
}

variable "alb_acm_certificate_arn" {
  description = "ACM certificate ARN for ALB HTTPS (optional, will be created if alb_domain_name is provided)"
  type        = string
  default     = ""
}

variable "alb_subject_alternative_names" {
  description = "Additional domain names (SANs) for the ALB certificate"
  type        = list(string)
  default     = []
}

variable "alb_create_route53_validation" {
  description = "Whether to create Route53 validation records (requires route53_zone_id)"
  type        = bool
  default     = false
}

variable "alb_route53_zone_id" {
  description = "Route53 hosted zone ID for DNS validation (optional)"
  type        = string
  default     = ""
}

# Prometheus Configuration
variable "enable_prometheus" {
  description = "Enable Prometheus deployment"
  type        = bool
  default     = false
}

variable "prometheus_domain_name" {
  description = "Domain name for Prometheus (e.g., prometheus.wokibrain.grgcrew.com)"
  type        = string
  default     = ""
}

variable "prometheus_endpoint" {
  description = "Prometheus endpoint URL (if not using module)"
  type        = string
  default     = "http://prometheus:9090"
}

# Grafana Configuration
variable "enable_grafana" {
  description = "Enable Grafana deployment"
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
  default     = ""
}

