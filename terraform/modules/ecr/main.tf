resource "aws_ecr_repository" "wokibrain" {
  name                 = "${var.environment}-wokibrain"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "${var.environment}-wokibrain-ecr"
  }
}

resource "aws_ecr_lifecycle_policy" "wokibrain" {
  repository = aws_ecr_repository.wokibrain.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}



