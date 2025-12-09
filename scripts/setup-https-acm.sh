#!/bin/bash

# Script para configurar HTTPS en el ALB usando ACM
# Requiere: dominio propio y acceso a DNS

set -e

ENVIRONMENT="${ENVIRONMENT:-production}"
REGION="${AWS_REGION:-us-east-1}"

echo "🔒 Configuración de HTTPS para ALB"
echo "===================================="
echo ""

# Verificar que se proporcione el dominio
if [ -z "$1" ]; then
  echo "❌ Error: Debes proporcionar un dominio"
  echo ""
  echo "Uso: $0 <dominio> [email]"
  echo "Ejemplo: $0 api.tudominio.com tu@email.com"
  exit 1
fi

DOMAIN=$1
EMAIL="${2:-admin@${DOMAIN}}"

echo "📋 Configuración:"
echo "   Dominio: $DOMAIN"
echo "   Email: $EMAIL"
echo "   Región: $REGION"
echo ""

# Solicitar certificado en ACM
echo "1️⃣  Solicitando certificado en ACM..."
CERT_ARN=$(aws acm request-certificate \
  --domain-name "$DOMAIN" \
  --validation-method DNS \
  --region "$REGION" \
  --query 'CertificateArn' \
  --output text)

if [ -z "$CERT_ARN" ]; then
  echo "❌ Error al solicitar certificado"
  exit 1
fi

echo "✅ Certificado solicitado: $CERT_ARN"
echo ""

# Obtener registros de validación
echo "2️⃣  Obteniendo registros de validación DNS..."
sleep 5

VALIDATION_RECORDS=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region "$REGION" \
  --query 'Certificate.DomainValidationOptions[*].[ResourceRecord.Name,ResourceRecord.Value]' \
  --output text)

if [ -z "$VALIDATION_RECORDS" ]; then
  echo "⚠️  Los registros de validación aún no están disponibles"
  echo "   Espera unos minutos y ejecuta:"
  echo "   aws acm describe-certificate --certificate-arn $CERT_ARN --region $REGION"
  exit 1
fi

echo ""
echo "📝 Registros DNS a agregar:"
echo "================================"
echo "$VALIDATION_RECORDS" | while read NAME VALUE; do
  echo "Tipo: CNAME"
  echo "Nombre: $NAME"
  echo "Valor: $VALUE"
  echo ""
done

echo ""
echo "3️⃣  Configura estos registros en tu DNS y luego ejecuta:"
echo ""
echo "   # Verificar validación:"
echo "   aws acm describe-certificate --certificate-arn $CERT_ARN --region $REGION"
echo ""
echo "   # Una vez validado, actualiza terraform.tfvars:"
echo "   echo 'acm_certificate_arn = \"$CERT_ARN\"' >> terraform/terraform.tfvars"
echo ""
echo "   # Aplicar cambios:"
echo "   cd terraform && terraform apply"
echo ""



