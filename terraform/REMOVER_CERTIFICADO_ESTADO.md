# 🔧 Remover Certificado ACM del Estado de Terraform

## ❌ Problema

Terraform está intentando destruir el certificado ACM porque:
- El certificado está en el estado de Terraform como si fuera creado por Terraform
- Pero en realidad es tu certificado existente que ya tenías antes
- Al cambiar la configuración para usar `alb_acm_certificate_arn`, Terraform ve que el módulo `alb_acm[0]` ya no debería existir
- Por lo tanto intenta destruir el recurso, pero falla porque el certificado está en uso

## ✅ Solución

Necesitamos **remover el certificado del estado de Terraform** sin destruirlo realmente. Esto le dice a Terraform "ya no gestiono este recurso, pero no lo destruyas".

### Paso 1: Verificar el ARN del Certificado

El certificado en el estado debe ser el mismo que estás usando:

```bash
terraform state show 'module.alb_acm[0].aws_acm_certificate.main' | grep "arn ="
```

Debería mostrar: `arn:aws:acm:us-east-1:123456789012:certificate/abc123def456-ghij-klmn-opqr-stuvwxyz123456`

### Paso 2: Remover del Estado (SIN destruir)

```bash
cd terraform
terraform state rm 'module.alb_acm[0].aws_acm_certificate.main'
```

Si hay otros recursos relacionados (como registros de validación), también hay que removerlos:

```bash
# Ver todos los recursos del módulo ACM
terraform state list | grep alb_acm

# Remover todos los recursos del módulo ACM
terraform state rm 'module.alb_acm[0].aws_acm_certificate.main'
terraform state rm 'module.alb_acm[0].aws_route53_record.validation'  # Si existen
```

### Paso 3: Verificar el Plan

Después de remover del estado, verifica que ya no intente destruir el certificado:

```bash
terraform plan -lock=false | grep -i "destroy\|certificate"
```

No debería aparecer nada sobre destruir el certificado.

### Paso 4: Aplicar los Cambios

Ahora puedes aplicar los cambios normalmente:

```bash
terraform apply -lock=false
```

## ⚠️ Importante

- **NO destruye el certificado real**: `terraform state rm` solo lo remueve del estado de Terraform, no lo destruye en AWS
- **El certificado sigue funcionando**: Como estás usando `alb_acm_certificate_arn`, el certificado seguirá siendo usado por el ALB
- **Terraform ya no lo gestiona**: Después de esto, Terraform no intentará crear, modificar o destruir este certificado

## 🔍 Verificación Post-Aplicación

Después de aplicar, verifica que el certificado sigue existiendo y está en uso:

```bash
# Verificar que el certificado existe
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc123def456-ghij-klmn-opqr-stuvwxyz123456 \
  --region us-east-1 \
  --query 'Certificate.Status'

# Verificar que el listener HTTPS lo está usando
aws elbv2 describe-listeners \
  --load-balancer-arn $(aws elbv2 describe-load-balancers \
    --query 'LoadBalancers[?contains(LoadBalancerName, `production-wokibrain`)].LoadBalancerArn' \
    --output text) \
  --query 'Listeners[?Port==`443`].Certificates[0].CertificateArn' \
  --output text
```



