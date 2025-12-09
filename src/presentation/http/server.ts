import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Env } from '@infrastructure/config/env';
import { PinoLogger } from '@infrastructure/logging/pino-logger';
import { MongoDBClient } from '@infrastructure/database/mongodb.client';
import { MongoDBRestaurantRepository } from '@infrastructure/repositories/mongodb-restaurant.repository';
import { MongoDBSectorRepository } from '@infrastructure/repositories/mongodb-sector.repository';
import { MongoDBTableRepository } from '@infrastructure/repositories/mongodb-table.repository';
import { MongoDBBookingRepository } from '@infrastructure/repositories/mongodb-booking.repository';
import { GapDiscoveryService } from '@domain/services/gap-discovery.service';
import { WokiBrainSelectionService } from '@domain/services/wokibrain-selection.service';
import { LockService } from '@domain/services/lock.service';
import { DiscoverSeatsUseCase } from '@application/use-cases/discover-seats.use-case';
import { CreateBookingUseCase } from '@application/use-cases/create-booking.use-case';
import { ListBookingsUseCase } from '@application/use-cases/list-bookings.use-case';
import { GetBookingUseCase } from '@application/use-cases/get-booking.use-case';
import { DeleteBookingUseCase } from '@application/use-cases/delete-booking.use-case';
import { CreateWebhookUseCase } from '@application/use-cases/create-webhook.use-case';
import { ListWebhooksUseCase } from '@application/use-cases/list-webhooks.use-case';
import { GetWebhookUseCase } from '@application/use-cases/get-webhook.use-case';
import { UpdateWebhookUseCase } from '@application/use-cases/update-webhook.use-case';
import { DeleteWebhookUseCase } from '@application/use-cases/delete-webhook.use-case';
import { MongoDBWebhookRepository } from '@infrastructure/repositories/mongodb-webhook.repository';
import { WebhookService } from '@infrastructure/webhooks/webhook.service';
import { WebhookQueueService } from '@infrastructure/webhooks/webhook-queue.service';
import { WebhookWorkerService } from '@infrastructure/webhooks/webhook-worker.service';
import { createKafkaClient } from '@infrastructure/messaging/kafka-factory';
import { KafkaEventBus } from '@infrastructure/messaging/event-bus';
import { EventPublisherService } from '@infrastructure/events/event-publisher.service';
import { CQRSProjectionWorkerService } from '@infrastructure/workers/cqrs-projection-worker.service';
import { WebSocketEventWorkerService } from '@infrastructure/workers/websocket-event-worker.service';
import { CacheInvalidationWorkerService } from '@infrastructure/workers/cache-invalidation-worker.service';
import { AnalyticsWorkerService } from '@infrastructure/workers/analytics-worker.service';
import { AuditLoggingWorkerService } from '@infrastructure/workers/audit-logging-worker.service';
import { MongoDBBookingProjection } from '@infrastructure/projections/mongodb-booking-projection';
import { MongoDBEventStore } from '@infrastructure/event-store/mongodb-event-store';
import { RedisClient } from '@infrastructure/caching/redis-client';
import { WebSocketServer } from '@infrastructure/websocket/websocket-server';
import { Server as HttpServer } from 'http';
import errorHandlerPlugin from './plugins/error-handler.plugin';
import metricsPlugin from './plugins/metrics.plugin';
import healthRoutes from './routes/health.routes';
import wokiRoutes from './routes/woki.routes';
import extendedWokiRoutes from './routes/extended-woki.routes';
import docsRoutes from './routes/docs.routes';
import adminRoutes from './routes/admin.routes';
import webhookRoutes from './routes/webhook.routes';
import metricsRoutes from './routes/metrics.routes';
import { PrometheusMetrics } from '@infrastructure/monitoring/prometheus-metrics';

export class FastifyServer {
  private app: FastifyInstance;
  private dbClient: MongoDBClient;
  private logger: PinoLogger;
  private webhookWorker?: WebhookWorkerService;
  private cqrsWorker?: CQRSProjectionWorkerService;
  private websocketWorker?: WebSocketEventWorkerService;
  private cacheWorker?: CacheInvalidationWorkerService;
  private analyticsWorker?: AnalyticsWorkerService;
  private auditWorker?: AuditLoggingWorkerService;
  private webSocketServer?: WebSocketServer;
  private redisClient?: RedisClient;
  private eventBus?: KafkaEventBus;
  private metrics: PrometheusMetrics;

