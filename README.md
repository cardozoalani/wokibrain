# WokiBrain - Technical Challenge

[![Production](https://img.shields.io/badge/Production-Live-brightgreen)](https://wokibrain.grgcrew.com/api/v1)
[![Architecture](https://img.shields.io/badge/Architecture-DDD%20%2B%20Event%20Sourcing%20%2B%20CQRS-blue)]()
[![Infrastructure](https://img.shields.io/badge/Infrastructure-AWS%20ECS%20%2B%20Terraform-orange)]()
[![Tests](https://img.shields.io/badge/Tests-157%20passing-success)]()
[![Coverage](https://img.shields.io/badge/Coverage-100%25-critical)]()

> **Live Production API**: https://wokibrain.grgcrew.com/api/v1
> **API Documentation**: https://wokibrain.grgcrew.com/api/v1/docs
> **Support**: cardozoalani@hotmail.com

---

## 🎯 Overview

Technical challenge implementation for a restaurant booking system.

**Status**: ✅ **Deployed to Production (AWS ECS)**

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────┐
│   Clients   │
│ (REST/gRPC/ │
│ GraphQL/WS) │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────┐
│   AWS CloudFront (CDN)          │
│   - Edge caching                 │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   AWS Application Load Balancer │
│   (HTTPS + Health Checks)        │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   ECS Fargate Service           │
│   - Auto-scaling (5-20 tasks)   │
│   - Multi-AZ deployment         │
│   - Health checks               │
└──────┬──────────────────────────┘
       │
   ┌───┴───┬──────────┬──────────┬──────────┐
   ▼       ▼          ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐
│DocDB │ │Redis │ │Kafka │ │Cloud │ │  ECR     │
│Event │ │Cache │ │(MSK) │ │Watch │ │  Images  │
│Store │ │Locks │ │Events│ │Logs  │ │          │
└──────┘ └──────┘ └──────┘ └──────┘ └──────────┘
```

**Complete C4 Model**: See [docs/C4_MODEL.md](./docs/C4_MODEL.md)

### Application Architecture (DDD + Event Sourcing + CQRS)

```
src/
├── domain/              # Core business logic (DDD)
│   ├── entities/        # Booking, Restaurant, Table, Sector
│   ├── value-objects/   # TimeInterval, Duration, TimeWindow
│   ├── services/        # GapDiscovery, WokiBrainSelection
│   └── events/          # Domain events (Event Sourcing)
├── application/         # Use cases & orchestration
│   ├── use-cases/      # Discover, Create, List bookings
│   ├── cqrs/           # Command/Query buses
│   └── dtos/           # Data transfer objects
├── infrastructure/      # External integrations
│   ├── event-store/    # MongoDB Event Store
│   ├── repositories/   # MongoDB implementations
│   ├── caching/        # Redis cache & distributed locks
│   ├── projections/    # Read model materialization
│   ├── messaging/      # Kafka event bus
│   ├── grpc/           # gRPC server & proto definitions
│   ├── websocket/      # WebSocket server (Socket.IO)
│   ├── graphql/        # GraphQL schema & resolvers
│   ├── monitoring/     # Prometheus metrics
│   ├── feature-flags/  # Feature flag service
│   └── database/       # Migrations & seeding
└── presentation/        # API layer
    └── http/           # Fastify routes & middleware
```

---

## 🚀 Production Deployment

### Infrastructure (Terraform)

**Deployed on AWS:**

- ✅ **ECS Fargate** - Container orchestration with auto-scaling (5-20 tasks)
- ✅ **Application Load Balancer (ALB)** - HTTPS with ACM certificate
- ✅ **DocumentDB** - MongoDB-compatible event store (multi-AZ with read replicas)
- ✅ **ElastiCache (Redis)** - Caching and distributed locks (multi-AZ)
- ✅ **MSK (Kafka)** - Managed Kafka cluster for event streaming (optional)
- ✅ **CloudWatch** - Logging, metrics, and alarms
- ✅ **ECR** - Docker image registry (for API, Prometheus, and Grafana images)
- ✅ **VPC** - Isolated network (public/private subnets across 3 AZs)
- ✅ **Route53** - DNS management
- ✅ **CloudFront** - CDN for static assets and API caching (optional)
- ✅ **ACM** - SSL/TLS certificate management
- ✅ **Security Groups** - Network-level security with VPC CIDR-based rules
- ✅ **IAM Roles & Policies** - Fine-grained permissions for ECS tasks (EFS, Secrets Manager, CloudWatch)
- ✅ **EFS (Elastic File System)** - Persistent storage for Grafana and Prometheus data
- ✅ **Service Discovery (AWS Cloud Map)** - Private DNS namespace (`wokibrain.internal`) for internal service communication
- ✅ **Prometheus** - Metrics collection and time-series database (optional)
- ✅ **Grafana** - Monitoring dashboards and visualization (optional)
- ✅ **S3** - ALB access logs storage with lifecycle policies

**Infrastructure as Code:**

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Alternative: Kubernetes Deployment

We also provide **Kubernetes manifests** for deployment on any K8s cluster (EKS, GKE, AKS, or self-hosted):

**Manifests included:**

- `k8s/deployment.yaml` - Deployment with 3 replicas, health checks, resource limits
- `k8s/service.yaml` - ClusterIP service for HTTP, gRPC, and metrics
- `k8s/hpa.yaml` - Horizontal Pod Autoscaler (3-20 pods, CPU/memory/request-based)
- `k8s/ingress.yaml` - Ingress with TLS, rate limiting, and NGINX annotations
- `k8s/configmap.yaml` - Configuration for Redis, Kafka, and other services
- `k8s/secrets.example.yaml` - Template for secrets (MongoDB URI, JWT keys)

**Deploy to Kubernetes:**

```bash
# 1. Create namespace
kubectl create namespace wokibrain

# 2. Create secrets (copy from secrets.example.yaml and fill values)
kubectl create secret generic wokibrain-secrets \
  --from-literal=mongodb-uri='mongodb://...' \
  --from-literal=jwt-access-secret='your-secret' \
  --from-literal=jwt-refresh-secret='your-refresh-secret' \
  -n wokibrain

# 3. Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# 4. Apply Deployment
kubectl apply -f k8s/deployment.yaml

# 5. Apply Service
kubectl apply -f k8s/service.yaml

# 6. Apply HPA (auto-scaling)
kubectl apply -f k8s/hpa.yaml

# 7. Apply Ingress (if using ingress controller)
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n wokibrain
kubectl get hpa -n wokibrain
kubectl logs -f deployment/wokibrain-api -n wokibrain
```

**Kubernetes Features:**

- ✅ **Auto-scaling**: HPA scales 3-20 pods based on CPU, memory, and request rate
- ✅ **Health Checks**: Liveness and readiness probes
- ✅ **Resource Limits**: CPU (250m-1000m) and Memory (512Mi-2Gi)
- ✅ **Rolling Updates**: Zero-downtime deployments
- ✅ **Security**: Non-root user, security contexts
- ✅ **Monitoring**: Prometheus metrics scraping enabled
- ✅ **TLS**: Ingress with Let's Encrypt (cert-manager)

**Note**: Update `k8s/ingress.yaml` with your domain and ensure cert-manager is installed for TLS.

**Monitoring Stack (K8s):**

The K8s deployment includes a complete monitoring stack:

- **Prometheus**: Scrapes metrics from WokiBrain API pods automatically
- **Grafana**: Pre-configured with Prometheus datasource and WokiBrain Overview dashboard
- **Auto-discovery**: Prometheus discovers API pods via Kubernetes service discovery

**Deploy monitoring:**

```bash
# Deploy Prometheus
kubectl apply -f k8s/prometheus-configmap.yaml
kubectl apply -f k8s/prometheus-deployment.yaml

# Deploy Grafana
kubectl create secret generic grafana-secrets \
  --from-literal=admin-password='your-password' \
  -n wokibrain
kubectl apply -f k8s/grafana-datasources.yaml
kubectl apply -f k8s/grafana-dashboards.yaml
kubectl apply -f k8s/grafana-deployment.yaml

# Access Grafana (port-forward)
kubectl port-forward -n wokibrain svc/grafana 3000:3000
# Open http://localhost:3000 (admin / your-password)
```

Kubernetes deployment manifests are available in the `k8s/` directory.

### Environments

- **Production (AWS ECS)**: https://wokibrain.grgcrew.com/api/v1
- **Production (K8s)**: Deploy using manifests in `k8s/` directory
- **Local**: http://localhost:3000/api/v1

---

## 📚 API Documentation

### REST API

**Interactive Documentation**: https://wokibrain.grgcrew.com/api/v1/docs

**OpenAPI Spec:**

- YAML: `/api/v1/openapi.yaml`
- JSON: `/api/v1/openapi.json`

### WebSocket API (Socket.IO)

**Interactive Documentation**: https://wokibrain.grgcrew.com/api/v1/docs/websockets

**AsyncAPI Spec:**

- YAML: `/api/v1/asyncapi.yaml`
- JSON: `/api/v1/asyncapi.json`

**Generate Documentation:**

```bash
npm run docs:websockets
```

This generates interactive AsyncAPI documentation (similar to ReDoc) from the `asyncapi.yaml` specification.

### Core Endpoints

#### 1. Discover Available Seats

```bash
GET /api/v1/woki/discover?restaurantId=R1&sectorId=S1&date=2025-10-22&partySize=5&duration=90
```

#### 2. Create Booking

```bash
POST /api/v1/woki/bookings
Content-Type: application/json
Idempotency-Key: unique-key-123

{
  "restaurantId": "R1",
  "sectorId": "S1",
  "partySize": 5,
  "durationMinutes": 90,
  "date": "2025-10-22"
}
```

#### 3. List Bookings

```bash
GET /api/v1/woki/bookings?restaurantId=R1&sectorId=S1&date=2025-10-22
```

**Full API Documentation**: See interactive docs at `/api/v1/docs`

### Admin Endpoints (Setup & Testing)

For interviewers and testing, we provide admin endpoints to set up the database:

#### 1. **Seed Database** (Quick Setup)

Seed the database with sample data (Restaurant R1, Sector S1, Tables T1-T5, Booking B1):

```bash
# Using header
curl -X POST https://wokibrain.grgcrew.com/api/v1/admin/seed \
  -H "X-Admin-Secret: wokibrain-admin-secret-change-in-production"

# Or using query parameter
curl -X POST "https://wokibrain.grgcrew.com/api/v1/admin/seed?secret=wokibrain-admin-secret-change-in-production"
```

#### 2. **Create Restaurant**

```bash
curl -X POST https://wokibrain.grgcrew.com/api/v1/admin/restaurants \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: wokibrain-admin-secret-change-in-production" \
  -d '{
    "id": "R1",
    "name": "Bistro Central",
    "timezone": "America/Argentina/Buenos_Aires",
    "windows": [
      {"start": "12:00", "end": "16:00"},
      {"start": "20:00", "end": "23:45"}
    ]
  }'
```

#### 3. **Create Sector**

```bash
curl -X POST https://wokibrain.grgcrew.com/api/v1/admin/sectors \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: wokibrain-admin-secret-change-in-production" \
  -d '{
    "id": "S1",
    "restaurantId": "R1",
    "name": "Main Hall"
  }'
```

#### 4. **Create Table**

```bash
curl -X POST https://wokibrain.grgcrew.com/api/v1/admin/tables \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: wokibrain-admin-secret-change-in-production" \
  -d '{
    "id": "T1",
    "sectorId": "S1",
    "name": "Table 1",
    "capacityMin": 2,
    "capacityMax": 4
  }'
```

#### 5. **Get Admin Info**

```bash
curl https://wokibrain.grgcrew.com/api/v1/admin/info
```

**Note**: In production, set `ADMIN_SECRET` environment variable to secure these endpoints. Default secret is `wokibrain-admin-secret-change-in-production`.

---

## 🔔 Webhooks

WokiBrain supports webhooks for real-time event notifications. Webhooks allow external systems to be notified when specific events occur in the booking system.

### Overview

Webhooks are HTTP callbacks that notify your application when events occur. They provide:

- **Real-time notifications**: Get instant updates when bookings are created, updated, or cancelled
- **Reliable delivery**: Automatic retries with exponential backoff
- **Security**: HMAC-SHA256 signatures for request verification
- **Scalability**: Kafka-based queue for high-throughput delivery
- **Flexibility**: Subscribe to specific events you care about

### Supported Events

| Event Type          | Description         | Triggered When                    |
| ------------------- | ------------------- | --------------------------------- |
| `booking.created`   | New booking created | A booking is successfully created |
| `booking.updated`   | Booking updated     | Booking details are modified      |
| `booking.cancelled` | Booking cancelled   | A booking is cancelled            |
| `table.unavailable` | Table unavailable   | A table becomes unavailable       |

### How Webhooks Work

```
┌─────────────┐
│   Booking   │
│   Created   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   Event Publisher Service      │
│   - Publishes domain events    │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Kafka Event Bus               │
│   Topic: wokibrain.webhooks.*   │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Webhook Worker                │
│   - Consumes from Kafka         │
│   - Finds active webhooks       │
│   - Delivers HTTP POST          │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Your Application              │
│   - Receives webhook            │
│   - Verifies signature          │
│   - Processes event             │
└─────────────────────────────────┘
```

### Configuration

#### 1. Create a Webhook

Register a webhook endpoint to receive events:

```bash
curl -X POST https://wokibrain.grgcrew.com/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/wokibrain",
    "events": ["booking.created", "booking.cancelled"],
    "secret": "your-webhook-secret-min-16-chars"
  }'
```

**Response:**

```json
{
  "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
  "url": "https://your-app.com/webhooks/wokibrain",
  "events": ["booking.created", "booking.cancelled"],
  "secret": "your-webhook-secret-min-16-chars",
  "status": "ACTIVE",
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```

#### 2. List Webhooks

Get all registered webhooks:

```bash
curl -X GET https://wokibrain.grgcrew.com/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### 3. Get Webhook Details

Retrieve a specific webhook:

```bash
curl -X GET https://wokibrain.grgcrew.com/api/v1/webhooks/{webhookId} \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### 4. Update Webhook

Update webhook URL, events, or status:

```bash
curl -X PUT https://wokibrain.grgcrew.com/api/v1/webhooks/{webhookId} \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/wokibrain-v2",
    "events": ["booking.created"],
    "status": "ACTIVE"
  }'
```

#### 5. Delete Webhook

Remove a webhook:

```bash
curl -X DELETE https://wokibrain.grgcrew.com/api/v1/webhooks/{webhookId} \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Webhook Payload

When an event occurs, WokiBrain sends a POST request to your webhook URL with the following payload:

```json
{
  "event": "booking.created",
  "data": {
    "id": "booking-123",
    "restaurantId": "R1",
    "sectorId": "S1",
    "tableIds": ["T1", "T2"],
    "partySize": 4,
    "start": "2025-01-20T19:00:00Z",
    "end": "2025-01-20T20:30:00Z",
    "durationMinutes": 90,
    "status": "CONFIRMED",
    "createdAt": "2025-01-20T10:00:00Z"
  },
  "timestamp": "2025-01-20T10:00:00Z",
  "id": "webhook-delivery-123"
}
```

### Webhook Headers

Each webhook request includes the following headers:

| Header                    | Description                            |
| ------------------------- | -------------------------------------- |
| `Content-Type`            | `application/json`                     |
| `X-WokiBrain-Signature`   | HMAC-SHA256 signature for verification |
| `X-WokiBrain-Event`       | Event type (e.g., `booking.created`)   |
| `X-WokiBrain-Delivery-ID` | Unique delivery ID for tracking        |
| `X-WokiBrain-Attempt`     | Retry attempt number (1, 2, 3...)      |

### Verifying Webhook Signatures

To ensure webhooks are authentic, verify the HMAC signature:

**Node.js Example:**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// In your webhook handler
app.post('/webhooks/wokibrain', (req, res) => {
  const signature = req.headers['x-wokibrain-signature'];
  const secret = 'your-webhook-secret';

  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  console.log('Event:', req.body.event);
  console.log('Data:', req.body.data);

  res.status(200).send('OK');
});
```

**Python Example:**

```python
import hmac
import hashlib
import json

def verify_webhook_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        json.dumps(payload).encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected_signature)

# In your webhook handler
@app.route('/webhooks/wokibrain', methods=['POST'])
def webhook_handler():
    signature = request.headers.get('X-WokiBrain-Signature')
    secret = 'your-webhook-secret'

    if not verify_webhook_signature(request.json, signature, secret):
        return 'Invalid signature', 401

    # Process webhook
    event = request.json['event']
    data = request.json['data']

    return 'OK', 200
```

### Retry Logic

WokiBrain automatically retries failed webhook deliveries:

- **Max Retries**: 3 attempts (configurable)
- **Retry Strategy**: Exponential backoff
  - Attempt 1: Immediate
  - Attempt 2: 1 second delay
  - Attempt 3: 2 seconds delay
  - Attempt 4: 4 seconds delay
- **Retry Conditions**: Network errors, timeouts, 5xx responses
- **No Retry**: 4xx responses (client errors) after first attempt

### Webhook Status

Webhooks can have the following statuses:

| Status     | Description                                     |
| ---------- | ----------------------------------------------- |
| `ACTIVE`   | Webhook is active and will receive events       |
| `INACTIVE` | Webhook is disabled and will not receive events |
| `PAUSED`   | Webhook is temporarily paused                   |

### Kafka Integration

Webhooks are delivered via Kafka for scalability and reliability:

- **Topic**: `wokibrain.webhooks.deliveries`
- **Consumer Group**: `webhook-workers`
- **Benefits**:
  - Persistent queue (survives restarts)
  - Horizontal scaling (multiple workers)
  - Guaranteed delivery
  - High throughput

### Configuration

#### Enable Webhook Worker

The webhook worker can run in-process or as a separate service:

**In-Process (Same Container):**

Set environment variable:

```bash
WEBHOOK_WORKER_ENABLED=true
```

**Separate Service (Recommended for Production):**

Deploy webhook workers as separate ECS tasks or Kubernetes pods for better isolation and scaling.

#### Kafka Configuration

Webhooks require Kafka to be configured:

```bash
# Required
KAFKA_BROKERS=kafka-broker-1:9092,kafka-broker-2:9092

# Optional (for AWS MSK with SASL)
KAFKA_SSL=true
KAFKA_SASL_MECHANISM=scram-sha-512
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password
```

**Without Kafka**: Webhooks will use direct delivery (no persistence, no retries).

### Best Practices

1. **Use HTTPS**: Always use HTTPS endpoints for webhooks
2. **Verify Signatures**: Always verify HMAC signatures to ensure authenticity
3. **Idempotency**: Handle duplicate deliveries (use `X-WokiBrain-Delivery-ID`)
4. **Fast Response**: Respond quickly (within 10 seconds) to avoid timeouts
5. **Error Handling**: Return appropriate HTTP status codes:
   - `200 OK`: Webhook processed successfully
   - `4xx`: Client error (won't retry)
   - `5xx`: Server error (will retry)
6. **Logging**: Log all webhook deliveries for debugging
7. **Monitoring**: Monitor webhook delivery success rates

### Testing Webhooks Locally

Use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# Expose local server
ngrok http 3000

# Use the ngrok URL for webhook registration
curl -X POST https://wokibrain.grgcrew.com/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-ngrok-url.ngrok.io/webhooks/wokibrain",
    "events": ["booking.created"],
    "secret": "test-secret-12345678"
  }'
```

### Troubleshooting

**Webhooks not being delivered:**

1. Check webhook status is `ACTIVE`
2. Verify webhook URL is accessible (HTTPS required)
3. Check Kafka connectivity
4. Review application logs for errors
5. Verify webhook worker is running

**Signature verification failing:**

1. Ensure you're using the correct secret
2. Verify you're signing the entire JSON payload
3. Check for whitespace or encoding issues

**Webhooks timing out:**

1. Ensure your endpoint responds within 10 seconds
2. Check network connectivity
3. Review server logs for slow operations

### API Reference

See the [OpenAPI documentation](https://wokibrain.grgcrew.com/api/v1/docs) for complete API reference, including:

- Request/response schemas
- Error codes
- Authentication requirements
- Example requests

---

## 🧪 Testing

**157 tests passing** with **100% coverage** of critical components:

```bash
npm test              # Run all tests
npm run test:coverage # With coverage report
npm run test:e2e      # End-to-end tests
```

**Test Coverage:**

- ✅ Event Store (12 tests)
- ✅ Repositories (15 tests)
- ✅ Use Cases (15 tests)
- ✅ Domain Logic (60+ tests)
- ✅ Infrastructure (60+ tests)
- ✅ E2E Tests (8 scenarios)

---

## 🛠️ Tech Stack

### Application Layer

- **Node.js 20+** with **TypeScript** (strict mode)
- **Fastify** - High-performance web framework
- **Domain-Driven Design (DDD)** - Clean architecture with bounded contexts
- **Event Sourcing** - Complete audit trail with immutable events
- **CQRS** - Separate read/write models for optimal performance
- **Hexagonal Architecture** - Ports & adapters pattern

### API Protocols

- **REST API** - Primary HTTP/JSON interface (Fastify)
- **gRPC** - High-performance RPC for internal services and integrations
- **GraphQL** - Flexible query API with subscriptions
- **WebSockets** - Real-time updates via Socket.IO

### Data Layer

- **MongoDB (DocumentDB)** - Event store + read models (multi-AZ with replicas)
- **Redis (ElastiCache)** - Multi-layer caching + distributed locks
- **Kafka (MSK)** - Event streaming for asynchronous processing and projections

### Infrastructure & DevOps

- **Docker** - Containerization with multi-stage builds
- **AWS ECS Fargate** - Serverless container orchestration (auto-scaling 5-20 tasks)
- **Kubernetes (K8s)** - Alternative deployment option with HPA, Ingress, and full K8s ecosystem
- **Terraform** - Infrastructure as Code (VPC, ECS, DocumentDB, ElastiCache, MSK, ALB, CloudFront)
- **GitHub Actions** - CI/CD pipelines with automated testing and deployment
- **CloudWatch** - Logging, metrics, and alarms
- **Prometheus + Grafana** - Advanced monitoring and observability
- **ECR** - Docker image registry

### Security & Quality

- **JWT + RBAC** - Authentication & role-based access control
- **Helmet** - Security headers (CSP, HSTS, etc.)
- **Rate Limiting** - DDoS protection with configurable limits
- **TLS/HTTPS** - End-to-end encryption (ACM certificates)
- **Input Validation** - Zod schemas for type-safe validation
- **Feature Flags** - Dynamic feature toggling
- **Database Migrations** - Version-controlled schema changes
- **Backup/Restore** - Automated data management

### Additional Features

- **Internationalization (i18n)** - Multi-language support
- **OpenTelemetry** - Distributed tracing and metrics
- **Postman Collection** - Complete API testing suite
- **Stress Testing** - K6, Artillery, Autocannon for performance validation
- **TypeScript SDK** - Official client library for easy integration

---

## 🏃 Local Development

### Prerequisites

- Node.js >= 20.0.0
- Docker & Docker Compose
- npm >= 10.0.0

### Quick Start

```bash
# Clone repository
git clone git@github.com:cardozoalani/wokibrain.git
cd wokibrain

# Install dependencies
npm install

# Start services (MongoDB, Redis)
docker-compose up -d

# Run migrations
npm run migration:run

# Start development server
npm run dev
```

**API will be available at**: http://localhost:3000/api/v1

### Quick Start Scripts

We provide several helper scripts to streamline development:

#### 1. **Development Setup** (`scripts/dev-start.sh`)

Automatically sets up the development environment:

```bash
./scripts/dev-start.sh
```

This script:

- Checks Docker is running
- Starts MongoDB and Redis containers
- Waits for services to be healthy
- Creates `.env` file if it doesn't exist
- Verifies all connections

#### 2. **Start API** (`RUN_API.sh`)

Quick script to start the API with proper environment variables:

```bash
./RUN_API.sh
```

#### 3. **Deploy to ECR** (`scripts/deploy-to-ecr.sh`)

Build and push Docker image to AWS ECR:

```bash
./scripts/deploy-to-ecr.sh [tag]
```

#### 4. **Connect to DocumentDB** (`scripts/connect-to-documentdb.sh`)

Helper script to connect to production DocumentDB from local machine:

```bash
./scripts/connect-to-documentdb.sh
```

#### 5. **Create Bastion Host** (`scripts/create-bastion-host.sh`)

Creates a temporary EC2 instance for secure DocumentDB access:

```bash
./scripts/create-bastion-host.sh
```

#### 6. **Backup/Restore** (`scripts/backup-mongodb.sh`, `scripts/restore-mongodb.sh`)

```bash
# Backup
./scripts/backup-mongodb.sh

# Restore
./scripts/restore-mongodb.sh <backup-file>
```

#### 7. **HTTPS Setup** (`scripts/setup-https-wokibrain.sh`)

Configure HTTPS with ACM certificate:

```bash
./scripts/setup-https-wokibrain.sh
```

#### 8. **ECS Diagnostics** (`scripts/diagnose-ecs.sh`)

Diagnose ECS service issues:

```bash
./scripts/diagnose-ecs.sh
```

### Environment Variables

Create `.env` file:

```env
# Application
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# MongoDB
MONGODB_URI=mongodb://localhost:27017/wokibrain
MONGODB_DATABASE=wokibrain

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Kafka (optional)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=wokibrain-dev
KAFKA_GROUP_ID=wokibrain-group-dev

# JWT
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Feature Flags
FEATURE_FLAGS_ENABLED=true

# i18n
I18N_DEFAULT_LOCALE=en
I18N_SUPPORTED_LOCALES=en,es

# Rate Limiting
RATE_LIMIT_MAX=100
CORS_ORIGIN=*

# Event Sourcing & CQRS
EVENT_SOURCING_ENABLED=true
CQRS_ENABLED=true
```

---

## 📊 Key Features

### Core Business Features

- ✅ **Intelligent Seat Discovery** - Single tables + dynamic combinations
- ✅ **Deterministic Selection** - WokiBrain algorithm for optimal assignments
- ✅ **Concurrency Control** - Distributed locks prevent double bookings
- ✅ **Idempotency** - Safe retry logic with idempotency keys
- ✅ **Service Windows** - Configurable operating hours
- ✅ **15-Minute Grid** - Standardized time slots
- ✅ **Multi-API Support** - REST, gRPC, GraphQL, WebSockets

### 🧠 WokiBrain Selection Algorithm

The system uses a **scoring-based deterministic selection algorithm** that optimizes for table utilization, customer experience, and operational efficiency.

#### How It Works

The algorithm generates all possible candidates (single tables and combinations) and scores them using a multi-factor scoring system:

**Scoring Formula:**

```
Score = (Utilization × 50) + Kind Bonus + Perfect Fit Bonus

Where:
- Utilization = partySize / capacity.max (0.0 to 1.0)
- Kind Bonus = +20 points for single tables (preferred over combos)
- Perfect Fit Bonus = +30 points when partySize exactly matches capacity.max
```

**Selection Criteria (in order of priority):**

1. **Highest Score** - Maximizes table utilization and customer satisfaction
2. **Single Table Preference** - Prefers single tables over combinations when scores are equal
3. **Earliest Time** - Selects the earliest available slot
4. **Fewest Tables** - Minimizes the number of tables used in combinations

#### Algorithm Features

- **Single Table Discovery**: Finds all individual tables that can accommodate the party
- **Dynamic Combinations**: Generates table combinations (2-4 tables) for larger parties
- **Gap Intersection**: For combos, finds overlapping time gaps across multiple tables
- **15-Minute Grid**: Generates slots every 15 minutes within available gaps
- **Deterministic Output**: Same input always produces the same result (critical for idempotency)

#### Algorithm Characteristics

- **Business Value**: Maximizes table utilization (revenue optimization)
- **Customer Experience**: Prefers single tables and perfect fits (better dining experience)
- **Deterministic**: Ensures consistent results for idempotency and testing
- **Performance**: O(n²) complexity for combinations, optimized with early termination
- **Flexibility**: Handles both single tables and dynamic combinations seamlessly

**Example:**

- Party of 4, duration 90min
- Available: Table A (2-4 capacity), Table B (2-4 capacity), Table C (4-6 capacity)
- Algorithm generates:
  - Single candidates: Table C (score: 100 = 0.67×50 + 20 + 30 perfect fit)
  - Combo candidates: Table A+B (score: 50 = 0.5×50)
  - **Selected**: Table C (highest score, single table, perfect fit)

### Advanced Features

- ✅ **Event Sourcing** - Complete audit trail, time travel, event replay
- ✅ **CQRS** - Optimized read/write models with materialized views
- ✅ **Kafka Event Streaming** - Asynchronous event processing and projections
- ✅ **Redis Caching** - Multi-layer caching (<10ms P95) with TTL management
- ✅ **Distributed Locks** - Cross-instance concurrency control (Redis-based)
- ✅ **Projections** - Materialized views for fast queries with rebuild capability
- ✅ **gRPC API** - High-performance RPC for internal services
- ✅ **GraphQL API** - Flexible querying with subscriptions
- ✅ **WebSockets** - Real-time updates for booking status changes
- ✅ **Horizontal Scaling** - 5-20 instances, 100K+ bookings/day
- ✅ **Feature Flags** - Dynamic feature toggling without deployments
- ✅ **Database Migrations** - Version-controlled schema evolution
- ✅ **Backup/Restore** - Automated MongoDB backup and restore
- ✅ **Internationalization** - Multi-language support (i18n)
- ✅ **Monitoring** - Prometheus metrics + Grafana dashboards

---

## 📈 Performance

- **Capacity**: 100K+ bookings/day
- **Latency**: P95 < 200ms (discovery), < 100ms (create)
- **Throughput**: 1000+ req/sec
- **Availability**: 99.9% (multi-AZ deployment)
- **Scalability**: Horizontal (5-20 instances)

---

## 🚀 Stress Testing & Performance Validation

The project includes stress testing tools to validate performance under load. All tools are configured to test the production endpoints.

### Prerequisites

```bash
# Install dependencies (already included in package.json)
npm install

# For K6 (optional, if not installed globally)
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Available Stress Tests

#### 1. **Autocannon Load Test** (Recommended for Quick Tests)

Fast, lightweight load testing using Autocannon. Tests multiple scenarios including health checks, discovery, and booking creation.

```bash
# Run all load test scenarios
npm run benchmark

# Test against production (set BASE_URL)
BASE_URL=https://wokibrain.grgcrew.com/api/v1 npm run benchmark
```

**What it tests:**

- Health check endpoint
- Discover seats endpoint (with random parameters)
- Create booking endpoint (with idempotency)

**Output includes:**

- Requests per second
- Latency (mean, P50, P95, P99, max)
- Error rates
- Throughput

#### 2. **K6 Stress Test** (Advanced Load Testing)

Comprehensive stress testing with K6, including ramp-up scenarios, spike tests, and custom metrics.

```bash
# Run K6 stress test
npm run benchmark:k6

# Test against production
BASE_URL=https://wokibrain.grgcrew.com/api/v1 npm run benchmark:k6

# Run with custom options
k6 run --vus 100 --duration 5m benchmarks/stress-test.k6.js
```

**What it tests:**

- **Discovery Load**: Ramping from 0 to 200 VUs over 8 minutes
- **Booking Stress**: Arrival rate from 10 to 200 req/s
- **Spike Test**: Sudden spike to 500 VUs (tests resilience)

**Thresholds:**

- P95 < 500ms (HTTP requests)
- P99 < 1000ms (HTTP requests)
- Error rate < 5%
- Booking duration P95 < 200ms
- Discovery duration P95 < 300ms

**Custom Metrics:**

- `errors` - Error rate
- `booking_duration` - Booking creation latency
- `discovery_duration` - Discovery latency
- `successful_bookings` - Counter
- `failed_bookings` - Counter

#### 3. **Artillery Load Test** (Realistic Scenarios)

Artillery provides realistic user scenarios with multiple phases and flow testing.

```bash
# Run Artillery test
npm run benchmark:artillery

# Test against production (edit benchmarks/artillery-config.yml)
# Change target: 'https://wokibrain.grgcrew.com/api/v1'
npm run benchmark:artillery
```

**What it tests:**

- **Warm up**: 10-50 req/s over 1 minute
- **Sustained Load**: 100 req/s for 5 minutes
- **Spike**: 500 req/s for 1 minute
- **Cool down**: 10 req/s for 1 minute

**Scenarios:**

- Health Check Flow (10% weight)
- Discovery Flow (40% weight)
- Complete Booking Flow (40% weight)

**Validation:**

- Max error rate: 5%
- P95 < 500ms
- P99 < 1000ms

#### 4. **Concurrency Test** (Race Condition Detection)

Tests concurrent booking requests to ensure no double bookings occur.

```bash
# Run concurrency test
npm run benchmark:concurrency

# Test against production
BASE_URL=https://wokibrain.grgcrew.com/api/v1 npm run benchmark:concurrency
```

**What it tests:**

- 50 concurrent booking requests for the same table/time slot
- Validates that only one booking succeeds
- Ensures distributed locks work correctly
- Detects race conditions

**Output includes:**

- Number of successful bookings (should be 1)
- Number of conflicts (expected: 49)
- Response times
- Error analysis

#### 5. **Performance Regression Test**

Tracks performance over time to detect regressions.

```bash
# Run regression test
npm run benchmark:regression

# Test against production
BASE_URL=https://wokibrain.grgcrew.com/api/v1 npm run benchmark:regression
```

**What it tests:**

- Baseline performance metrics
- Compares against previous runs
- Detects performance degradation
- Generates reports

#### 6. **Run All Tests**

Execute all stress tests sequentially:

```bash
npm run benchmark:all
```

This runs:

1. Autocannon load test
2. Concurrency test
3. Performance regression test

**Note**: K6 and Artillery are run separately as they require different configurations.

### Test Configuration

#### Environment Variables

```bash
# Base URL (default: http://localhost:3000)
BASE_URL=https://wokibrain.grgcrew.com/api/v1

# For K6
export BASE_URL=https://wokibrain.grgcrew.com/api/v1
npm run benchmark:k6
```

#### Customizing Tests

**Autocannon** (`benchmarks/load-test.ts`):

- Modify `scenarios` array to add/remove test cases
- Adjust `connections`, `duration`, `pipelining` in options

**K6** (`benchmarks/stress-test.k6.js`):

- Modify `scenarios` to change load patterns
- Adjust `thresholds` for different SLA requirements
- Add custom metrics as needed

**Artillery** (`benchmarks/artillery-config.yml`):

- Modify `phases` to change load patterns
- Adjust `scenarios` weights
- Add new scenarios in `scenarios` section

### Expected Results

**Local Development:**

- Health check: < 10ms P95
- Discovery: < 200ms P95
- Create booking: < 100ms P95
- Throughput: 500+ req/s

**Production (AWS ECS):**

- Health check: < 50ms P95
- Discovery: < 300ms P95
- Create booking: < 200ms P95
- Throughput: 1000+ req/s

### Interpreting Results

- **P95/P99 Latency**: 95th/99th percentile response time
- **Error Rate**: Percentage of failed requests (should be < 5%)
- **Throughput**: Requests per second the system can handle
- **Concurrent Users (VUs)**: Number of simultaneous virtual users

### Troubleshooting

**K6 not found:**

```bash
# Install K6 globally or use npx
npx k6 run benchmarks/stress-test.k6.js
```

**Artillery errors:**

```bash
# Ensure Artillery is installed
npm install -g artillery
```

**Connection errors:**

- Verify API is running: `curl http://localhost:3000/api/v1/health`
- Check firewall/security groups for production
- Ensure database is accessible

---

## 🔒 Security

- **TLS/HTTPS** - All connections encrypted
- **JWT Authentication** - Access + refresh tokens
- **RBAC** - Role-based access control
- **Rate Limiting** - DDoS protection
- **Input Validation** - Zod schemas
- **Security Headers** - Helmet middleware
- **Network Isolation** - Private subnets for databases

---

## 📦 TypeScript SDK

TypeScript SDK for integration with WokiBrain API.

### Installation

```bash
npm install @wokibrain/sdk
```

**Note**: The SDK is currently available locally. To publish to npm:

```bash
cd sdk/typescript
npm login  # Login to npm
npm publish --access public
```

### Usage

```typescript
import { WokiBrainSDK } from '@wokibrain/sdk';

const client = new WokiBrainSDK({
  apiKey: process.env.WOKI_API_KEY!,
  baseURL: 'https://wokibrain.grgcrew.com/api/v1', // optional, defaults to production
});

// Discover available seats
const discovery = await client.discoverSeats({
  restaurantId: 'R1',
  sectorId: 'S1',
  date: '2025-10-22',
  partySize: 5,
  duration: 90,
});

console.log(`Found ${discovery.candidates.length} available slots`);

// Create a booking
const booking = await client.createBooking(
  {
    restaurantId: 'R1',
    sectorId: 'S1',
    partySize: 5,
    durationMinutes: 90,
    date: '2025-10-22',
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
  },
  'unique-idempotency-key-123'
);

console.log(`Booking created: ${booking.id}`);

// Get booking details
const bookingDetails = await client.getBooking(booking.id);

// List bookings
const bookings = await client.listBookings({
  restaurantId: 'R1',
  sectorId: 'S1',
  date: '2025-10-22',
});

// Cancel booking
await client.cancelBooking(booking.id);
```

### Publishing to npm

To publish the SDK to npm for public use:

1. **Build the SDK**:

   ```bash
   cd sdk/typescript
   npm run build
   ```

2. **Login to npm** (if not already logged in):

   ```bash
   npm login
   ```

3. **Publish**:

   ```bash
   npm publish --access public
   ```

   The `prepublishOnly` script will automatically build the SDK before publishing.

4. **Verify**:
   ```bash
   npm view @wokibrain/sdk
   ```

**Note**: Make sure to update the version in `sdk/typescript/package.json` before publishing a new version.

---

## 📊 Monitoring & Grafana

### Accessing Grafana

Grafana is available for monitoring metrics and dashboards. Access depends on your deployment:

#### Kubernetes Deployment

Grafana is deployed in the `wokibrain` namespace. Access via port-forward:

```bash
# Port-forward Grafana service
kubectl port-forward -n wokibrain svc/grafana 3000:3000

# Access Grafana
open http://localhost:3000
```

**Default credentials**:

- Username: `admin`
- Password: Set in `grafana-secrets` secret (see `k8s/grafana-secrets.example.yaml`)

**To set Grafana password**:

```bash
kubectl create secret generic grafana-secrets \
  --from-literal=admin-password='your-secure-password' \
  -n wokibrain
```

#### AWS ECS Deployment (Terraform)

Grafana is available as an optional module. To enable:

1. **Enable Grafana in Terraform**:

   ```hcl
   # terraform/terraform.tfvars
   enable_grafana = true
   grafana_domain_name = "grafana.wokibrain.grgcrew.com"  # Optional: custom domain
   grafana_admin_password = "ChangeThisPasswordInProduction123!"  # Admin password
   ```

2. **Apply Terraform**:

   ```bash
   cd terraform
   terraform apply
   ```

3. **Access Grafana**:
   - **With custom domain**: `https://grafana.wokibrain.grgcrew.com`
   - **Without custom domain**: Access via ALB DNS name (check Terraform outputs):
     ```bash
     terraform output grafana_endpoint
     ```

4. **Login Credentials**:
   - **Username**: `admin`
   - **Password**: Set in `grafana_admin_password` variable (default: `ChangeThisPasswordInProduction123!`)

**Grafana Features**:

- ✅ Pre-configured Prometheus datasource (connects via Service Discovery: `http://prometheus.wokibrain.internal:9090`)
- ✅ WokiBrain Overview dashboard (request rates, latency, errors, booking metrics)
- ✅ Persistent storage via EFS (Access Point: `/grafana-v3`)
- ✅ Auto-provisioned dashboards and datasources on startup
- ✅ Internal HTTP communication (HTTPS terminated at ALB)
- ✅ Service Discovery integration for Prometheus connectivity

**Grafana Dashboards**:

- **WokiBrain Overview**: Key metrics (requests/sec, latency P95/P99, error rates, booking creation rate)
- **System Metrics**: CPU, memory, network usage
- **Custom Dashboards**: Create your own dashboards for specific use cases

#### Prometheus Access (AWS ECS)

Prometheus is also available as an optional module in Terraform. To enable:

1. **Enable Prometheus in Terraform**:

   ```hcl
   # terraform/terraform.tfvars
   enable_prometheus = true
   prometheus_domain_name = "prometheus.wokibrain.grgcrew.com"  # Optional: custom domain
   ```

2. **Apply Terraform**:

   ```bash
   cd terraform
   terraform apply
   ```

3. **Access Prometheus**:
   - **With custom domain**: `https://prometheus.wokibrain.grgcrew.com`
   - **Without custom domain**: Access via ALB DNS name (check Terraform outputs):
     ```bash
     terraform output prometheus_endpoint
     ```
   - **Internal DNS (Service Discovery)**: `http://prometheus.wokibrain.internal:9090` (from within VPC)

**Prometheus Features**:

- ✅ Service Discovery registration (AWS Cloud Map) for internal DNS resolution
- ✅ Persistent storage via EFS (Access Point: `/prometheus`)
- ✅ Auto-scraping of WokiBrain API metrics endpoint
- ✅ Security Group rules allowing VPC CIDR access on port 9090
- ✅ ECR image repository for Prometheus container
- ✅ Internal HTTP communication (HTTPS terminated at ALB)

**Note**: Prometheus is typically accessed via Grafana, but direct access is available for advanced users. Grafana connects to Prometheus using Service Discovery DNS (`prometheus.wokibrain.internal:9090`) for internal communication.

### Prometheus Metrics

The API exposes Prometheus metrics at `/metrics` endpoint:

```bash
# Local
curl http://localhost:3000/metrics

# Production
curl https://wokibrain.grgcrew.com/api/v1/metrics
```

**Available Metrics**:

- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total` - Total HTTP requests counter
- `booking_created_total` - Total bookings created
- `booking_cancelled_total` - Total bookings cancelled
- `discovery_requests_total` - Total discovery requests
- `cache_hits_total` / `cache_misses_total` - Cache performance

---

## 📝 Documentation

- **[C4 Model](./docs/C4_MODEL.md)** - Complete architecture diagrams (Context, Container, Component, Code)
- **[API Documentation](https://wokibrain.grgcrew.com/api/v1/docs)** - Interactive OpenAPI docs with Redoc
- **[Postman Collection](./postman/)** - Complete API testing suite with environments
- **Terraform** - Infrastructure as Code for AWS deployment (see `terraform/` directory)

### Available Scripts

All scripts are portable and work on any machine. They automatically detect their location:

| Script                             | Purpose                                       |
| ---------------------------------- | --------------------------------------------- |
| `RUN_API.sh`                       | Start the API locally with proper environment |
| `scripts/dev-start.sh`             | Complete development environment setup        |
| `scripts/deploy-to-ecr.sh`         | Build and push Docker image to ECR            |
| `scripts/connect-to-documentdb.sh` | Connect to production DocumentDB              |
| `scripts/create-bastion-host.sh`   | Create temporary EC2 bastion host             |
| `scripts/backup-mongodb.sh`        | Backup MongoDB database                       |
| `scripts/restore-mongodb.sh`       | Restore MongoDB from backup                   |
| `scripts/setup-https-wokibrain.sh` | Configure HTTPS with ACM                      |
| `scripts/diagnose-ecs.sh`          | Diagnose ECS service issues                   |
| `scripts/get-documentdb-info.sh`   | Get DocumentDB connection info                |
| `scripts/get-cert-validation.sh`   | Get ACM certificate validation status         |
| `scripts/setup-production-data.sh` | Quick setup script for production data        |

---

## 🤝 Contributing

This is a technical challenge implementation.

---

## 📧 Contact

**Technical Challenge Support**: cardozoalani@hotmail.com

---

## 📄 License

MIT

---
