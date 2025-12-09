#!/bin/bash
# Script rápido para obtener información de DocumentDB

ENVIRONMENT="${ENVIRONMENT:-production}"
REGION="${AWS_REGION:-us-east-1}"

echo "📋 Información de DocumentDB"
echo "================================"
echo ""

# Endpoint
echo "🔗 Endpoint:"
aws docdb describe-db-clusters \
  --db-cluster-identifier "${ENVIRONMENT}-wokibrain-documentdb" \
  --region "${REGION}" \
  --query 'DBClusters[0].Endpoint' \
  --output text

echo ""

# Credenciales
echo "🔑 Credenciales:"
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "${ENVIRONMENT}-wokibrain-documentdb-password" \
  --region "${REGION}" \
  --query 'SecretString' \
  --output text)

echo "Username: $(echo $SECRET | jq -r '.username')"
echo "Password: $(echo $SECRET | jq -r '.password')"

echo ""
echo "📝 Connection String:"
DOCDB_ENDPOINT=$(aws docdb describe-db-clusters \
  --db-cluster-identifier "${ENVIRONMENT}-wokibrain-documentdb" \
  --region "${REGION}" \
  --query 'DBClusters[0].Endpoint' \
  --output text)

USERNAME=$(echo $SECRET | jq -r '.username')
PASSWORD=$(echo $SECRET | jq -r '.password')

echo "mongodb://${USERNAME}:${PASSWORD}@${DOCDB_ENDPOINT}:27017/wokibrain?tls=true&replicaSet=rs0&authSource=admin&authMechanism=SCRAM-SHA-1"
