# ECS Task Definition for Grafana
resource "aws_ecs_task_definition" "grafana" {
  family                   = "${var.environment}-wokibrain-grafana"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "grafana"
      image = "grafana/grafana:10.2.0"

      entryPoint = ["/bin/sh", "-c"]
      command = [
        <<-EOT
          # Create provisioning directories
          mkdir -p /etc/grafana/provisioning/datasources
          mkdir -p /etc/grafana/provisioning/dashboards
          mkdir -p /var/lib/grafana/dashboards
          
          # Create datasource provisioning file
          # Using prometheus.wokibrain.internal for internal DNS resolution
          cat > /etc/grafana/provisioning/datasources/prometheus.yaml <<'DATASOURCE'
          apiVersion: 1
          datasources:
            - name: Prometheus
              type: prometheus
              access: proxy
              url: http://prometheus.wokibrain.internal:9090
              isDefault: true
              editable: true
              jsonData:
                httpMethod: POST
                timeInterval: 15s
          DATASOURCE
          
          # Create dashboard provider file
          cat > /etc/grafana/provisioning/dashboards/dashboard.yaml <<'PROVIDER'
          apiVersion: 1
          providers:
            - name: 'WokiBrain Dashboards'
              orgId: 1
              folder: ''
              type: file
              disableDeletion: false
              updateIntervalSeconds: 30
              allowUiUpdates: true
              options:
                path: /var/lib/grafana/dashboards
          PROVIDER
          
          # Create WokiBrain Overview Dashboard
          cat > /var/lib/grafana/dashboards/wokibrain-overview.json <<'DASHBOARD'
          {
            "title": "WokiBrain Overview",
            "tags": ["wokibrain", "api", "performance"],
            "timezone": "browser",
            "editable": true,
            "panels": [
                {
                  "id": 1,
                  "title": "Requests Per Second",
                  "type": "graph",
                  "datasource": "Prometheus",
                  "targets": [
                    {
                      "expr": "rate(http_requests_total[5m])",
                      "legendFormat": "{{method}} {{route}}"
                    }
                  ],
                  "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 }
                },
                {
                  "id": 2,
                  "title": "P95 Latency",
                  "type": "graph",
                  "datasource": "Prometheus",
                  "targets": [
                    {
                      "expr": "histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))",
                      "legendFormat": "{{route}}"
                    }
                  ],
                  "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 }
                },
                {
                  "id": 3,
                  "title": "Error Rate",
                  "type": "graph",
                  "datasource": "Prometheus",
                  "targets": [
                    {
                      "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
                      "legendFormat": "5xx Errors"
                    }
                  ],
                  "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 }
                },
                {
                  "id": 4,
                  "title": "Bookings Created (Rate)",
                  "type": "graph",
                  "datasource": "Prometheus",
                  "targets": [
                    {
                      "expr": "rate(bookings_created_total[5m])",
                      "legendFormat": "{{restaurant_id}}"
                    }
                  ],
                  "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 }
                },
                {
                  "id": 5,
                  "title": "Cache Hit Rate",
                  "type": "stat",
                  "datasource": "Prometheus",
                  "targets": [
                    {
                      "expr": "rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) * 100"
                    }
                  ],
                  "gridPos": { "h": 4, "w": 6, "x": 0, "y": 16 }
                },
                {
                  "id": 6,
                  "title": "Active Connections",
                  "type": "stat",
                  "datasource": "Prometheus",
                  "targets": [
                    {
                      "expr": "active_connections"
                    }
                  ],
                  "gridPos": { "h": 4, "w": 6, "x": 6, "y": 16 }
                },
                {
                  "id": 7,
                  "title": "Database Connections",
                  "type": "stat",
                  "datasource": "Prometheus",
                  "targets": [
                    {
                      "expr": "database_connections_active"
                    }
                  ],
                  "gridPos": { "h": 4, "w": 6, "x": 12, "y": 16 }
                },
                {
                  "id": 8,
                  "title": "Projection Lag",
                  "type": "stat",
                  "datasource": "Prometheus",
                  "targets": [
                    {
                      "expr": "projection_lag_seconds"
                    }
                  ],
                  "gridPos": { "h": 4, "w": 6, "x": 18, "y": 16 }
                }
              ],
            "schemaVersion": 16,
            "version": 1,
            "refresh": "10s"
          }
          DASHBOARD
          
          # Start Grafana
          exec /run.sh
        EOT
      ]

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "GF_SECURITY_ADMIN_USER"
          value = "admin"
        },
        {
          name  = "GF_SERVER_ROOT_URL"
          value = "https://${var.grafana_domain_name}/"
        },
        {
          name  = "GF_SERVER_SERVE_FROM_SUB_PATH"
          value = "false"
        },
        {
          name  = "GF_INSTALL_PLUGINS"
          value = ""
        },
        {
          name  = "GF_PATHS_PROVISIONING"
          value = "/etc/grafana/provisioning"
        },
        {
          name  = "GF_SERVER_DOMAIN"
          value = var.grafana_domain_name != "" ? var.grafana_domain_name : "localhost"
        },
        {
          name  = "GF_SERVER_PROTOCOL"
          value = "http"
        },
        {
          name  = "GF_SERVER_HTTP_PORT"
          value = "3000"
        },
        {
          name  = "GF_DATABASE_TYPE"
          value = "sqlite3"
        },
        {
          name  = "GF_DATABASE_PATH"
          value = "/var/lib/grafana/grafana.db"
        }
      ]

      secrets = [
        {
          name      = "GF_SECURITY_ADMIN_PASSWORD"
          valueFrom = aws_secretsmanager_secret.grafana_password.arn
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "grafana-efs"
          containerPath = "/var/lib/grafana"
          readOnly      = false
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.grafana.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "grafana"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  volume {
    name = "grafana-efs"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.grafana.id
      transit_encryption = "ENABLED"
      authorization_config {
        access_point_id = aws_efs_access_point.grafana.id
        iam             = "ENABLED"
      }
    }
  }

  tags = {
    Name = "${var.environment}-wokibrain-grafana-task"
  }
}

