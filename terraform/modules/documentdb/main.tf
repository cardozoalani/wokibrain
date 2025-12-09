# Generate random password for DocumentDB
resource "random_password" "master_password" {
  length  = 32
  special = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "documentdb_password" {
  name = "${var.environment}-wokibrain-documentdb-password"

  tags = {
    Name = "${var.environment}-wokibrain-documentdb-secret"
  }
}

resource "aws_secretsmanager_secret_version" "documentdb_password" {
  secret_id = aws_secretsmanager_secret.documentdb_password.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master_password.result
  })
}

# DocumentDB Subnet Group
resource "aws_docdb_subnet_group" "main" {
  name       = "${var.environment}-wokibrain-documentdb-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${var.environment}-wokibrain-documentdb-subnet-group"
  }
}

# DocumentDB Parameter Group
resource "aws_docdb_cluster_parameter_group" "main" {
  family = "docdb5.0"
  name   = "${var.environment}-wokibrain-documentdb-params"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  tags = {
    Name = "${var.environment}-wokibrain-documentdb-params"
  }
}

# DocumentDB Cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier              = "${var.environment}-wokibrain-documentdb"
  engine                          = "docdb"
  engine_version                  = "5.0.0"
  master_username                 = var.master_username
  master_password                 = random_password.master_password.result
  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  vpc_security_group_ids          = var.security_group_ids
  backup_retention_period         = var.backup_retention_period
  preferred_backup_window         = "03:00-04:00"
  preferred_maintenance_window   = "mon:04:00-mon:05:00"
  skip_final_snapshot             = false
  final_snapshot_identifier       = "${var.environment}-wokibrain-documentdb-final-snapshot"
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = {
    Name = "${var.environment}-wokibrain-documentdb-cluster"
  }
}

# DocumentDB Cluster Instances
resource "aws_docdb_cluster_instance" "main" {
  count              = var.cluster_size
  identifier         = "${var.environment}-wokibrain-documentdb-${count.index + 1}"
  cluster_identifier  = aws_docdb_cluster.main.id
  instance_class      = var.instance_class

  tags = {
    Name = "${var.environment}-wokibrain-documentdb-instance-${count.index + 1}"
  }
}
