# MSK Configuration
resource "aws_msk_configuration" "main" {
  kafka_versions = ["3.5.1"]
  name           = "${var.environment}-wokibrain-kafka-config"

  server_properties = <<PROPERTIES
auto.create.topics.enable=true
default.replication.factor=3
min.insync.replicas=2
num.partitions=3
log.retention.hours=168
compression.type=snappy
PROPERTIES

  description = "MSK configuration for WokiBrain"
}

# MSK Cluster
resource "aws_msk_cluster" "main" {
  cluster_name           = "${var.environment}-wokibrain-kafka"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = var.number_of_broker_nodes

  broker_node_group_info {
    instance_type   = var.broker_instance_type
    client_subnets  = var.subnet_ids
    security_groups  = var.security_group_ids
    storage_info {
      ebs_storage_info {
        volume_size = var.volume_size
      }
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  enhanced_monitoring = "PER_TOPIC_PER_PARTITION"

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.kafka.name
      }
    }
  }

  tags = {
    Name = "${var.environment}-wokibrain-kafka"
  }
}

# CloudWatch Log Group for Kafka
resource "aws_cloudwatch_log_group" "kafka" {
  name              = "/aws/msk/${var.environment}-wokibrain"
  retention_in_days = 7

  tags = {
    Name = "${var.environment}-wokibrain-kafka-logs"
  }
}

