# C4 Model - WokiBrain Architecture

## Context Diagram (Level 1)

```
┌─────────────────────────────────────────────────────────────┐
│                        Users                                 │
│                  (Restaurant Staff,                          │
│                   API Consumers)                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    WokiBrain API                             │
│              (REST API - Fastify)                            │
│         https://wokibrain.grgcrew.com/api/v1                │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  DocumentDB  │ │   ElastiCache │ │  Kafka (MSK) │ │  CloudWatch  │
│  (MongoDB)   │ │    (Redis)    │ │  Event Bus   │ │  (Logs)      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**External Actors:**

- **Users**: Restaurant staff, API consumers
- **AWS Services**: DocumentDB, ElastiCache, CloudWatch

**System:**

- **WokiBrain API**: Main booking system deployed on AWS ECS

---

## Container Diagram (Level 2)

```
┌─────────────────────────────────────────────────────────────┐
│                    WokiBrain API                             │
│                  (ECS Fargate Service)                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         HTTP Layer (Fastify)                         │  │
│  │  - REST API Endpoints                                │  │
│  │  - Request Validation                                │  │
│  │  - Error Handling                                    │  │
│  │  - Rate Limiting                                     │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │      Application Layer (Use Cases)                   │  │
│  │  - Discover Seats                                     │  │
│  │  - Create Booking                                    │  │
│  │  - List Bookings                                     │  │
│  │  - CQRS (Command/Query Bus)                         │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │      Domain Layer (Business Logic)                    │  │
│  │  - Entities (Booking, Restaurant, Table)              │  │
│  │  - Value Objects (TimeInterval, Duration)            │  │
│  │  - Domain Services (Gap Discovery, Selection)        │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │    Infrastructure Layer                              │  │
│  │  - Event Store (MongoDB)                             │  │
│  │  - Repositories                                      │  │
│  │  - Cache (Redis)                                     │  │
│  │  - Distributed Locks                                 │  │
│  │  - Event Bus (Kafka)                                 │  │
│  │  - Webhook Service                                   │  │
│  │  - WebSocket Server                                  │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │    Background Workers (Kafka Consumers)              │  │
│  │  - CQRS Projection Worker                            │  │
│  │  - WebSocket Event Worker                            │  │
│  │  - Cache Invalidation Worker                         │  │
│  │  - Webhook Delivery Worker                           │  │
│  │  - Analytics Worker                                  │  │
│  │  - Audit Logging Worker                              │  │
│  └──────────────────┬───────────────────────────────────┘  │
└──────────────────────┼──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  DocumentDB  │ │   ElastiCache │ │  CloudWatch  │
│  (Event Store│ │    (Cache +   │ │  (Monitoring)│
│   + Read     │ │     Locks)    │ │              │
│   Models)    │ │               │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Containers:**

1. **HTTP Layer**: Fastify web server handling REST API
2. **Application Layer**: Use cases and CQRS orchestration
3. **Domain Layer**: Core business logic (DDD)
4. **Infrastructure Layer**: External integrations

**External Systems:**

- **DocumentDB**: Event store and read models
- **ElastiCache**: Caching and distributed locks
- **Kafka (MSK)**: Event streaming and message queue
- **CloudWatch**: Logging and monitoring

---

## Component Diagram (Level 3) - Application Layer

