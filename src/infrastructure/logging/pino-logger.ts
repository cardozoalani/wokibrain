import pino from 'pino';
import { Logger } from '@application/ports/logger.port';
import { Env } from '../config/env';

export class PinoLogger implements Logger {
  private logger: pino.Logger;

  constructor(config: Env) {
    this.logger = pino({
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
      ...(config.NODE_ENV === 'production' && {
        formatters: {
          level: (label) => ({ level: label }),
        },
      }),
    });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.info(context, message);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.logger.error({ ...context, err: error }, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(context, message);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(context, message);
  }

  getLogger(): pino.Logger {
    return this.logger;
  }
}



