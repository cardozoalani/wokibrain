#!/bin/bash

# Script para conectarse a DocumentDB desde tu PC local
# Requiere: AWS CLI, SSH, y un bastion host o usar AWS Systems Manager

set -e

ENVIRONMENT="${ENVIRONMENT:-production}"
REGION="${AWS_REGION:-us-east-1}"

echo "🔌 Conectándose a DocumentDB..."
echo ""

# Obtener información de DocumentDB
echo "📋 Obteniendo información de DocumentDB..."
DOCDB_ENDPOINT=$(aws docdb describe-db-clusters \
  --db-cluster-identifier "${ENVIRONMENT}-wokibrain-documentdb" \
  --region "${REGION}" \
  --query 'DBClusters[0].Endpoint' \
  --output text)

DOCDB_PORT=27017

# Obtener credenciales desde Secrets Manager
echo "🔑 Obteniendo credenciales..."
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "${ENVIRONMENT}-wokibrain-documentdb-password" \
  --region "${REGION}" \
  --query 'SecretString' \
  --output text)

DOCDB_USERNAME=$(echo $SECRET | jq -r '.username')
DOCDB_PASSWORD=$(echo $SECRET | jq -r '.password')

echo ""
echo "✅ Información obtenida:"
echo "   Endpoint: $DOCDB_ENDPOINT"
echo "   Port: $DOCDB_PORT"
echo "   Username: $DOCDB_USERNAME"
echo ""

# Método 1: Usando AWS Systems Manager Session Manager (Recomendado)
echo "🚀 Método 1: Usando AWS Systems Manager Session Manager"
echo ""
echo "Para usar este método, necesitas:"
echo "1. Instalar AWS Session Manager Plugin: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
echo "2. Tener una instancia EC2 en la VPC con el agente SSM instalado"
echo ""
echo "Comando para port forwarding:"
echo "aws ssm start-session --target <INSTANCE_ID> --region ${REGION} --document-name AWS-StartPortForwardingSession --parameters '{\"portNumber\":[\"${DOCDB_PORT}\"],\"localPortNumber\":[\"27017\"]}'"
echo ""

# Método 2: Usando SSH a través de un bastion host
echo "🔐 Método 2: Usando SSH a través de un bastion host"
echo ""
echo "Si tienes un bastion host configurado:"
echo "ssh -L 27017:${DOCDB_ENDPOINT}:${DOCDB_PORT} ec2-user@<BASTION_IP> -i <KEY_FILE>"
echo ""

# Método 3: Usando mongosh directamente (si tienes acceso)
echo "📊 Método 3: Conexión directa (después de establecer túnel)"
echo ""
echo "Una vez establecido el túnel, puedes conectarte con:"
echo "mongosh 'mongodb://${DOCDB_USERNAME}:${DOCDB_PASSWORD}@localhost:27017/wokibrain?tls=true&replicaSet=rs0&authSource=admin' --tlsCAFile certs/rds-ca-bundle.pem"
echo ""

# Método 4: Crear un bastion host temporal
echo "🏗️  Método 4: Crear un bastion host temporal"
echo ""
echo "Para crear un bastion host temporal, ejecuta:"
echo "./scripts/create-bastion-host.sh"
echo ""

echo "📝 Nota: Asegúrate de que el security group de DocumentDB permita conexiones desde tu bastion host."



