import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export class PrometheusMetrics {
  private registry: Registry;

  public httpRequestsTotal: Counter;
  public httpRequestDuration: Histogram;
  public bookingsCreatedTotal: Counter;
  public bookingsCancelledTotal: Counter;
  public discoveryRequestsTotal: Counter;
  public cacheHitsTotal: Counter;
  public cacheMissesTotal: Counter;
  public lockAcquisitionsTotal: Counter;
  public lockContentionsTotal: Counter;
  public eventStoreWritesTotal: Counter;
  public projectionLagSeconds: Gauge;
  public activeConnections: Gauge;
  public databaseConnectionsActive: Gauge;
  public redisConnectionsActive: Gauge;

  constructor() {
    this.registry = new Registry();

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      registers: [this.registry],
    });

    this.bookingsCreatedTotal = new Counter({
      name: 'bookings_created_total',
      help: 'Total number of bookings created',
      labelNames: ['restaurant_id', 'sector_id'],
      registers: [this.registry],
    });

    this.bookingsCancelledTotal = new Counter({
      name: 'bookings_cancelled_total',
      help: 'Total number of bookings cancelled',
      labelNames: ['restaurant_id', 'sector_id'],
      registers: [this.registry],
    });

    this.discoveryRequestsTotal = new Counter({
      name: 'discovery_requests_total',
      help: 'Total number of discovery requests',
      labelNames: ['restaurant_id', 'sector_id', 'result'],
      registers: [this.registry],
    });

    this.cacheHitsTotal = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });

    this.cacheMissesTotal = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });

    this.lockAcquisitionsTotal = new Counter({
      name: 'lock_acquisitions_total',
      help: 'Total number of lock acquisitions',
      labelNames: ['lock_type', 'result'],
      registers: [this.registry],
    });

    this.lockContentionsTotal = new Counter({
      name: 'lock_contentions_total',
      help: 'Total number of lock contentions',
      registers: [this.registry],
    });

    this.eventStoreWritesTotal = new Counter({
      name: 'event_store_writes_total',
      help: 'Total number of events written',
      labelNames: ['event_type'],
      registers: [this.registry],
    });

    this.projectionLagSeconds = new Gauge({
      name: 'projection_lag_seconds',
      help: 'Projection lag in seconds',
      labelNames: ['projection_name'],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });

    this.databaseConnectionsActive = new Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    this.redisConnectionsActive = new Gauge({
      name: 'redis_connections_active',
      help: 'Number of active Redis connections',
      registers: [this.registry],
    });
  }

  getRegistry(): Registry {
    return this.registry;
  }

  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }
}
