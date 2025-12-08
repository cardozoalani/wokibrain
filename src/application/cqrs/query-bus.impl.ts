import { Query, QueryBus, QueryHandler } from './query';
import { Logger } from '../ports/logger.port';

export class InMemoryQueryBus implements QueryBus {
  private handlers: Map<string, QueryHandler<Query, unknown>> = new Map();

  constructor(private logger: Logger) {}

  async execute<T extends Query, R>(query: T): Promise<R> {
    const handler = this.handlers.get(query.queryType);

    if (!handler) {
      throw new Error(`No handler registered for query: ${query.queryType}`);
    }

    this.logger.debug('Executing query', {
      queryId: query.queryId,
      queryType: query.queryType,
    });

    try {
      const result = await handler.handle(query);
      return result as R;
    } catch (error) {
      this.logger.error('Query execution failed', error as Error, {
        queryId: query.queryId,
        queryType: query.queryType,
      });
      throw error;
    }
  }

  register<T extends Query, R>(queryType: string, handler: QueryHandler<T, R>): void {
    if (this.handlers.has(queryType)) {
      throw new Error(`Handler already registered for query: ${queryType}`);
    }

    this.handlers.set(queryType, handler as QueryHandler<Query, unknown>);
    this.logger.debug('Query handler registered', { queryType });
  }
}



