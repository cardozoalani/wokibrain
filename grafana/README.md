# Grafana Dashboard - WokiBrain

## 🔗 Acceso

- **URL**: https://grafana.wokibrain.grgcrew.com
- **Usuario**: `admin`
- **Contraseña**: Configurada en `grafana_admin_password` (variable de Terraform)

## 📊 Dashboards Disponibles

### WokiBrain Overview

Dashboard principal con métricas clave del sistema:

- **Requests Per Second**: Tasa de solicitudes HTTP por método y ruta
- **P95 Latency**: Latencia percentil 95 por ruta
- **Error Rate**: Tasa de errores 5xx
- **Bookings Created**: Tasa de creación de reservas por restaurante
- **Cache Hit Rate**: Porcentaje de aciertos en caché
- **Active Connections**: Conexiones activas
- **Database Connections**: Conexiones activas a la base de datos
- **Projection Lag**: Retraso en las proyecciones CQRS

## 🔧 Configuración

### Datasource

- **Prometheus**: Configurado automáticamente apuntando a `http://prometheus.wokibrain.internal:9090` (Service Discovery)
- **Intervalo de scraping**: 15s
- **Método**: HTTP GET
- **Comunicación interna**: Usa Service Discovery (AWS Cloud Map) para resolución DNS dentro de la VPC

### Provisioning Automático

Los dashboards y datasources se aprovisionan automáticamente al iniciar el contenedor mediante:

- `/etc/grafana/provisioning/datasources/prometheus.yaml`
- `/etc/grafana/provisioning/dashboards/dashboard.yaml`
- `/var/lib/grafana/dashboards/wokibrain-overview.json`

## 📁 Estructura

```
grafana/
├── README.md                           # Este archivo
├── dashboards/
│   └── wokibrain-overview.json        # Dashboard principal (referencia)
└── provisioning/
    ├── datasources/
    │   └── prometheus.yaml             # Configuración de Prometheus
    └── dashboards/
        └── dashboard.yaml              # Configuración de provisioning
```

## 🚀 Despliegue

El dashboard se despliega automáticamente con Terraform en ECS Fargate:

- **Módulo**: `terraform/modules/grafana/`
- **Storage**: EFS con Access Point en `/grafana-v3`
- **Protocolo interno**: HTTP (el ALB maneja HTTPS)
- **Service Discovery**: Integrado con AWS Cloud Map para comunicación interna con Prometheus
- **IAM Roles**: Permisos para EFS, Secrets Manager, y CloudWatch

### Actualizar Dashboard

Para actualizar el dashboard:

1. Edita el archivo `grafana/dashboards/wokibrain-overview.json`
2. Actualiza el script en `terraform/modules/grafana/main.tf` (sección `command`)
3. Aplica los cambios:
   ```bash
   cd terraform
   terraform apply -target='module.grafana[0].aws_ecs_task_definition.grafana'
   aws ecs update-service --cluster production-wokibrain-cluster \
     --service production-wokibrain-grafana --force-new-deployment --region us-east-1
   ```

## 📈 Métricas Disponibles

Las métricas son exportadas por la aplicación en el endpoint `/metrics` y scrapeadas por Prometheus cada 15 segundos.

### HTTP Metrics

- `http_requests_total`: Total de requests HTTP
- `http_request_duration_ms_bucket`: Histograma de duración de requests

### Business Metrics

- `bookings_created_total`: Total de reservas creadas
- `cache_hits_total`: Total de aciertos en caché
- `cache_misses_total`: Total de fallos en caché

### System Metrics

- `active_connections`: Conexiones activas
- `database_connections_active`: Conexiones activas a la base de datos
- `projection_lag_seconds`: Retraso en proyecciones CQRS

## 🔐 Seguridad

- **HTTPS**: Terminación SSL/TLS en el ALB
- **Autenticación**: Usuario/contraseña almacenada en Secrets Manager
- **Red**: Acceso solo a través del ALB (no expuesto directamente)
- **EFS**: Encriptado en tránsito y en reposo

## 🐛 Troubleshooting

### Dashboard no aparece

1. Verifica los logs del contenedor:

   ```bash
   aws logs tail /ecs/production-wokibrain-grafana --since 10m --region us-east-1
   ```

2. Verifica que el archivo JSON esté en el EFS:
   ```bash
   # Conectarse al contenedor y verificar
   ls -la /var/lib/grafana/dashboards/
   ```

### Prometheus no conecta

1. Verifica que Prometheus esté corriendo:

   ```bash
   curl -I https://prometheus.wokibrain.grgcrew.com/-/healthy
   ```

2. Verifica el datasource en Grafana:
   - Configuration → Data Sources → Prometheus
   - Click "Test" para verificar conectividad

### Error 503

- El servicio está reiniciando o no hay tareas corriendo
- Verifica el estado del servicio ECS:
  ```bash
  aws ecs describe-services --cluster production-wokibrain-cluster \
    --services production-wokibrain-grafana --region us-east-1
  ```

## 📚 Referencias

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/)
