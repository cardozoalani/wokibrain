#!/bin/bash

# Script para diagnosticar problemas con ECS Tasks
# Uso: ./scripts/diagnose-ecs.sh <cluster-name> <service-name> [region]

set -e

CLUSTER_NAME="${1:-production-wokibrain-cluster}"
SERVICE_NAME="${2:-production-wokibrain-service}"
REGION="${3:-us-east-1}"

echo "🔍 Diagnóstico de ECS Task"
echo "=========================="
echo "Cluster: $CLUSTER_NAME"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# 1. Verificar estado del servicio
echo "📊 Estado del servicio:"
aws ecs describe-services \
  --cluster "$CLUSTER_NAME" \
  --services "$SERVICE_NAME" \
  --region "$REGION" \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Deployments:deployments[*].{Status:status,Running:runningCount}}' \
  --output table

echo ""

# 2. Obtener tareas fallidas
echo "❌ Tareas fallidas (últimas 10):"
TASK_ARNS=$(aws ecs list-tasks \
  --cluster "$CLUSTER_NAME" \
  --service-name "$SERVICE_NAME" \
  --desired-status STOPPED \
  --region "$REGION" \
  --max-items 10 \
  --query 'taskArns[]' \
  --output text)

if [ -z "$TASK_ARNS" ]; then
  echo "No se encontraron tareas detenidas."
else
  for TASK_ARN in $TASK_ARNS; do
    echo ""
    echo "Task: $TASK_ARN"
    aws ecs describe-tasks \
      --cluster "$CLUSTER_NAME" \
      --tasks "$TASK_ARN" \
      --region "$REGION" \
      --query 'tasks[0].{StoppedReason:stoppedReason,StoppedAt:stoppedAt,ExitCode:containers[0].exitCode,LastStatus:containers[0].lastStatus}' \
      --output table
  done
fi

echo ""

# 3. Obtener logs de CloudWatch
echo "📋 Logs de CloudWatch (últimas 50 líneas):"
LOG_GROUP="/ecs/${CLUSTER_NAME%-cluster}-wokibrain"

if aws logs describe-log-streams \
  --log-group-name "$LOG_GROUP" \
  --region "$REGION" \
  --order-by LastEventTime \
  --descending \
  --max-items 1 \
  --query 'logStreams[0].logStreamName' \
  --output text 2>/dev/null | grep -q .; then

  LATEST_STREAM=$(aws logs describe-log-streams \
    --log-group-name "$LOG_GROUP" \
    --region "$REGION" \
    --order-by LastEventTime \
    --descending \
    --max-items 1 \
    --query 'logStreams[0].logStreamName' \
    --output text)

  echo "Último log stream: $LATEST_STREAM"
  echo ""
  aws logs get-log-events \
    --log-group-name "$LOG_GROUP" \
    --log-stream-name "$LATEST_STREAM" \
    --region "$REGION" \
    --limit 50 \
    --query 'events[*].message' \
    --output text | tail -50
else
  echo "⚠️  No se encontraron logs en $LOG_GROUP"
fi

echo ""
echo ""

# 4. Verificar configuración del task definition
echo "⚙️  Configuración del Task Definition:"
CURRENT_TASK_DEF=$(aws ecs describe-services \
  --cluster "$CLUSTER_NAME" \
  --services "$SERVICE_NAME" \
  --region "$REGION" \
  --query 'services[0].taskDefinition' \
  --output text)

echo "Task Definition: $CURRENT_TASK_DEF"
echo ""

aws ecs describe-task-definition \
  --task-definition "$CURRENT_TASK_DEF" \
  --region "$REGION" \
  --query 'taskDefinition.{Family:family,Revision:revision,CPU:cpu,Memory:memory,NetworkMode:networkMode,ContainerDefinitions:containerDefinitions[*].{Name:name,Image:image,PortMappings:portMappings,Environment:environment[*].name}}' \
  --output json | jq '.'

echo ""

# 5. Verificar conectividad de red
echo "🌐 Verificación de red:"
echo "Subnets configuradas:"
aws ecs describe-services \
  --cluster "$CLUSTER_NAME" \
  --services "$SERVICE_NAME" \
  --region "$REGION" \
  --query 'services[0].networkConfiguration.awsvpcConfiguration.{Subnets:subnets,SecurityGroups:securityGroups,AssignPublicIp:assignPublicIp}' \
  --output json | jq '.'

echo ""

# 6. Verificar eventos del servicio
echo "📅 Eventos recientes del servicio:"
aws ecs describe-services \
  --cluster "$CLUSTER_NAME" \
  --services "$SERVICE_NAME" \
  --region "$REGION" \
  --query 'services[0].events[0:10].{Time:createdAt,Message:message}' \
  --output table

echo ""
echo "✅ Diagnóstico completado"
echo ""
echo "💡 Próximos pasos:"
echo "1. Revisa los logs de CloudWatch para ver errores específicos"
echo "2. Verifica que todas las variables de entorno estén configuradas"
echo "3. Verifica la conectividad a DocumentDB, Redis y Kafka"
echo "4. Revisa los Security Groups para asegurar que permiten el tráfico necesario"
echo "5. Verifica que la imagen Docker esté correctamente construida y subida a ECR"



