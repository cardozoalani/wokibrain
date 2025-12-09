# ✅ Monitoreo Completo - Grafana + Prometheus

## 🎉 Estado: COMPLETADO

Ambos servicios están corriendo y conectados correctamente.

## 📊 Servicios Desplegados

### Grafana
- **URL**: https://grafana.wokibrain.grgcrew.com
- **Estado**: ✅ Running
- **Usuario**: `admin`
- **Contraseña**: AWS Secrets Manager (`production-wokibrain-grafana-password`)
- **Storage**: EFS con Access Point (`/grafana-v2`)
- **Protocolo interno**: HTTP (ALB maneja HTTPS)

### Prometheus
- **URL Interna**: A través del ALB con Host header
- **Estado**: ✅ Running
- **Storage**: EFS con Access Point (`/prometheus`)
- **Imagen**: ECR (`123456789012.dkr.ecr.us-east-1.amazonaws.com/prometheus:v2.48.0`)
- **Arquitectura**: linux/amd64
- **Scrape Interval**: 15s

## 🔗 Conexión Grafana ↔ Prometheus

### Configuración del Datasource

Grafana se conecta a Prometheus usando:

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://production-wokibrain-alb-XXXXXXXXXX.us-east-1.elb.amazonaws.com
    customHttpHeaders:
      - name: Host
        value: prometheus.wokibrain.grgcrew.com
```

**¿Por qué esta configuración?**
- Ambos servicios están en la misma VPC
- El ALB actúa como proxy interno para HTTP
- El Host header hace que el ALB enrute al target group correcto
- Evita problemas de certificados TLS

## 📈 Dashboard Configurado

### WokiBrain Overview

Dashboard con 8 paneles de métricas:

1. **Requests Per Second** - `rate(http_requests_total[5m])`
2. **P95 Latency** - `histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))`
3. **Error Rate** - `rate(http_requests_total{status_code=~"5.."}[5m])`
4. **Bookings Created** - `rate(bookings_created_total[5m])`
5. **Cache Hit Rate** - Porcentaje de aciertos en caché
6. **Active Connections** - Conexiones activas
7. **Database Connections** - Conexiones a MongoDB
8. **Projection Lag** - Retraso en proyecciones CQRS

## 🔧 Configuración de Prometheus

### Jobs Configurados

```yaml
scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'wokibrain-api'
    static_configs:
      - targets: ['production-wokibrain-alb-XXXXXXXXXX.us-east-1.elb.amazonaws.com:9464']
    metrics_path: '/metrics'
    scheme: 'http'
```

## 🚀 Verificación

### 1. Acceder a Grafana

```bash
# Abrir en el navegador
open https://grafana.wokibrain.grgcrew.com
```

### 2. Verificar Datasource

1. Login con `admin` y la contraseña de Secrets Manager
2. Ve a **Configuration** → **Data Sources** → **Prometheus**
3. Click en **"Test"** → Debería mostrar "✅ Data source is working"

### 3. Ver Dashboard

1. Ve a **Dashboards** → **Browse**
2. Selecciona **"WokiBrain Overview"**
3. Las métricas aparecerán cuando la aplicación genere tráfico

## 🛠️ Soluciones Implementadas

### Problema 1: Grafana 503
- **Causa**: Archivo `grafana.ini` en EFS con configuración HTTPS antigua
- **Solución**: Nuevo EFS Access Point apuntando a `/grafana-v2` (directorio limpio)

### Problema 2: Prometheus Rate Limit Docker Hub
- **Causa**: Límite de pulls anónimos de Docker Hub (100/6h)
- **Solución**: Imagen copiada a ECR privado

### Problema 3: Prometheus "exec format error"
- **Causa**: Imagen ARM64 en Fargate x86_64
- **Solución**: Pull con `--platform linux/amd64`

### Problema 4: Prometheus "permission denied"
- **Causa**: Sin permisos en EFS
- **Solución**: EFS Access Point con UID 65534 (nobody)

### Problema 5: Grafana no puede conectar a Prometheus
- **Causa**: Intentaba usar HTTPS con certificado inválido
- **Solución**: Usar HTTP interno vía ALB con Host header

## 📁 Estructura de Archivos

```
grafana/
├── README.md
├── dashboards/
│   └── wokibrain-overview.json
└── provisioning/
    ├── datasources/
    │   └── prometheus.yaml
    └── dashboards/
        └── dashboard.yaml

terraform/
├── modules/
│   ├── grafana/
│   │   ├── main.tf (con provisioning automático)
│   │   └── variables.tf
│   └── prometheus/
│       ├── main.tf (con EFS Access Point)
│       ├── variables.tf
│       └── prometheus.yml.tpl
└── GRAFANA_PROMETHEUS_CONNECTION.md
```

## 🎯 Próximos Pasos

1. ✅ Acceder a Grafana y verificar el datasource
2. ✅ Ver el dashboard "WokiBrain Overview"
3. ⏳ Generar tráfico en la API para ver métricas
4. ⏳ Configurar alertas en Grafana (opcional)
5. ⏳ Agregar más dashboards según necesidades

## 📝 Comandos Útiles

### Verificar estado de los servicios
```bash
aws ecs describe-services --cluster production-wokibrain-cluster \
  --services production-wokibrain-grafana production-wokibrain-prometheus \
  --region us-east-1 \
  --query 'services[*].{Name:serviceName,Running:runningCount,Desired:desiredCount}'
```

### Ver logs
```bash
# Grafana
aws logs tail /ecs/production-wokibrain-grafana --since 10m --region us-east-1

# Prometheus
aws logs tail /ecs/production-wokibrain-prometheus --since 10m --region us-east-1
```

### Forzar nuevo despliegue
```bash
# Grafana
aws ecs update-service --cluster production-wokibrain-cluster \
  --service production-wokibrain-grafana --force-new-deployment --region us-east-1

# Prometheus
aws ecs update-service --cluster production-wokibrain-cluster \
  --service production-wokibrain-prometheus --force-new-deployment --region us-east-1
```

## 🎊 ¡Monitoreo Completo y Funcional!

- ✅ Grafana: Funcionando
- ✅ Prometheus: Funcionando
- ✅ Datasource: Conectado
- ✅ Dashboard: Aprovisionado
- ✅ HTTPS: Configurado
- ✅ Storage: Persistente en EFS
- ✅ Arquitectura: Correcta (x86_64)


