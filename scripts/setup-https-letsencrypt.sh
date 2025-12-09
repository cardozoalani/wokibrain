#!/bin/bash

# Script para configurar HTTPS usando Let's Encrypt y subirlo a ACM
# Requiere: dominio propio, acme.sh instalado, y credenciales de AWS

set -e

ENVIRONMENT="${ENVIRONMENT:-production}"
REGION="${AWS_REGION:-us-east-1}"

echo "🔒 Configuración de HTTPS con Let's Encrypt"
echo "============================================="
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

# Verificar que acme.sh esté instalado
if ! command -v acme.sh &> /dev/null; then
  echo "❌ acme.sh no está instalado"
  echo ""
  echo "Instálalo con:"
  echo "  curl https://get.acme.sh | sh"
  exit 1
fi

# Verificar credenciales de AWS
if ! aws sts get-caller-identity &> /dev/null; then
  echo "❌ Error: No hay credenciales de AWS configuradas"
  exit 1
fi

echo "1️⃣  Obteniendo certificado de Let's Encrypt..."
echo "   (Esto puede tardar unos minutos)"
echo ""

# Obtener certificado usando DNS validation
acme.sh --issue --dns dns_aws \
  -d "$DOMAIN" \
  --keylength ec-256 \
  --email "$EMAIL" \
  --force

if [ $? -ne 0 ]; then
  echo "❌ Error al obtener certificado"
  exit 1
fi

echo ""
echo "2️⃣  Preparando certificado para ACM..."

# Crear archivos temporales
TMP_DIR=$(mktemp -d)
CERT_FILE="$TMP_DIR/cert.pem"
KEY_FILE="$TMP_DIR/key.pem"
CHAIN_FILE="$TMP_DIR/chain.pem"

# Obtener rutas del certificado
ACME_HOME="$HOME/.acme.sh"
CERT_PATH="$ACME_HOME/$DOMAIN"

# Copiar certificados
cp "$CERT_PATH/fullchain.cer" "$CERT_FILE"
cp "$CERT_PATH/$DOMAIN.key" "$KEY_FILE"
cp "$CERT_PATH/ca.cer" "$CHAIN_FILE"

echo "3️⃣  Importando certificado a ACM..."

CERT_ARN=$(aws acm import-certificate \
  --certificate "fileb://$CERT_FILE" \
  --private-key "fileb://$KEY_FILE" \
  --certificate-chain "fileb://$CHAIN_FILE" \
  --region "$REGION" \
  --query 'CertificateArn' \
  --output text)

if [ -z "$CERT_ARN" ]; then
  echo "❌ Error al importar certificado a ACM"
  rm -rf "$TMP_DIR"
  exit 1
fi

# Limpiar archivos temporales
rm -rf "$TMP_DIR"

echo ""
echo "✅ Certificado importado exitosamente!"
echo ""
echo "📋 Información:"
echo "   Certificate ARN: $CERT_ARN"
echo ""
echo "4️⃣  Actualiza terraform.tfvars:"
echo "   echo 'acm_certificate_arn = \"$CERT_ARN\"' >> terraform/terraform.tfvars"
echo ""
echo "5️⃣  Aplica cambios:"
echo "   cd terraform && terraform apply"
echo ""
echo "🔄 Para renovación automática, configura un cron job:"
echo "   acme.sh --install-cronjob"



