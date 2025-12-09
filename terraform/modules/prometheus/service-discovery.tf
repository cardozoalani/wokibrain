# Service Discovery Namespace for internal DNS
resource "aws_service_discovery_private_dns_namespace" "wokibrain" {
  name        = "wokibrain.internal"
  vpc         = var.vpc_id
  description = "Private DNS namespace for WokiBrain services"

  tags = {
    Name = "${var.environment}-wokibrain-internal-dns"
  }
}

# Service Discovery Service for Prometheus
resource "aws_service_discovery_service" "prometheus" {
  name = "prometheus"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.wokibrain.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Name = "${var.environment}-prometheus-service-discovery"
  }
}


