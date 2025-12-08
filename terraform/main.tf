terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "wokibrain-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "wokibrain-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "wokibrain"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Local values to determine certificate ARN deterministically
locals {
  # Determine if we should create ACM certificate (only if domain_name is provided and no existing ARN)
  create_acm_certificate = var.alb_domain_name != "" && var.alb_acm_certificate_arn == ""

  # Determine if we should use HTTPS (either domain name or manual ARN)
  use_https = var.alb_domain_name != "" || var.alb_acm_certificate_arn != ""
}

module "vpc" {
  source = "./modules/vpc"

  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 3)
}

module "security" {
  source = "./modules/security"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

module "documentdb" {
  source = "./modules/documentdb"

  environment             = var.environment
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnet_ids
  security_group_ids      = [module.security.documentdb_security_group_id]
  instance_class          = var.documentdb_instance_class
  cluster_size            = var.documentdb_cluster_size
  master_username         = var.documentdb_master_username
  backup_retention_period = var.backup_retention_period
}

# ACM Certificate for ALB (optional)
module "alb_acm" {
  count  = local.create_acm_certificate ? 1 : 0
  source = "./modules/acm"

  environment = var.environment
  domain_name = var.alb_domain_name
  # Automatically include Grafana and Prometheus domains as SANs if enabled
  subject_alternative_names = concat(
    var.alb_subject_alternative_names,
    var.enable_grafana && var.grafana_domain_name != "" ? [var.grafana_domain_name] : [],
    var.enable_prometheus && var.prometheus_domain_name != "" ? [var.prometheus_domain_name] : []
  )
  wait_for_validation               = false
  create_route53_validation_records = var.alb_create_route53_validation
  route53_zone_id                   = var.alb_route53_zone_id
}

module "ecs" {
  source = "./modules/ecs"

  environment             = var.environment
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  public_subnet_ids       = module.vpc.public_subnet_ids
  app_security_group_id   = module.security.app_security_group_id
  alb_security_group_id   = module.security.alb_security_group_id
  ecr_repository_url      = module.ecr.repository_url
  image_tag               = var.image_tag
  app_port                = var.app_port
  desired_count           = var.desired_count
  cpu                     = var.task_cpu
  memory                  = var.task_memory
  documentdb_endpoint     = module.documentdb.cluster_endpoint
  documentdb_username     = var.documentdb_master_username
  documentdb_password     = module.documentdb.master_password
  redis_endpoint          = module.redis.redis_endpoint
  kafka_bootstrap_brokers = module.kafka.bootstrap_brokers_tls
  log_retention_days      = var.log_retention_days
  # Pass whether to use HTTPS (deterministic) and certificate ARN separately
  # The module will handle getting the ARN from the ACM module if needed
  use_https           = local.use_https
  acm_certificate_arn = var.alb_acm_certificate_arn
  # Pass ACM module output only if it exists (will be resolved during apply)
  acm_certificate_arn_from_module = local.create_acm_certificate ? module.alb_acm[0].certificate_arn : ""
}

module "ecr" {
  source = "./modules/ecr"

  environment = var.environment
}

module "redis" {
  source = "./modules/redis"

  environment        = var.environment
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.security.redis_security_group_id]
  node_type          = var.redis_node_type
  num_cache_clusters = var.redis_cluster_size
}

module "kafka" {
  source = "./modules/kafka"

  environment            = var.environment
  subnet_ids             = module.vpc.private_subnet_ids
  security_group_ids     = [module.security.kafka_security_group_id]
  number_of_broker_nodes = var.kafka_broker_nodes
  broker_instance_type   = var.kafka_broker_instance_type
  volume_size            = var.kafka_volume_size
}

module "monitoring" {
  source = "./modules/monitoring"

  environment      = var.environment
  ecs_cluster_name = module.ecs.cluster_name
  ecs_service_name = module.ecs.service_name
  alb_arn_suffix   = module.ecs.alb_arn_suffix
  target_group_arn = module.ecs.target_group_arn_suffix
  alarm_email      = var.alarm_email
}

module "cdn" {
  source = "./modules/cdn"

  environment         = var.environment
  alb_dns_name        = module.ecs.alb_dns_name
  domain_name         = var.cdn_domain_name
  acm_certificate_arn = var.cdn_acm_certificate_arn
  price_class         = var.cdn_price_class
  waf_web_acl_id      = var.cdn_waf_web_acl_id
}

# Prometheus (optional)
module "prometheus" {
  count  = var.enable_prometheus ? 1 : 0
  source = "./modules/prometheus"

  environment                   = var.environment
  vpc_id                        = module.vpc.vpc_id
  vpc_cidr_block                = "10.0.0.0/16"
  private_subnet_ids            = module.vpc.private_subnet_ids
  ecs_cluster_id                = module.ecs.cluster_id
  ecs_execution_role_arn        = module.ecs.ecs_execution_role_arn
  ecs_task_role_arn             = module.ecs.ecs_task_role_arn
  alb_security_group_id         = module.security.alb_security_group_id
  app_security_group_id         = module.security.app_security_group_id
  alb_listener_arn              = module.ecs.alb_listener_http_arn
  alb_https_listener_arn        = module.ecs.alb_listener_https_arn != "" ? module.ecs.alb_listener_https_arn : ""
  prometheus_domain_name        = var.prometheus_domain_name
  alb_dns_name                  = module.ecs.alb_dns_name
  ecr_repository_url_prometheus = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/prometheus"
  log_retention_days            = var.log_retention_days
}

# Grafana (optional)
module "grafana" {
  count  = var.enable_grafana ? 1 : 0
  source = "./modules/grafana"

  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_cluster_id         = module.ecs.cluster_id
  ecs_execution_role_arn = module.ecs.ecs_execution_role_arn
  ecs_task_role_arn      = module.ecs.ecs_task_role_arn
  alb_security_group_id  = module.security.alb_security_group_id
  alb_listener_arn       = module.ecs.alb_listener_http_arn
  alb_https_listener_arn = module.ecs.alb_listener_https_arn
  use_https              = local.use_https
  grafana_domain_name    = var.grafana_domain_name
  grafana_admin_password = var.grafana_admin_password
  prometheus_endpoint    = var.enable_prometheus && length(module.prometheus) > 0 ? module.prometheus[0].prometheus_endpoint : var.prometheus_endpoint
  alb_dns_name           = module.ecs.alb_dns_name
  prometheus_domain_name = var.prometheus_domain_name
  log_retention_days     = var.log_retention_days
}

