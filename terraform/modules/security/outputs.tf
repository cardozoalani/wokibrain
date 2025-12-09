output "alb_security_group_id" {
  description = "Security group ID for ALB"
  value       = aws_security_group.alb.id
}

output "app_security_group_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.app.id
}

output "documentdb_security_group_id" {
  description = "Security group ID for DocumentDB"
  value       = aws_security_group.documentdb.id
}

output "redis_security_group_id" {
  description = "Security group ID for Redis"
  value       = aws_security_group.redis.id
}

output "kafka_security_group_id" {
  description = "Security group ID for Kafka"
  value       = aws_security_group.kafka.id
}



