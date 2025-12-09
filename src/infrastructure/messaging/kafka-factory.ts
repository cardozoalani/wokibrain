import { KafkaClient, KafkaConfig } from './kafka-client';
import { Logger } from '@application/ports/logger.port';
import { Env } from '../config/env';

/**
 * Factory function to create KafkaClient from environment variables
 * Returns null if Kafka is not configured
 */
export function createKafkaClient(env: Env, logger: Logger): KafkaClient | null {
  // Check if Kafka brokers are configured
  if (!env.KAFKA_BROKERS) {
    logger.debug('Kafka not configured, skipping initialization');
    return null;
  }

  const brokers = env.KAFKA_BROKERS.split(',').map((b) => b.trim());

  const config: KafkaConfig = {
    brokers,
    clientId: env.KAFKA_CLIENT_ID,
    groupId: env.KAFKA_GROUP_ID,
    ssl: env.KAFKA_SSL,
  };

  // Add SASL authentication if configured
  if (env.KAFKA_SASL_MECHANISM && env.KAFKA_SASL_USERNAME && env.KAFKA_SASL_PASSWORD) {
    config.sasl = {
      mechanism: env.KAFKA_SASL_MECHANISM,
      username: env.KAFKA_SASL_USERNAME,
      password: env.KAFKA_SASL_PASSWORD,
    };
  }

  return new KafkaClient(config, logger);
}
