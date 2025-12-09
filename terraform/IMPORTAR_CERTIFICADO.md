# 📥 Importar Certificado ACM Existente a Terraform

## 🎯 Objetivo

Importar el certificado ACM existente al estado de Terraform para que Terraform lo gestione.

## 📋 Pasos

### 1. Verificar la Configuración

La configuración en `terraform.tfvars` ahora es:
```hcl
alb_domain_name = "wokibrain.grgcrew.com"
alb_subject_alternative_names = ["*.grgcrew.com"]
alb_create_route53_validation = true
```

### 2. Importar el Certificado Existente

El certificado ya existe en AWS con el ARN:
```
arn:aws:acm:us-east-1:123456789012:certificate/abc123def456-ghij-klmn-opqr-stuvwxyz123456
```

Importarlo al estado de Terraform:

```bash
cd terraform

# Primero, verificar que el módulo no existe en el estado (o removerlo si existe)
terraform state list | grep alb_acm

# Si existe, removerlo primero (pero NO destruir el certificado real)
# terraform state rm 'module.alb_acm[0].aws_acm_certificate.main'

# Importar el certificado existente
terraform import 'module.alb_acm[0].aws_acm_certificate.main' \
  arn:aws:acm:us-east-1:123456789012:certificate/abc123def456-ghij-klmn-opqr-stuvwxyz123456
```

### 3. Verificar el Plan

Después de importar, verifica que Terraform reconoce el certificado:

```bash
terraform plan -lock=false | grep -i "certificate\|alb_acm"
```

Deberías ver que Terraform reconoce el certificado existente y no intenta crearlo ni destruirlo.

### 4. Aplicar los Cambios

Si el plan se ve bien, aplica los cambios:

```bash
terraform apply -lock=false
```

## ⚠️ Importante

- **El certificado NO se destruirá**: Al importarlo, Terraform solo lo agregará a su estado
- **Los registros de validación**: Si `alb_create_route53_validation = true`, Terraform puede intentar crear registros de validación, pero como el certificado ya está validado, esto no debería ser necesario
- **El certificado seguirá funcionando**: No habrá interrupciones

## 🔍 Verificación Post-Importación

```bash
# Verificar que el certificado está en el estado
terraform state show 'module.alb_acm[0].aws_acm_certificate.main'

# Verificar que el certificado sigue existiendo en AWS
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc123def456-ghij-klmn-opqr-stuvwxyz123456 \
  --region us-east-1 \
  --query 'Certificate.Status'
```

## 📝 Notas

- Si el certificado ya está en el estado pero con un ARN diferente, primero remueve el recurso del estado antes de importar
- Si hay registros de validación DNS en el estado, también necesitarás importarlos o removerlos según corresponda
- El certificado debe estar en la misma región que el ALB (us-east-1)



