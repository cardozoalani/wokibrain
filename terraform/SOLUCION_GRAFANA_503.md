# 🔧 Solución al Error 503 en Grafana

## ❌ Problema Identificado

El servicio Grafana está retornando **503 Service Temporarily Unavailable** porque:

1. **El servicio ECS no tiene tareas corriendo**: `Desired: 1, Running: 0`
2. **Error de permisos IAM**: El rol de ejecución de ECS no tiene permisos para leer secretos de Secrets Manager

### Error Específico

```
ResourceInitializationError: unable to pull secrets or registry auth:
execution resource retrieval failed: unable to retrieve secret from asm:
service call has been retried 1 time(s): failed to fetch secret
arn:aws:secretsmanager:us-east-1:123456789012:secret:production-wokibrain-grafana-password-XXXXX
from secrets manager: operation error Secrets Manager: GetSecretValue,
https response error StatusCode: 400, RequestID: db61b7ea-3f1b-4a20-88a7-f2cbf360c6dd,
api error AccessDeniedException: User: arn:aws:sts::123456789012:assumed-role/production-wokibrain-ecs-execution-role/...
is not authorized to perform: secretsmanager:GetSecretValue on resource:
arn:aws:secretsmanager:us-east-1:123456789012:secret:production-wokibrain-grafana-password-XXXXX
because no identity-based policy allows the secretsmanager:GetSecretValue action
```

## ✅ Solución Aplicada

Se agregó una política IAM adicional al rol de ejecución de ECS para permitir acceso a Secrets Manager:

```hcl
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
      }
    ]
  })
}
```

## 📋 Pasos para Aplicar la Solución

### 1. Aplicar los Cambios de Terraform

```bash
cd terraform
terraform apply -lock=false
```

Esto agregará la política IAM necesaria al rol de ejecución.

### 2. Forzar un Nuevo Despliegue del Servicio Grafana

Después de aplicar los cambios, necesitas forzar un nuevo despliegue para que ECS intente iniciar nuevas tareas con los permisos actualizados:

```bash
aws ecs update-service \
  --cluster production-wokibrain-cluster \
  --service production-wokibrain-grafana \
  --force-new-deployment \
  --region us-east-1
```

### 3. Verificar el Estado del Servicio

Espera 1-2 minutos y verifica que las tareas estén corriendo:

```bash
aws ecs describe-services \
  --cluster production-wokibrain-cluster \
  --services production-wokibrain-grafana \
  --region us-east-1 \
  --query 'services[0].{Desired:desiredCount,Running:runningCount,Status:status}'
```

Deberías ver `Running: 1` cuando el servicio esté saludable.

### 4. Verificar el Target Group

Verifica que el target esté saludable:

```bash
# Obtener el ARN del target group
TG_ARN=$(aws elbv2 describe-target-groups \
  --names production-wokibrain-grafana-tg \
  --region us-east-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Verificar salud
aws elbv2 describe-target-health \
  --target-group-arn "$TG_ARN" \
  --region us-east-1
```

### 5. Probar el Endpoint

Una vez que el servicio esté corriendo y el target esté saludable:

```bash
curl -I https://grafana.wokibrain.grgcrew.com
```

Deberías recibir un `200 OK` en lugar de `503 Service Temporarily Unavailable`.

## 🔍 Verificación Adicional

Si después de aplicar los cambios aún hay problemas, verifica:

1. **Logs del servicio**:
```bash
aws logs tail /ecs/production-wokibrain-grafana --region us-east-1 --since 10m
```

2. **Eventos del servicio**:
```bash
aws ecs describe-services \
  --cluster production-wokibrain-cluster \
  --services production-wokibrain-grafana \
  --region us-east-1 \
  --query 'services[0].Events[0:5]'
```

3. **Estado de las tareas**:
```bash
aws ecs list-tasks \
  --cluster production-wokibrain-cluster \
  --service-name production-wokibrain-grafana \
  --region us-east-1
```

## 📝 Notas

- La política IAM se aplica a **todos los servicios ECS** que usan el mismo rol de ejecución (Grafana, Prometheus, y la API principal)
- El cambio es seguro y no afecta otros servicios
- El servicio Grafana se reiniciará automáticamente después del `force-new-deployment`



