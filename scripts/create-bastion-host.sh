#!/bin/bash

# Script para crear un bastion host temporal para conectarse a DocumentDB

set -e

ENVIRONMENT="${ENVIRONMENT:-production}"
REGION="${AWS_REGION:-us-east-1}"
KEY_NAME="${KEY_NAME:-wokibrain-bastion}"

echo "🏗️  Creando bastion host temporal..."
echo ""

# Obtener VPC ID y subnet pública
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=${ENVIRONMENT}-wokibrain-vpc" \
  --region "${REGION}" \
  --query 'Vpcs[0].VpcId' \
  --output text)

PUBLIC_SUBNET=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=${ENVIRONMENT}-wokibrain-public-subnet-1" \
  --region "${REGION}" \
  --query 'Subnets[0].SubnetId' \
  --output text)

# Crear security group para bastion
echo "🔒 Creando security group para bastion..."
BASTION_SG=$(aws ec2 create-security-group \
  --group-name "${ENVIRONMENT}-wokibrain-bastion-sg" \
  --description "Security group for bastion host" \
  --vpc-id "${VPC_ID}" \
  --region "${REGION}" \
  --query 'GroupId' \
  --output text)

# Permitir SSH desde tu IP
MY_IP=$(curl -s https://checkip.amazonaws.com)
echo "📍 Tu IP: ${MY_IP}"

aws ec2 authorize-security-group-ingress \
  --group-id "${BASTION_SG}" \
  --protocol tcp \
  --port 22 \
  --cidr "${MY_IP}/32" \
  --region "${REGION}"

# Obtener security group de DocumentDB
DOCDB_SG=$(aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=${ENVIRONMENT}-wokibrain-documentdb-sg" \
  --region "${REGION}" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Permitir conexiones desde bastion a DocumentDB
aws ec2 authorize-security-group-ingress \
  --group-id "${DOCDB_SG}" \
  --protocol tcp \
  --port 27017 \
  --source-group "${BASTION_SG}" \
  --region "${REGION}"

# Crear key pair si no existe
if ! aws ec2 describe-key-pairs --key-names "${KEY_NAME}" --region "${REGION}" 2>/dev/null; then
  echo "🔑 Creando key pair..."
  aws ec2 create-key-pair \
    --key-name "${KEY_NAME}" \
    --region "${REGION}" \
    --query 'KeyMaterial' \
    --output text > "${KEY_NAME}.pem"
  chmod 400 "${KEY_NAME}.pem"
  echo "✅ Key pair creado: ${KEY_NAME}.pem"
fi

# Crear instancia EC2
echo "🖥️  Creando instancia EC2..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --subnet-id "${PUBLIC_SUBNET}" \
  --security-group-ids "${BASTION_SG}" \
  --key-name "${KEY_NAME}" \
  --associate-public-ip-address \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${ENVIRONMENT}-wokibrain-bastion},{Key=Environment,Value=${ENVIRONMENT}}]" \
  --region "${REGION}" \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "⏳ Esperando a que la instancia esté lista..."
aws ec2 wait instance-running --instance-ids "${INSTANCE_ID}" --region "${REGION}"

# Obtener IP pública
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "${INSTANCE_ID}" \
  --region "${REGION}" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo ""
echo "✅ Bastion host creado exitosamente!"
echo ""
echo "📋 Información:"
echo "   Instance ID: ${INSTANCE_ID}"
echo "   Public IP: ${PUBLIC_IP}"
echo "   Key File: ${KEY_NAME}.pem"
echo ""
echo "🔌 Para conectarte a DocumentDB:"
echo "   1. Espera 2-3 minutos para que la instancia termine de inicializar"
echo "   2. Ejecuta el script de conexión: ./scripts/connect-to-documentdb.sh"
echo ""
echo "🗑️  Para eliminar el bastion host:"
echo "   aws ec2 terminate-instances --instance-ids ${INSTANCE_ID} --region ${REGION}"



