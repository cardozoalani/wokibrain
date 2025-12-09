# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-wokibrain-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.environment}-wokibrain-cluster"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.environment}-wokibrain"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.environment}-wokibrain-logs"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.environment}-wokibrain-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.environment}-wokibrain-ecs-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional IAM policy for Secrets Manager and EFS access
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "${var.environment}-wokibrain-ecs-execution-secrets-policy"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:DescribeMountTargets",
          "elasticfilesystem:DescribeFileSystems"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Role for ECS Task
resource "aws_iam_role" "ecs_task" {
  name = "${var.environment}-wokibrain-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.environment}-wokibrain-ecs-task-role"
  }
}

# IAM policy for ECS Task to access EFS
resource "aws_iam_role_policy" "ecs_task_efs" {
  name = "${var.environment}-wokibrain-ecs-task-efs-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:DescribeMountTargets",
          "elasticfilesystem:DescribeFileSystems"
        ]
        Resource = "*"
      }
    ]
  })
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.environment}-wokibrain"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "wokibrain-api"
      image = "${var.ecr_repository_url}:${var.image_tag}"

      portMappings = [
        {
          containerPort = var.app_port
          protocol      = "tcp"
        },
        {
          containerPort = 50051
          protocol      = "tcp"
        }
      ]

      environment = concat(
        [
          {
            name  = "NODE_ENV"
            value = "production"
          },
          {
            name  = "PORT"
            value = tostring(var.app_port)
          },
          {
            name  = "HOST"
            value = "0.0.0.0"
          },
          {
            name  = "MONGODB_URI"
            value = "mongodb://${urlencode(var.documentdb_username)}:${urlencode(var.documentdb_password)}@${var.documentdb_endpoint}:27017/wokibrain?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
          },
          {
            name  = "MONGODB_DATABASE"
            value = "wokibrain"
          },
          {
            name  = "MONGODB_MAX_POOL_SIZE"
            value = "10"
          },
          {
            name  = "MONGODB_MIN_POOL_SIZE"
            value = "2"
          },
          {
            name  = "EVENT_SOURCING_ENABLED"
            value = "true"
          },
          {
            name  = "CQRS_ENABLED"
            value = "true"
          },
          {
            name  = "LOG_LEVEL"
            value = "info"
          },
          {
            name  = "RATE_LIMIT_MAX"
            value = "100"
          },
          {
            name  = "RATE_LIMIT_TIME_WINDOW"
            value = "60000"
          },
          {
            name  = "CORS_ORIGIN"
            value = "*"
          },
          {
            name  = "OTEL_ENABLED"
            value = "true"
          },
          {
            name  = "OTEL_SERVICE_NAME"
            value = "wokibrain"
          },
          {
            name  = "METRICS_PORT"
            value = "9464"
          }
        ],
        var.redis_endpoint != "" ? [
          {
            name  = "REDIS_HOST"
            value = split(":", var.redis_endpoint)[0]
          },
          {
            name  = "REDIS_PORT"
            value = "6379"
          }
        ] : [
          {
            name  = "REDIS_HOST"
            value = "localhost"
          },
          {
            name  = "REDIS_PORT"
            value = "6379"
          }
        ],
        var.kafka_bootstrap_brokers != "" ? concat(
          [
            {
              name  = "KAFKA_BROKERS"
              value = var.kafka_bootstrap_brokers
            },
            {
              name  = "KAFKA_CLIENT_ID"
              value = var.kafka_client_id
            },
            {
              name  = "KAFKA_GROUP_ID"
              value = var.kafka_group_id
            },
            {
              name  = "KAFKA_SSL"
              value = tostring(var.kafka_ssl)
            }
          ],
          var.kafka_sasl_username != "" && var.kafka_sasl_password != "" ? [
            {
              name  = "KAFKA_SASL_MECHANISM"
              value = var.kafka_sasl_mechanism
            },
            {
              name  = "KAFKA_SASL_USERNAME"
              value = var.kafka_sasl_username
            },
            {
              name  = "KAFKA_SASL_PASSWORD"
              value = var.kafka_sasl_password
            }
          ] : []
        ) : [],
        var.webhook_worker_enabled ? [
          {
            name  = "WEBHOOK_WORKER_ENABLED"
            value = "true"
          }
        ] : [
          {
            name  = "WEBHOOK_WORKER_ENABLED"
            value = "false"
          }
        ]
      )

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"       = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${var.app_port}/api/v1/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.environment}-wokibrain-task"
  }
}

