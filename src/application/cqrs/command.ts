export interface Command {
  readonly commandId: string;
  readonly commandType: string;
  readonly timestamp: Date;
  readonly metadata?: {
    userId?: string;
    correlationId?: string;
    [key: string]: unknown;
  };
}

export abstract class BaseCommand implements Command {
  readonly commandId: string;
  readonly commandType: string;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;

  constructor(commandType: string, metadata?: Record<string, unknown>) {
    this.commandId = this.generateCommandId();
    this.commandType = commandType;
    this.timestamp = new Date();
    this.metadata = metadata;
  }

  private generateCommandId(): string {
    return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface CommandHandler<T extends Command, R> {
  handle(command: T): Promise<R>;
}

export interface CommandBus {
  execute<T extends Command, R>(command: T): Promise<R>;
  register<T extends Command, R>(commandType: string, handler: CommandHandler<T, R>): void;
}
