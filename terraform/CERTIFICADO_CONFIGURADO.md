# ✅ Certificado ACM Configurado

## Estado Actual

**Certificado ACM Existente**:
- **ARN**: `arn:aws:acm:us-east-1:123456789012:certificate/abc123def456-ghij-klmn-opqr-stuvwxyz123456`
- **Estado**: ✅ **ISSUED** (Validado y listo para usar)
- **Dominios cubiertos**:
  - ✅ `wokibrain.grgcrew.com` (principal)
  - ✅ `grafana.wokibrain.grgcrew.com`
  - ✅ `prometheus.wokibrain.grgcrew.com`
  - ✅ `*.grgcrew.com` (wildcard)

## Configuración Actualizada

Terraform ahora está configurado para:
- ✅ **Usar el certificado existente** en lugar de crear uno nuevo
- ✅ **No crear registros de validación** (ya está validado)
- ✅ **Usar el mismo certificado** para todos los servicios (API, Grafana, Prometheus)

## Cambios Realizados

1. **`terraform.tfvars`**:
   - `alb_acm_certificate_arn` = ARN del certificado existente
   - `alb_domain_name` = "" (vacío para usar certificado existente)
   - `alb_create_route53_validation` = false (no necesario)

2. **`main.tf`**:
   - `create_acm_certificate` ahora verifica si hay un ARN existente antes de crear uno nuevo

## Próximos Pasos

1. ✅ **Ejecutar `terraform plan`** para verificar que no se creará un nuevo certificado
2. ✅ **Ejecutar `terraform apply`** para actualizar la configuración
3. ✅ **Verificar HTTPS** en todos los endpoints:
   - https://wokibrain.grgcrew.com/api/v1/health
   - https://grafana.wokibrain.grgcrew.com
   - https://prometheus.wokibrain.grgcrew.com

## Verificación

```bash
# Verificar que el certificado está en uso
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc123def456-ghij-klmn-opqr-stuvwxyz123456 \
  --region us-east-1 \
  --query 'Certificate.{Status:Status,Domain:DomainName,SANs:SubjectAlternativeNames}'

# Verificar listeners del ALB
aws elbv2 describe-listeners \
  --load-balancer-arn $(aws elbv2 describe-load-balancers \
    --query 'LoadBalancers[?contains(LoadBalancerName, `production-wokibrain`)].LoadBalancerArn' \
    --output text) \
  --query 'Listeners[*].{Port:Port,Protocol:Protocol,Certificate:Certificates[0].CertificateArn}'
```

## Nota Importante

El certificado ya está **validado y listo para usar**. No necesitas crear registros de validación DNS adicionales. Todos los dominios están cubiertos por el certificado existente.



