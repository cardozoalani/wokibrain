import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryCommandBus } from './command-bus.impl';
import { Command } from './command';

describe('InMemoryCommandBus', () => {
  let commandBus: InMemoryCommandBus;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    commandBus = new InMemoryCommandBus(mockLogger);
  });

  it('should execute command with registered handler', async () => {
    const command = {
      commandId: 'cmd-1',
      commandType: 'CreateBooking',
    } as Command;

    const handler = {
      handle: vi.fn().mockResolvedValue({ id: 'B1' }),
    };

    commandBus.register('CreateBooking', handler);

    const result = await commandBus.execute(command);

    expect(result).toEqual({ id: 'B1' });
    expect(handler.handle).toHaveBeenCalledWith(command);
  });

  it('should throw error for unregistered command', async () => {
    const command = {
      commandId: 'cmd-1',
      commandType: 'UnknownCommand',
    } as Command;

    await expect(commandBus.execute(command)).rejects.toThrow('No handler registered');
  });

  it('should throw error when registering duplicate handler', () => {
    const handler1 = { handle: vi.fn() };
    const handler2 = { handle: vi.fn() };

    commandBus.register('CreateBooking', handler1);

    expect(() => {
      commandBus.register('CreateBooking', handler2);
    }).toThrow('Handler already registered');
  });

  it('should log errors when command execution fails', async () => {
    const command = {
      commandId: 'cmd-1',
      commandType: 'CreateBooking',
    } as Command;

    const handler = {
      handle: vi.fn().mockRejectedValue(new Error('Test error')),
    };

    commandBus.register('CreateBooking', handler);

    await expect(commandBus.execute(command)).rejects.toThrow('Test error');
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
