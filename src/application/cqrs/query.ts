export interface Query {
  readonly queryId: string;
  readonly queryType: string;
  readonly timestamp: Date;
}

export abstract class BaseQuery implements Query {
  readonly queryId: string;
  readonly queryType: string;
  readonly timestamp: Date;

  constructor(queryType: string) {
    this.queryId = this.generateQueryId();
    this.queryType = queryType;
    this.timestamp = new Date();
  }

  private generateQueryId(): string {
    return `qry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface QueryHandler<T extends Query, R> {
  handle(query: T): Promise<R>;
}

export interface QueryBus {
  execute<T extends Query, R>(query: T): Promise<R>;
  register<T extends Query, R>(queryType: string, handler: QueryHandler<T, R>): void;
}
