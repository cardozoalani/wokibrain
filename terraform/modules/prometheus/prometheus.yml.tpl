global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'wokibrain'
    environment: 'production'

scrape_configs:
  # Scrape Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Scrape WokiBrain API via ALB
  # Note: The API exposes metrics on the same port as the API (3000) at /api/v1/metrics
  # We scrape via the ALB which routes to the application port
  - job_name: 'wokibrain-api'
    static_configs:
      - targets:
          - '${alb_dns_name}:80'
        labels:
          job: 'wokibrain-api'
          environment: 'production'
    metrics_path: '/api/v1/metrics'
    scheme: 'http'

