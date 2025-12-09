# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.environment}-wokibrain-redis-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${var.environment}-wokibrain-redis-subnet-group"
  }
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.environment}-wokibrain-redis-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = {
    Name = "${var.environment}-wokibrain-redis-params"
  }
}

# ElastiCache Replication Group (Redis Cluster)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.environment}-wokibrain-redis"
  description               = "Redis cluster for WokiBrain"
  engine                    = "redis"
  engine_version            = "7.0"
  node_type                 = var.node_type
  port                      = 6379
  parameter_group_name      = aws_elasticache_parameter_group.main.name
  subnet_group_name         = aws_elasticache_subnet_group.main.name
  security_group_ids        = var.security_group_ids
  num_cache_clusters        = var.num_cache_clusters
  automatic_failover_enabled = true
  multi_az_enabled          = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  snapshot_retention_limit  = 5
  snapshot_window           = "03:00-05:00"
  maintenance_window        = "mon:05:00-mon:07:00"

  tags = {
    Name = "${var.environment}-wokibrain-redis"
  }
}



