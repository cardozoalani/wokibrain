#!/bin/bash

# Script para obtener los registros de validación de un certificado ACM

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Debes proporcionar el ARN del certificado"
  echo ""
  echo "Uso: $0 <certificate-arn> [region]"
  echo "Ejemplo: $0 arn:aws:acm:us-east-1:123456789012:certificate/abc123 us-east-1"
  exit 1
fi

CERT_ARN=$1
REGION="${2:-us-east-1}"

echo "🔍 Obteniendo registros de validación para:"
echo "   $CERT_ARN"
echo ""

VALIDATION_INFO=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region "$REGION" \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value,ResourceRecord.Type]' \
  --output table 2>&1)

if [[ $VALIDATION_INFO == *"error"* ]]; then
  echo "❌ Error al obtener información del certificado:"
  echo "$VALIDATION_INFO"
  exit 1
fi

echo "$VALIDATION_INFO"
echo ""

# Extraer información en formato más legible
echo "📝 Registros DNS a agregar:"
echo "============================"
echo ""

aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region "$REGION" \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value]' \
  --output text | while read DOMAIN NAME VALUE; do
  echo "Dominio: $DOMAIN"
  echo "  Tipo: CNAME"
  echo "  Nombre: $NAME"
  echo "  Valor: $VALUE"
  echo ""
done

# Verificar estado
STATUS=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region "$REGION" \
  --query 'Certificate.Status' \
  --output text)

echo "Estado del certificado: $STATUS"
if [ "$STATUS" = "ISSUED" ]; then
  echo "✅ Certificado validado y listo para usar"
elif [ "$STATUS" = "PENDING_VALIDATION" ]; then
  echo "⏳ Esperando validación DNS - agrega los registros CNAME arriba"
else
  echo "⚠️  Estado: $STATUS"
fi