```
┌─────────────────────────────────────────────────────────────┐
│              Application Layer (Use Cases)                   │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Discover Seats   │  │  Create Booking  │                │
│  │   Use Case        │  │   Use Case       │                │
│  └────────┬──────────┘  └────────┬─────────┘                │
│           │                       │                           │
│  ┌────────▼───────────────────────▼─────────┐              │
│  │         CQRS Buses                        │              │
│  │  ┌──────────────┐  ┌──────────────┐      │              │
│  │  │ Command Bus  │  │  Query Bus   │      │              │
│  │  └──────┬───────┘  └──────┬───────┘      │              │
│  │         │                 │               │              │
│  │  ┌──────▼─────────────────▼───────┐      │              │
│  │  │      Event Publisher            │      │              │
│  │  │      (Domain Events)             │      │              │
│  │  └──────┬──────────────────────────┘      │              │
│  │         │                                  │              │
│  │  ┌──────▼──────────────────────────┐      │              │
│  │  │      Event Bus (Kafka)          │      │              │
│  │  │      Topics:                    │      │              │
│  │  │      - wokibrain.booking.events │      │              │
│  │  │      - wokibrain.webhooks.*     │      │              │
│  │  └─────────────────────────────────┘      │              │
│  └───────────────────────────────────────────┘              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Domain Services                          │  │
│  │  - GapDiscoveryService                                │  │
│  │  - WokiBrainSelectionService                          │  │
│  │  - LockService                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Components:**

- **Use Cases**: Business operations orchestration
- **CQRS Buses**: Command/Query separation
- **Event Bus**: Asynchronous event publishing
- **Domain Services**: Reusable business logic

---

## Component Diagram (Level 3) - Infrastructure Layer

```
┌─────────────────────────────────────────────────────────────┐
│              Infrastructure Layer                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Event Store                             │  │
│  │  - MongoDBEventStore                                 │  │
│  │  - Append Events                                     │  │
│  │  - Event Replay                                      │  │
│  │  - Snapshots                                         │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │              Repositories                             │  │
│  │  - MongoDBBookingRepository                          │  │
│  │  - MongoDBRestaurantRepository                       │  │
│  │  - MongoDBTableRepository                            │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │              Cache Layer                              │  │
│  │  - RedisCacheService                                 │  │
│  │  - DistributedLockService                            │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │              Projections                              │  │
│  │  - MongoDBBookingProjection                          │  │
│  │  - Read Model Materialization                        │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │              Webhook Service                          │  │
│  │  - Webhook CRUD                                       │  │
│  │  - Event Delivery (HTTP POST)                         │  │
│  │  - HMAC Signing                                       │  │
│  │  - Retry Logic                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Code Diagram (Level 4) - Create Booking Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Create Booking Flow                             │
│                                                              │
│  1. HTTP Request                                            │
│     POST /api/v1/woki/bookings                              │
│     └─> Fastify Route Handler                               │
│         └─> Request Validation (Zod)                         │
│             └─> CreateBookingUseCase                        │
│                 │                                           │
│                 ├─> RestaurantRepository.findById()         │
│                 ├─> SectorRepository.findById()             │
│                 ├─> TableRepository.findBySectorId()        │
│                 ├─> BookingRepository.findBySectorAndDate()  │
│                 │                                           │
│                 ├─> GapDiscoveryService.findGapsForTable()  │
│                 ├─> WokiBrainSelectionService.selectBest()  │
│                 │                                           │
│                 ├─> LockService.acquire()                   │
│                 │   └─> DistributedLockService (Redis)     │
│                 │                                           │
│                 ├─> Booking.create() (Domain Entity)         │
│                 │                                           │
│                 ├─> BookingRepository.save()                │
│                 │                                           │
│                 ├─> EventPublisher.publish()                │
│                 │   └─> BookingCreatedEvent                 │
│                 │       └─> KafkaEventBus                   │
│                 │           └─> Kafka Topic                 │
│                 │               └─> Multiple Workers:        │
│                 │                   ├─> CQRS Worker          │
│                 │                   │   └─> Update Read Model│
│                 │                   ├─> WebSocket Worker    │
│                 │                   │   └─> Broadcast Event │
│                 │                   ├─> Cache Worker       │
│                 │                   │   └─> Invalidate Cache│
│                 │                   ├─> Webhook Worker      │
│                 │                   │   └─> Deliver Webhooks│
│                 │                   ├─> Analytics Worker     │
│                 │                   │   └─> Store Metrics    │
│                 │                   └─> Audit Worker        │
│                 │                       └─> Store Audit Log│
│                                                             │
│  2. Response                                                │
│     └─> 201 Created + Booking JSON                         │
└─────────────────────────────────────────────────────────────┘
```

**Key Classes:**

- `CreateBookingUseCase`: Orchestrates the booking creation
- `GapDiscoveryService`: Finds available time slots
- `WokiBrainSelectionService`: Selects optimal table configuration
- `DistributedLockService`: Prevents race conditions
- `MongoDBEventStore`: Persists domain events
- `MongoDBBookingProjection`: Updates read model

---

## Deployment Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              VPC (us-east-1)                        │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │         Public Subnets (3 AZs)               │  │  │
│  │  │                                              │  │  │
│  │  │  ┌──────────────────────────────────────┐  │  │  │
│  │  │  │    Application Load Balancer (ALB)     │  │  │  │
│  │  │  │    - HTTPS (ACM Certificate)          │  │  │  │
│  │  │  │    - Health Checks                     │  │  │  │
│  │  │  └──────────────┬─────────────────────────┘  │  │  │
│  │  └─────────────────┼─────────────────────────────┘  │  │
│  │                    │                                 │  │
│  │  ┌─────────────────▼─────────────────────────────┐  │  │
│  │  │         Private Subnets (3 AZs)              │  │  │
│  │  │                                              │  │  │
│  │  │  ┌──────────────────────────────────────┐  │  │  │
│  │  │  │      ECS Fargate Service              │  │  │  │
│  │  │  │      - Auto Scaling (5-20 tasks)      │  │  │  │
│  │  │  │      - Health Checks                   │  │  │  │
│  │  │  │      - CloudWatch Logs                 │  │  │  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  │                                              │  │  │
│  │  │  ┌──────────────────────────────────────┐  │  │  │
│  │  │  │      DocumentDB Cluster               │  │  │  │
│  │  │  │      - Primary + 2 Replicas           │  │  │  │
│  │  │  │      - Multi-AZ                       │  │  │  │
│  │  │  │      - TLS Enabled                    │  │  │  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  │                                              │  │  │
│  │  │  ┌──────────────────────────────────────┐  │  │  │
│  │  │  │      ElastiCache (Redis)              │  │  │  │
│  │  │  │      - Cluster Mode                   │  │  │  │
│  │  │  │      - Multi-AZ                       │  │  │  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  │                                              │  │  │
│  │  │  ┌──────────────────────────────────────┐  │  │  │
│  │  │  │      MSK (Kafka)                      │  │  │  │
│  │  │  │      - Multi-AZ                       │  │  │  │
│  │  │  │      - Event Streaming                 │  │  │  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  │                                              │  │  │
│  │  │  ┌──────────────────────────────────────┐  │  │  │
│  │  │  │      Prometheus (ECS Fargate)        │  │  │  │
│  │  │  │      - Metrics Collection             │  │  │  │
│  │  │  │      - Service Discovery              │  │  │  │
│  │  │  │      - EFS Storage                    │  │  │  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  │                                              │  │  │
│  │  │  ┌──────────────────────────────────────┐  │  │  │
│  │  │  │      Grafana (ECS Fargate)           │  │  │  │
│  │  │  │      - Dashboards                     │  │  │  │
│  │  │  │      - EFS Storage                    │  │  │  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  │                                              │  │  │
│  │  │  ┌──────────────────────────────────────┐  │  │  │
│  │  │  │      EFS (Elastic File System)        │  │  │  │
│  │  │  │      - Grafana Data                   │  │  │  │
│  │  │  │      - Prometheus Data                 │  │  │  │
│  │  │  │      - Access Points                  │  │  │  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  │                                              │  │  │
│  │  │  ┌──────────────────────────────────────┐  │  │  │
│  │  │  │      Service Discovery (Cloud Map)     │  │  │  │
│  │  │  │      - wokibrain.internal             │  │  │  │
│  │  │  │      - Internal DNS Resolution        │  │  │  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │         ECR (Docker Registry)                │  │  │
│  │  │         - API Container Images               │  │  │
│  │  │         - Prometheus Image                  │  │  │
│  │  │         - Grafana Image                     │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         CloudWatch                                    │  │
│  │         - Logs                                        │  │
│  │         - Metrics                                     │  │
│  │         - Alarms                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Route53 / CloudFront (CDN)                    │  │
│  │         - DNS: wokibrain.grgcrew.com                 │  │
│  │         - SSL Certificate (ACM)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Infrastructure Components:**

- **VPC**: Isolated network with public/private subnets across 3 AZs
- **ALB**: Application Load Balancer with HTTPS
- **ECS Fargate**: Container orchestration with auto-scaling
- **DocumentDB**: MongoDB-compatible database cluster
- **ElastiCache**: Redis cluster for caching and locks
- **MSK (Kafka)**: Managed Kafka cluster for event streaming
- **ECR**: Docker image registry (API, Prometheus, Grafana)
- **EFS**: Elastic File System for persistent storage (Grafana, Prometheus)
- **Service Discovery**: AWS Cloud Map for internal DNS (`wokibrain.internal`)
- **IAM Roles**: Fine-grained permissions (EFS, Secrets Manager, CloudWatch)
- **Security Groups**: Network-level security with VPC CIDR rules
- **CloudWatch**: Monitoring and logging
- **Prometheus**: Metrics collection and time-series database
- **Grafana**: Monitoring dashboards and visualization
- **Route53/CloudFront**: DNS and CDN

---

## Technology Stack

### Application

- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **Language**: TypeScript
- **Architecture**: DDD + Event Sourcing + CQRS

### Data Layer

- **Event Store**: MongoDB (DocumentDB)
- **Read Models**: MongoDB (DocumentDB)
- **Cache**: Redis (ElastiCache)
- **Message Queue**: Kafka (MSK) - Event streaming and async processing
- **Webhooks**: HTTP-based event notifications with retry logic

### Infrastructure

- **Container**: Docker
- **Orchestration**: ECS Fargate
- **Load Balancer**: ALB
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **Monitoring**: CloudWatch, Prometheus, Grafana
- **Service Discovery**: AWS Cloud Map (private DNS namespace)
- **Storage**: EFS for persistent data (Grafana, Prometheus)
- **Security**: IAM roles, Security Groups, VPC isolation

### Security

- **TLS**: ACM Certificates
- **Network**: VPC with private subnets
- **Authentication**: JWT + RBAC
- **Rate Limiting**: Fastify rate-limit plugin

---

## Key Design Decisions

1. **Event Sourcing**: Complete audit trail and time travel capabilities
2. **CQRS**: Separate read/write models for optimal performance
3. **Distributed Locks**: Redis-based locks for horizontal scaling
4. **Multi-AZ Deployment**: High availability across availability zones
5. **Auto-Scaling**: ECS Fargate auto-scales based on CPU/memory
6. **Infrastructure as Code**: Terraform for reproducible deployments

---

## Performance Characteristics

- **Capacity**: 100K+ bookings/day
- **Latency**: P95 < 200ms (discovery), < 100ms (create)
- **Throughput**: 1000+ req/sec
- **Availability**: 99.9% (multi-AZ)
- **Scalability**: Horizontal (5-20 instances)

---

## Security Architecture

- **Network Isolation**: Private subnets for databases and services
- **TLS Everywhere**: All connections encrypted (HTTPS terminated at ALB)
- **IAM Roles**: Least privilege access with fine-grained policies
  - ECS Task Execution Role: Secrets Manager, EFS mount, CloudWatch
  - ECS Task Role: EFS read/write, service-specific permissions
- **Security Groups**: VPC CIDR-based rules for internal service communication
- **Service Discovery**: Private DNS namespace for internal service resolution
- **Secrets Management**: AWS Secrets Manager for sensitive data (Grafana passwords, DB credentials)
- **EFS Security**: IAM-based access control with Access Points
- **API Security**: Rate limiting, input validation, CORS
