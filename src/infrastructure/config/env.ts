import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().url(),
  MONGODB_DATABASE: z.string().default('wokibrain'),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().default(10),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().default(2),
  MONGODB_TLS_CA_FILE: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  EVENT_SOURCING_ENABLED: z.coerce.boolean().default(false),
  CQRS_ENABLED: z.coerce.boolean().default(false),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_TIME_WINDOW: z.coerce.number().default(60000),
  CORS_ORIGIN: z.string().default('*'),
  OTEL_ENABLED: z.coerce.boolean().default(true),
  OTEL_SERVICE_NAME: z.string().default('wokibrain'),
  METRICS_PORT: z.coerce.number().default(9464),
  // Kafka configuration (optional)
  KAFKA_BROKERS: z.string().optional(),
  KAFKA_CLIENT_ID: z.string().default('wokibrain-api'),
  KAFKA_GROUP_ID: z.string().default('wokibrain-api-group'),
  KAFKA_SSL: z.coerce.boolean().default(false),
  KAFKA_SASL_MECHANISM: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']).optional(),
  KAFKA_SASL_USERNAME: z.string().optional(),
  KAFKA_SASL_PASSWORD: z.string().optional(),
  // Webhook worker configuration
  WEBHOOK_WORKER_ENABLED: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.format())}`);
  }

  return parsed.data;
}
