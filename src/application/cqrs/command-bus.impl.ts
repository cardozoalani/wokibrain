import { Command, CommandBus, CommandHandler } from './command';
import { Logger } from '../ports/logger.port';

export class InMemoryCommandBus implements CommandBus {
  private handlers: Map<string, CommandHandler<Command, unknown>> = new Map();

  constructor(private logger: Logger) {}

  async execute<T extends Command, R>(command: T): Promise<R> {
    const handler = this.handlers.get(command.commandType);

    if (!handler) {
      throw new Error(`No handler registered for command: ${command.commandType}`);
    }

    this.logger.info('Executing command', {
      commandId: command.commandId,
      commandType: command.commandType,
    });

    try {
      const result = await handler.handle(command);
      return result as R;
    } catch (error) {
      this.logger.error('Command execution failed', error as Error, {
        commandId: command.commandId,
        commandType: command.commandType,
      });
      throw error;
    }
  }

  register<T extends Command, R>(
    commandType: string,
    handler: CommandHandler<T, R>
  ): void {
    if (this.handlers.has(commandType)) {
      throw new Error(`Handler already registered for command: ${commandType}`);
    }

    this.handlers.set(commandType, handler as CommandHandler<Command, unknown>);
    this.logger.info('Command handler registered', { commandType });
  }
}