data "aws_region" "current" {}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.environment}-wokibrain-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "production" ? true : false
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    enabled = true
  }

  # Wait for S3 bucket policy to be ready
  depends_on = [
    aws_s3_bucket_policy.alb_logs
  ]

  tags = {
    Name = "${var.environment}-wokibrain-alb"
  }
}

# S3 Bucket for ALB Logs
resource "aws_s3_bucket" "alb_logs" {
  bucket = "${var.environment}-wokibrain-alb-logs"

  tags = {
    Name = "${var.environment}-wokibrain-alb-logs"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "delete-old-logs"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 7
    }
  }
}

# Get AWS Account ID and Region for bucket policy
data "aws_caller_identity" "current" {}
data "aws_elb_service_account" "main" {}

# S3 Bucket Policy for ALB Logs
resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = data.aws_elb_service_account.main.arn
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.alb_logs.arn
      }
    ]
  })
}

# S3 Bucket Public Access Block (for security)
resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Target Group
resource "aws_lb_target_group" "app" {
  name        = "${var.environment}-wokibrain-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/api/v1/health"
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name = "${var.environment}-wokibrain-tg"
  }
}

# Local value to determine certificate ARN (use module ARN if available, otherwise manual ARN)
locals {
  certificate_arn = var.acm_certificate_arn_from_module != "" ? var.acm_certificate_arn_from_module : var.acm_certificate_arn
  # Only create HTTPS listener if we have a certificate ARN
  # Note: The certificate must be validated (status = ISSUED) before it can be used
  # If the certificate is not validated, this will fail and you should comment out
  # alb_domain_name in terraform.tfvars until the certificate is validated
  # Use var.use_https and check if we have at least one certificate source (known at plan time)
  # This avoids count dependency issues with module outputs
  has_certificate = var.use_https && (var.acm_certificate_arn != "" || var.acm_certificate_arn_from_module != "")
}

# ALB Listener (HTTP)
# If HTTPS certificate is provided, redirect HTTP to HTTPS
# Otherwise, forward to target group
# Use separate resources to avoid attribute conflicts
resource "aws_lb_listener" "http_redirect" {
  count = var.use_https && (var.acm_certificate_arn != "" || var.acm_certificate_arn_from_module != "") ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "http_forward" {
  count = var.use_https && (var.acm_certificate_arn != "" || var.acm_certificate_arn_from_module != "") ? 0 : 1

  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ALB Listener (HTTPS) - Requires validated ACM certificate
# Only create if we have a certificate ARN
# IMPORTANT: The certificate must be validated (status = ISSUED) before this will work.
# Use for_each with only var.use_https and var.acm_certificate_arn (known at plan time)
# The module ARN will be resolved at apply time via local.certificate_arn
resource "aws_lb_listener" "https" {
  for_each          = var.use_https && (var.acm_certificate_arn != "" || var.acm_certificate_arn_from_module != "") ? { create = true } : {}
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = local.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "${var.environment}-wokibrain-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.app_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "wokibrain-api"
    container_port   = var.app_port
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # Wait for ALB listeners and Target Group to be ready
  # Note: aws_lb_listener.https may not exist if certificate is not validated
  # Include both HTTP listener resources (only one will exist at a time)
  depends_on = [
    aws_lb_listener.http_redirect,
    aws_lb_listener.http_forward,
    aws_lb_target_group.app
  ]

  tags = {
    Name = "${var.environment}-wokibrain-service"
  }
}

