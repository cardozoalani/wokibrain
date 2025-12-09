#!/bin/bash

# Script para construir y subir imagen Docker a ECR
# Uso: ./scripts/deploy-to-ecr.sh [tag]

set -e

REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
ENVIRONMENT="${ENVIRONMENT:-production}"

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "❌ Error: AWS_ACCOUNT_ID environment variable is required"
  echo "   Usage: AWS_ACCOUNT_ID=123456789012 ./scripts/deploy-to-ecr.sh [tag]"
  exit 1
fi

ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ENVIRONMENT}-wokibrain"
IMAGE_TAG="${1:-latest}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 WokiBrain - Deploy to ECR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Autenticar con ECR
echo "1️⃣  Autenticando con ECR..."
if aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR_REPO; then
  echo "   ✅ Autenticación exitosa"
else
  echo "   ❌ Error en autenticación"
  exit 1
fi
echo ""

# 2. Construir imagen para plataforma Linux/amd64 (requerido por ECS Fargate)
echo "2️⃣  Construyendo imagen Docker (Linux/amd64)..."
echo "   ℹ️  Construyendo imagen..."
# Try with BuildKit first, fallback to legacy builder if it fails
if DOCKER_BUILDKIT=1 docker build --platform linux/amd64 -t $ECR_REPO:$IMAGE_TAG . 2>/dev/null || \
   DOCKER_BUILDKIT=0 docker build --platform linux/amd64 -t $ECR_REPO:$IMAGE_TAG .; then
  echo "   ✅ Imagen construida exitosamente"
else
  echo "   ❌ Error construyendo imagen"
  exit 1
fi
echo ""

# 3. Tag imagen
echo "3️⃣  Taggeando imagen..."
docker tag $ECR_REPO:$IMAGE_TAG $ECR_REPO:latest
echo "   ✅ Imagen taggeada"
echo ""

# 4. Subir a ECR
echo "4️⃣  Subiendo imagen a ECR..."
if docker push $ECR_REPO:$IMAGE_TAG; then
  echo "   ✅ Imagen subida exitosamente"
else
  echo "   ❌ Error subiendo imagen"
  exit 1
fi
echo ""

# 5. Subir latest también
echo "5️⃣  Subiendo tag 'latest'..."
docker push $ECR_REPO:latest
echo "   ✅ Tag 'latest' subido"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT A ECR COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Próximos pasos:"
echo ""
echo "   Para actualizar el servicio ECS:"
echo "   aws ecs update-service \\"
echo "     --cluster production-wokibrain-cluster \\"
echo "     --service production-wokibrain-service \\"
echo "     --force-new-deployment \\"
echo "     --region $REGION"
echo ""
echo "   O espera a que ECS detecte automáticamente la nueva imagen"
echo ""
echo "🎉 ¡Listo para producción!"

