#!/bin/bash

# Script específico para configurar HTTPS para wokibrain.grgcrew.com
# Este script solicita el certificado ACM y muestra los registros DNS necesarios

set -e

DOMAIN="wokibrain.grgcrew.com"
REGION="${AWS_REGION:-us-east-1}"

echo "🔒 Configuración de HTTPS para $DOMAIN"
echo "======================================"
echo ""

# Verificar credenciales de AWS
if ! aws sts get-caller-identity &> /dev/null; then
  echo "❌ Error: No hay credenciales de AWS configuradas"
  echo "   Configura tus credenciales con: aws configure"
  exit 1
fi

echo "📋 Configuración:"
echo "   Dominio: $DOMAIN"
echo "   Región: $REGION"
echo ""

# Solicitar certificado en ACM
echo "1️⃣  Solicitando certificado en ACM..."
CERT_ARN=$(aws acm request-certificate \
  --domain-name "$DOMAIN" \
  --validation-method DNS \
  --region "$REGION" \
  --query 'CertificateArn' \
  --output text 2>&1)

# Verificar si el certificado ya existe
if [[ $CERT_ARN == *"ResourceInUseException"* ]]; then
  echo "⚠️  El certificado ya existe para este dominio"
  echo "   Obteniendo ARN del certificado existente..."
  CERT_ARN=$(aws acm list-certificates \
    --region "$REGION" \
    --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn" \
    --output text | head -1)

  if [ -z "$CERT_ARN" ]; then
    echo "❌ No se pudo encontrar el certificado existente"
    exit 1
  fi
  echo "✅ Certificado encontrado: $CERT_ARN"
elif [[ $CERT_ARN == arn:* ]]; then
  echo "✅ Certificado solicitado: $CERT_ARN"
else
  echo "❌ Error al solicitar certificado:"
  echo "$CERT_ARN"
  exit 1
fi

echo ""
echo "2️⃣  Obteniendo registros de validación DNS..."
sleep 3

# Obtener registros de validación
VALIDATION_INFO=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region "$REGION" \
  --query 'Certificate.DomainValidationOptions[0]' \
  --output json 2>&1)

if [ -z "$VALIDATION_INFO" ] || [[ $VALIDATION_INFO == *"error"* ]]; then
  echo "⚠️  Los registros de validación aún no están disponibles"
  echo "   Espera unos minutos y ejecuta:"
  echo "   aws acm describe-certificate --certificate-arn $CERT_ARN --region $REGION"
  echo ""
  echo "   O usa este comando para obtener los registros:"
  echo "   ./scripts/get-cert-validation.sh $CERT_ARN"
  exit 0
fi

RECORD_NAME=$(echo "$VALIDATION_INFO" | grep -o '"ResourceRecordName": "[^"]*' | cut -d'"' -f4)
RECORD_VALUE=$(echo "$VALIDATION_INFO" | grep -o '"ResourceRecordValue": "[^"]*' | cut -d'"' -f4)

if [ -z "$RECORD_NAME" ] || [ -z "$RECORD_VALUE" ]; then
  echo "⚠️  No se pudieron extraer los registros de validación"
  echo "   Información completa:"
  echo "$VALIDATION_INFO" | jq '.'
  exit 1
fi

echo ""
echo "📝 Registro DNS a agregar en tu proveedor DNS (grgcrew.com):"
echo "============================================================"
echo ""
echo "Tipo: CNAME"
echo "Nombre: $RECORD_NAME"
echo "Valor: $RECORD_VALUE"
echo "TTL: 300 (o el valor por defecto)"
echo ""

echo "3️⃣  Pasos siguientes:"
echo ""
echo "   a) Agrega el registro CNAME anterior en tu DNS (grgcrew.com)"
echo ""
echo "   b) Espera la validación (puede tardar 5-30 minutos)"
echo "      Verifica el estado con:"
echo "      aws acm describe-certificate --certificate-arn $CERT_ARN --region $REGION"
echo ""
echo "   c) Una vez validado, actualiza terraform.tfvars con:"
echo "      alb_acm_certificate_arn = \"$CERT_ARN\""
echo ""
echo "   d) O simplemente usa el dominio en terraform.tfvars:"
echo "      alb_domain_name = \"$DOMAIN\""
echo ""
echo "   e) Aplica los cambios:"
echo "      cd terraform"
echo "      terraform plan"
echo "      terraform apply"
echo ""

echo "4️⃣  Para apuntar tu dominio al ALB:"
echo ""
echo "   Una vez que el ALB esté configurado con HTTPS, crea un registro A o CNAME:"
echo "   Tipo: A (Alias) o CNAME"
echo "   Nombre: wokibrain"
echo "   Valor: [DNS del ALB - obtén con: terraform output alb_dns_name]"
echo ""