# ECS Service for Grafana
resource "aws_ecs_service" "grafana" {
  name            = "${var.environment}-wokibrain-grafana"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.grafana.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.grafana.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.grafana.arn
    container_name   = "grafana"
    container_port   = 3000
  }

  depends_on = [
    aws_lb_target_group.grafana
  ]

  tags = {
    Name = "${var.environment}-wokibrain-grafana-service"
  }
}

# CloudWatch Log Group for Grafana
resource "aws_cloudwatch_log_group" "grafana" {
  name              = "/ecs/${var.environment}-wokibrain-grafana"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.environment}-wokibrain-grafana-logs"
  }
}

# Security Group for Grafana
resource "aws_security_group" "grafana" {
  name        = "${var.environment}-wokibrain-grafana-sg"
  description = "Security group for Grafana ECS service"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Grafana HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-wokibrain-grafana-sg"
  }
}

# Target Group for Grafana
resource "aws_lb_target_group" "grafana" {
  name        = "${substr(var.environment, 0, 8)}-wb-graf-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/api/health"
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name = "${var.environment}-wokibrain-grafana-tg"
  }
}

# ALB Listener Rule for Grafana
resource "aws_lb_listener_rule" "grafana" {
  listener_arn = var.alb_listener_arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grafana.arn
  }

  condition {
    host_header {
      values = [var.grafana_domain_name]
    }
  }
}

# HTTPS Listener Rule for Grafana (if HTTPS is enabled)
# Use for_each with a known value to avoid dependency issues
# Only create if HTTPS is enabled AND listener ARN is provided (not empty)
resource "aws_lb_listener_rule" "grafana_https" {
  for_each     = var.use_https && var.alb_https_listener_arn != "" ? { create = true } : {}
  listener_arn = var.alb_https_listener_arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.grafana.arn
  }

  condition {
    host_header {
      values = [var.grafana_domain_name]
    }
  }
}

# EFS for Grafana persistent storage
resource "aws_efs_file_system" "grafana" {
  creation_token = "${var.environment}-wokibrain-grafana"
  encrypted      = true

  performance_mode                = "generalPurpose"
  throughput_mode                 = "provisioned"
  provisioned_throughput_in_mibps = 50

  tags = {
    Name = "${var.environment}-wokibrain-grafana-efs"
  }
}

# EFS Access Point for Grafana with proper permissions
# Using /grafana-v3 for completely clean start with HTTP datasource
resource "aws_efs_access_point" "grafana" {
  file_system_id = aws_efs_file_system.grafana.id

  posix_user {
    gid = 472
    uid = 472
  }

  root_directory {
    path = "/grafana-v3"
    creation_info {
      owner_gid   = 472
      owner_uid   = 472
      permissions = "755"
    }
  }

  tags = {
    Name = "${var.environment}-wokibrain-grafana-access-point-v3"
  }
}

# EFS File System Policy to allow IAM-based access
resource "aws_efs_file_system_policy" "grafana" {
  file_system_id = aws_efs_file_system.grafana.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite"
        ]
        Resource = aws_efs_file_system.grafana.arn
        Condition = {
          Bool = {
            "elasticfilesystem:AccessedViaMountTarget" = "true"
          }
        }
      }
    ]
  })
}

# EFS Mount Targets
resource "aws_efs_mount_target" "grafana" {
  count           = length(var.private_subnet_ids)
  file_system_id  = aws_efs_file_system.grafana.id
  subnet_id       = var.private_subnet_ids[count.index]
  security_groups = [aws_security_group.efs_grafana.id]
}

# Security Group for EFS (Grafana)
resource "aws_security_group" "efs_grafana" {
  name        = "${var.environment}-wokibrain-efs-grafana-sg"
  description = "Security group for Grafana EFS"
  vpc_id      = var.vpc_id

  ingress {
    description     = "NFS from Grafana ECS tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.grafana.id]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-wokibrain-efs-grafana-sg"
  }
}

# Secrets Manager for Grafana password
resource "aws_secretsmanager_secret" "grafana_password" {
  name        = "${var.environment}-wokibrain-grafana-password"
  description = "Grafana admin password"

  tags = {
    Name = "${var.environment}-wokibrain-grafana-password"
  }
}

resource "aws_secretsmanager_secret_version" "grafana_password" {
  secret_id     = aws_secretsmanager_secret.grafana_password.id
  secret_string = var.grafana_admin_password
}

data "aws_region" "current" {}

