# 🔗 Conexión Grafana ↔ Prometheus

## Estado Actual

### ✅ Prometheus
- **Estado**: Running
- **URL Pública**: https://prometheus.wokibrain.grgcrew.com (404 - sin regla HTTPS)
- **URL Interna**: http://prometheus-interno:9090 (a través del ALB)
- **Logs**: "Server is ready to receive web requests" ✅

### ✅ Grafana
- **Estado**: Running
- **URL**: https://grafana.wokibrain.grgcrew.com
- **Dashboard**: WokiBrain Overview configurado

## Configuración del Datasource

Grafana se conecta a Prometheus usando el **ALB interno** con:

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://production-wokibrain-alb-XXXXXXXXXX.us-east-1.elb.amazonaws.com
    customHttpHeaders:
      Host: prometheus.wokibrain.grgcrew.com
```

### ¿Por qué esta configuración?

1. **Grafana y Prometheus están en la misma VPC**
2. **El ALB actúa como proxy interno** para el tráfico HTTP
3. **El Host header** hace que el ALB enrute correctamente al target group de Prometheus

## Verificación de Conectividad

### Desde Grafana

1. **Accede a Grafana**: https://grafana.wokibrain.grgcrew.com
2. **Ve a Configuration → Data Sources**
3. **Click en "Prometheus"**
4. **Click en "Test"** - Debería mostrar "Data source is working"

### Desde los Logs

```bash
# Ver si Prometheus está respondiendo
aws logs tail /ecs/production-wokibrain-prometheus --since 5m --region us-east-1

# Ver si Grafana puede conectarse
aws logs tail /ecs/production-wokibrain-grafana --since 5m --region us-east-1 | grep prometheus
```

## Dashboard Aprovisionado

El dashboard **"WokiBrain Overview"** incluye:

- 📊 Requests Per Second
- ⏱️ P95 Latency
- ❌ Error Rate
- 📅 Bookings Created
- 💾 Cache Hit Rate
- 🔌 Active Connections
- 🗄️ Database Connections
- ⏰ Projection Lag

### Métricas Esperadas

Las métricas son exportadas por la aplicación en:
- **Endpoint**: http://<alb>:9464/metrics
- **Job en Prometheus**: `wokibrain-api`

## Troubleshooting

### Datasource muestra "Error"

1. **Verifica que Prometheus esté corriendo**:
   ```bash
   aws ecs describe-services --cluster production-wokibrain-cluster \
     --services production-wokibrain-prometheus --region us-east-1 \
     --query 'services[0].{Running:runningCount}'
   ```

2. **Verifica el Target Group de Prometheus**:
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn $(aws elbv2 describe-target-groups \
       --query 'TargetGroups[?contains(TargetGroupName, `prom`)].TargetGroupArn' \
       --output text --region us-east-1) \
     --region us-east-1
   ```

3. **Verifica los logs de Grafana**:
   ```bash
   aws logs tail /ecs/production-wokibrain-grafana --since 10m --region us-east-1 \
     | grep -i "prometheus\|datasource"
   ```

### Dashboard no muestra datos

1. **Verifica que la aplicación esté exportando métricas**:
   ```bash
   curl http://<alb-dns>:9464/metrics
   ```

2. **Verifica que Prometheus esté scrapeando**:
   - Accede a Prometheus UI (cuando esté accesible vía HTTPS)
   - Ve a Status → Targets
   - Verifica que `wokibrain-api` esté UP

## Próximos Pasos

1. ✅ Prometheus corriendo con EFS Access Point
2. ✅ Grafana corriendo con dashboard aprovisionado
3. ✅ Datasource configurado con ALB interno
4. ⏳ Verificar conectividad en Grafana UI
5. ⏳ Verificar que las métricas fluyan correctamente

## Arquitectura de Conectividad

```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Grafana   │────────>│  ALB (interno)  │────────>│  Prometheus  │
│  Container  │  HTTP   │  Host: prom...  │  HTTP   │  Container   │
│ :3000       │         │                 │  :9090  │              │
└─────────────┘         └─────────────────┘         └──────────────┘
```

**Nota**: Ambos servicios están en la misma VPC y pueden comunicarse a través del ALB usando el tráfico HTTP interno.


