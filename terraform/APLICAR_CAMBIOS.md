# 🚀 Guía para Aplicar Cambios de Terraform

## ✅ Estado Actual

**Errores corregidos**: Los problemas con `count` y `for_each` han sido resueltos. La configuración está lista para aplicar.

## 📋 Pasos para Aplicar los Cambios

### 1. **Revisar el Plan** (Recomendado)

```bash
cd terraform
terraform plan -lock=false
```

Esto te mostrará:
- ✅ Qué recursos se crearán (listener HTTPS)
- ⚠️ Qué recursos se modificarán
- 🗑️ Qué recursos se destruirán (registros de validación DNS - ya no necesarios)

**Importante**: Verifica que:
- ✅ Se creará el listener HTTPS con tu certificado existente
- ✅ Se destruirán los registros de validación DNS (ya no necesarios, certificado ya validado)
- ✅ No se crearán nuevos certificados

### 2. **Aplicar los Cambios**

```bash
terraform apply -lock=false
```

O si quieres aprobar automáticamente:

```bash
terraform apply -lock=false -auto-approve
```

### 3. **Verificar el Estado**

Después de aplicar, verifica que todo esté funcionando:

```bash
# Ver outputs
terraform output

# Verificar listeners del ALB
aws elbv2 describe-listeners \
  --load-balancer-arn $(aws elbv2 describe-load-balancers \
    --query 'LoadBalancers[?contains(LoadBalancerName, `production-wokibrain`)].LoadBalancerArn' \
    --output text) \
  --query 'Listeners[*].{Port:Port,Protocol:Protocol,Certificate:Certificates[0].CertificateArn}'
```

### 4. **Probar Endpoints HTTPS**

Una vez aplicado, prueba los endpoints:

```bash
# API Principal
curl -I https://wokibrain.grgcrew.com/api/v1/health

# Grafana
curl -I https://grafana.wokibrain.grgcrew.com

# Prometheus
curl -I https://prometheus.wokibrain.grgcrew.com/-/healthy
```

## ⚠️ Notas Importantes

1. **Lock del State**: Si trabajas en equipo, usa `-lock=false` solo si estás seguro de que nadie más está aplicando cambios.

2. **Tiempo de Aplicación**: El apply puede tardar varios minutos, especialmente si hay cambios en ECS.

3. **Downtime**: Los cambios en el ALB listener no deberían causar downtime, pero los servicios ECS pueden reiniciarse.

4. **Verificación Post-Aplicación**: Después del apply, espera 2-3 minutos y verifica que los servicios estén corriendo:

```bash
# Ver estado de servicios ECS
aws ecs describe-services \
  --cluster production-wokibrain-cluster \
  --services production-wokibrain-service production-wokibrain-grafana production-wokibrain-prometheus \
  --query 'services[*].{Service:serviceName,Status:status,Desired:desiredCount,Running:runningCount}'
```

## 🔄 Si Algo Sale Mal

Si necesitas revertir:

```bash
# Ver el último estado
terraform show

# Revertir a un estado anterior (si tienes backup)
terraform state pull > backup.tfstate
```

## ✅ Checklist Pre-Aplicación

- [ ] Revisé el plan de Terraform
- [ ] Verifiqué que el certificado ACM existe y está validado
- [ ] Confirmé que no hay otros cambios en progreso
- [ ] Tengo acceso a AWS CLI configurado
- [ ] Sé cómo verificar los servicios después del apply

