import { describe, it, expect, vi } from 'vitest';
import { ZodError } from 'zod';
import { NotFoundError } from '@shared/errors';
import errorHandlerPlugin from './error-handler.plugin';
import { FastifyInstance } from 'fastify';

describe('error-handler.plugin', () => {
  it('should handle ZodError with 400 status', async () => {
    const mockFastify = {
      setErrorHandler: vi.fn(),
      log: {
        error: vi.fn(),
      },
    } as unknown as FastifyInstance;

    await errorHandlerPlugin(mockFastify);

    const errorHandler = (mockFastify.setErrorHandler as any).mock.calls[0][0];
    const zodError = new ZodError([
      {
        path: ['partySize'],
        message: 'Expected number, received string',
        code: 'invalid_type',
      },
    ]);

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };

    errorHandler(zodError, {} as any, reply as any);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'VALIDATION_ERROR',
        issues: expect.any(Array),
      })
    );
  });

  it('should handle DomainError with appropriate status code', async () => {
    const mockFastify = {
      setErrorHandler: vi.fn(),
      log: {
        error: vi.fn(),
      },
    } as unknown as FastifyInstance;

    await errorHandlerPlugin(mockFastify);

    const errorHandler = (mockFastify.setErrorHandler as any).mock.calls[0][0];
    const domainError = new NotFoundError('Booking', 'B1');

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };

    errorHandler(domainError, {} as any, reply as any);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'NOT_FOUND',
      })
    );
  });

  it('should handle generic errors with 500 status', async () => {
    const mockFastify = {
      setErrorHandler: vi.fn(),
      log: {
        error: vi.fn(),
      },
    } as unknown as FastifyInstance;

    await errorHandlerPlugin(mockFastify);

    const errorHandler = (mockFastify.setErrorHandler as any).mock.calls[0][0];
    const genericError = new Error('Unexpected error');

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };

    errorHandler(genericError, {} as any, reply as any);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'INTERNAL_SERVER_ERROR',
      })
    );
  });
});