  constructor(private config: Env) {
    this.logger = new PinoLogger(config);
    this.dbClient = new MongoDBClient(config);
    this.metrics = new PrometheusMetrics();

    this.app = Fastify({
      logger: this.logger.getLogger() as any, // Type assertion for Pino logger compatibility
      requestIdHeader: 'x-request-id',
      requestIdLogLabel: 'requestId',
      disableRequestLogging: false,
      trustProxy: true,
    });
  }

  async initialize(): Promise<void> {
    await this.dbClient.connect();
    await this.registerPlugins();
    await this.registerRoutes();
    await this.initializeWorkers();
  }

  private async registerPlugins(): Promise<void> {
    await this.app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.redoc.ly'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://cdn.redoc.ly'], // Allow fetching OpenAPI spec
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false, // Disable COOP for HTTP access
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    });

    await this.app.register(cors, {
      origin: this.config.CORS_ORIGIN === '*' ? true : this.config.CORS_ORIGIN.split(','),
      credentials: true,
    });

    await this.app.register(rateLimit, {
      max: this.config.RATE_LIMIT_MAX,
      timeWindow: this.config.RATE_LIMIT_TIME_WINDOW,
      ban: 5,
      errorResponseBuilder: () => ({
        error: 'RATE_LIMIT_EXCEEDED',
        detail: 'Too many requests',
      }),
    });

    if (this.config.NODE_ENV === 'development') {
      await this.app.register(swagger, {
        openapi: {
          info: {
            title: 'WokiBrain API',
            description: 'Enterprise-grade restaurant booking engine',
            version: '1.0.0',
          },
          servers: [
            {
              url: `http://localhost:${this.config.PORT}`,
            },
          ],
        },
      });

      await this.app.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
          docExpansion: 'list',
          deepLinking: true,
        },
      });
    }

    await this.app.register(errorHandlerPlugin);

    // Register metrics plugin to capture HTTP metrics
    await this.app.register(metricsPlugin, {
      metrics: this.metrics,
    });
  }

  private async registerRoutes(): Promise<void> {
    const db = this.dbClient.getDb();

    const restaurantRepo = new MongoDBRestaurantRepository(db.collection('restaurants'));
    const sectorRepo = new MongoDBSectorRepository(db.collection('sectors'));
    const tableRepo = new MongoDBTableRepository(db.collection('tables'));
    const bookingRepo = new MongoDBBookingRepository(
      db.collection('bookings'),
      db.collection('idempotency')
    );

    const gapService = new GapDiscoveryService();
    const brainService = new WokiBrainSelectionService();
    const lockService = new LockService();

    const discoverSeatsUseCase = new DiscoverSeatsUseCase(
      restaurantRepo,
      sectorRepo,
      tableRepo,
      bookingRepo,
      gapService,
      brainService,
      this.logger
    );

    // Initialize webhook service for event delivery
    const webhookRepo = new MongoDBWebhookRepository(db.collection('webhooks'));

    // Try to initialize Kafka for event bus and webhook queue
    const kafkaClient = createKafkaClient(this.config, this.logger);
    let eventBus: KafkaEventBus | null = null;
    let webhookQueueService: WebhookQueueService | undefined;
    let eventPublisher: EventPublisherService | undefined;

    if (kafkaClient) {
      try {
        await kafkaClient.connect();

        // Initialize EventBus for domain events
        eventBus = new KafkaEventBus(kafkaClient, this.logger);
        eventPublisher = new EventPublisherService(eventBus, this.logger);
        this.logger.info('Kafka EventBus initialized');

        // Initialize webhook queue service
        webhookQueueService = new WebhookQueueService(kafkaClient, this.logger);
        this.logger.info('Kafka initialized for webhook delivery');
      } catch (error) {
        this.logger.warn('Failed to connect to Kafka, using fallback mode', {
          error: (error as Error).message,
        });
        // Create event publisher without EventBus (will log but not publish)
        eventPublisher = new EventPublisherService(null, this.logger);
      }
    } else {
      // Create event publisher without EventBus (will log but not publish)
      eventPublisher = new EventPublisherService(null, this.logger);
    }

    const webhookService = new WebhookService(
      webhookRepo,
      this.logger,
      {
        maxRetries: 3,
        retryDelayMs: 1000,
        timeoutMs: 10000,
      },
      webhookQueueService
    );

    const createBookingUseCase = new CreateBookingUseCase(
      restaurantRepo,
      sectorRepo,
      tableRepo,
      bookingRepo,
      gapService,
      brainService,
      lockService,
      this.logger,
      webhookService,
      eventPublisher
    );

    const listBookingsUseCase = new ListBookingsUseCase(sectorRepo, bookingRepo, this.logger);

    const getBookingUseCase = new GetBookingUseCase(bookingRepo, this.logger);

    const deleteBookingUseCase = new DeleteBookingUseCase(
      bookingRepo,
      this.logger,
      webhookService,
      eventPublisher
    );

    // Register health routes with /api/v1 prefix
    await this.app.register(healthRoutes, {
      prefix: '/api/v1',
      dbClient: this.dbClient,
      version: '1.0.0',
    });

    // Also register health routes with /v1 prefix for compatibility
    await this.app.register(healthRoutes, {
      prefix: '/v1',
      dbClient: this.dbClient,
      version: '1.0.0',
    });

    await this.app.register(wokiRoutes, {
      prefix: '/api/v1/woki',
      discoverSeatsUseCase,
      createBookingUseCase,
      listBookingsUseCase,
    });

    await this.app.register(extendedWokiRoutes, {
      prefix: '/api/v1/woki',
      getBookingUseCase,
      deleteBookingUseCase,
    });

    await this.app.register(docsRoutes, {
      prefix: '/api/v1',
    });

    // Register admin routes
    await this.app.register(adminRoutes, {
      prefix: '/api/v1/admin',
      restaurantRepo,
      sectorRepo,
      tableRepo,
      dbClient: this.dbClient,
      config: this.config,
    });

    // Register webhook routes (reuse webhookRepo and webhookService from above)
    const createWebhookUseCase = new CreateWebhookUseCase(webhookRepo, this.logger);
    const listWebhooksUseCase = new ListWebhooksUseCase(webhookRepo, this.logger);
    const getWebhookUseCase = new GetWebhookUseCase(webhookRepo, this.logger);
    const updateWebhookUseCase = new UpdateWebhookUseCase(webhookRepo, this.logger);
    const deleteWebhookUseCase = new DeleteWebhookUseCase(webhookRepo, this.logger);

    await this.app.register(webhookRoutes, {
      prefix: '/api/v1/webhooks',
      createWebhookUseCase,
      listWebhooksUseCase,
      getWebhookUseCase,
      updateWebhookUseCase,
      deleteWebhookUseCase,
    });

    // Register metrics route
    await this.app.register(metricsRoutes, {
      prefix: '/api/v1',
      metrics: this.metrics,
    });
  }

  async start(): Promise<void> {
    try {
      await this.app.listen({
        port: this.config.PORT,
        host: this.config.HOST,
      });

      // Initialize WebSocket server after HTTP server is listening
      await this.initializeWebSocketServer();

      this.logger.info('Server started', {
        port: this.config.PORT,
        host: this.config.HOST,
        env: this.config.NODE_ENV,
      });
    } catch (error) {
      this.logger.error('Failed to start server', error as Error);
      throw error;
    }
  }

  /**
   * Initialize WebSocket server after HTTP server is listening
   */
  private async initializeWebSocketServer(): Promise<void> {
    try {
      const httpServer = this.app.server as HttpServer;
      if (!httpServer) {
        this.logger.warn('HTTP server not available for WebSocket initialization');
        return;
      }

      this.webSocketServer = new WebSocketServer(
        httpServer,
        {
          cors: {
            origin: this.config.CORS_ORIGIN === '*' ? '*' : this.config.CORS_ORIGIN.split(','),
            credentials: true,
          },
        },
        this.logger
      );

      // Start WebSocket worker if EventBus is available (from initializeWorkers)
      if (this.eventBus && this.webSocketServer) {
        try {
          this.websocketWorker = new WebSocketEventWorkerService(
            this.eventBus,
            this.webSocketServer,
            this.logger
          );
          await this.websocketWorker.start();
          this.logger.info('WebSocket event worker started');
        } catch (error) {
          this.logger.warn('Failed to start WebSocket worker', {
            error: (error as Error).message,
          });
        }
      } else {
        this.logger.debug(
          'EventBus or WebSocket server not available, WebSocket worker will not start'
        );
      }

      this.logger.info('WebSocket server initialized', {
        path: '/ws',
      });
    } catch (error) {
      this.logger.warn('WebSocket server initialization failed', {
        error: (error as Error).message,
      });
    }
  }

  getMetrics(): PrometheusMetrics {
    return this.metrics;
  }

  async stop(): Promise<void> {
    // Stop all workers
    const workers = [
      this.webhookWorker,
      this.cqrsWorker,
      this.websocketWorker,
      this.cacheWorker,
      this.analyticsWorker,
      this.auditWorker,
    ];

    for (const worker of workers) {
      if (worker) {
        try {
          await worker.stop();
        } catch (error) {
          this.logger.error('Error stopping worker', error as Error);
        }
      }
    }

    if (this.redisClient) {
      await this.redisClient.disconnect();
    }

    await this.app.close();
    await this.dbClient.disconnect();
    this.logger.info('Server stopped');
  }

  /**
   * Initialize all workers
   */
  private async initializeWorkers(): Promise<void> {
    const kafkaClient = createKafkaClient(this.config, this.logger);
    if (!kafkaClient) {
      this.logger.debug('Kafka not configured, workers will not start');
      return;
    }

    try {
      await kafkaClient.connect();
    } catch (error) {
      this.logger.warn('Failed to connect to Kafka, workers will not start', {
        error: (error as Error).message,
      });
      return;
    }

    const db = this.dbClient.getDb();
    this.eventBus = new KafkaEventBus(kafkaClient, this.logger);

    // Initialize Redis for cache worker
    try {
      this.redisClient = new RedisClient(this.config);
    } catch (error) {
      this.logger.warn('Redis not available, cache invalidation worker will not start', {
        error: (error as Error).message,
      });
    }

    // WebSocket server will be initialized after HTTP server starts
    // See initializeWebSocketServer() method

    // Initialize EventStore for CQRS worker
    const eventStore = new MongoDBEventStore(db);

    // Initialize CQRS Projection Worker
    try {
      const bookingProjection = new MongoDBBookingProjection(db, eventStore);
      this.cqrsWorker = new CQRSProjectionWorkerService(
        this.eventBus,
        bookingProjection,
        this.logger
      );
      await this.cqrsWorker.start();
      this.logger.info('CQRS projection worker started');
    } catch (error) {
      this.logger.error('Failed to start CQRS projection worker', error as Error);
    }

    // WebSocket Event Worker will be initialized after HTTP server starts
    // See initializeWebSocketServer() method

    // Initialize Cache Invalidation Worker
    if (this.redisClient) {
      try {
        this.cacheWorker = new CacheInvalidationWorkerService(
          this.eventBus,
          this.redisClient,
          this.logger
        );
        await this.cacheWorker.start();
        this.logger.info('Cache invalidation worker started');
      } catch (error) {
        this.logger.error('Failed to start cache invalidation worker', error as Error);
      }
    }

    // Initialize Analytics Worker
    try {
      this.analyticsWorker = new AnalyticsWorkerService(this.eventBus, db, this.logger);
      await this.analyticsWorker.start();
      this.logger.info('Analytics worker started');
    } catch (error) {
      this.logger.error('Failed to start analytics worker', error as Error);
    }

    // Initialize Audit Logging Worker
    try {
      this.auditWorker = new AuditLoggingWorkerService(this.eventBus, db, this.logger);
      await this.auditWorker.start();
      this.logger.info('Audit logging worker started');
    } catch (error) {
      this.logger.error('Failed to start audit logging worker', error as Error);
    }

    // Initialize Webhook Worker (if enabled)
    if (this.config.WEBHOOK_WORKER_ENABLED) {
      try {
        const webhookRepo = new MongoDBWebhookRepository(db.collection('webhooks'));
        const webhookService = new WebhookService(webhookRepo, this.logger, {
          maxRetries: 3,
          retryDelayMs: 1000,
          timeoutMs: 10000,
        });

        this.webhookWorker = new WebhookWorkerService(
          kafkaClient,
          webhookService,
          webhookRepo,
          this.logger
        );

        await this.webhookWorker.start();
        this.logger.info('Webhook worker started');
      } catch (error) {
        this.logger.error('Failed to start webhook worker', error as Error);
      }
    }
  }

  getApp(): FastifyInstance {
    return this.app;
  }
}
