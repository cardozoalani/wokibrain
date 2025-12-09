import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthMiddleware } from './auth.middleware';
import { JWTService } from '@infrastructure/auth/jwt.service';
import { RBACService, Permission, Role } from '@infrastructure/auth/rbac.service';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;
  let mockJWTService: any;
  let mockRBACService: any;

  beforeEach(() => {
    mockJWTService = {
      verifyAccessToken: vi.fn(),
    };

    mockRBACService = {
      hasPermission: vi.fn(),
    };

    middleware = new AuthMiddleware(mockJWTService as JWTService, mockRBACService as RBACService);
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      const payload = {
        userId: 'U1',
        email: 'test@example.com',
        roles: ['restaurant_admin'],
      };

      mockJWTService.verifyAccessToken.mockReturnValue(payload);

      const request = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      } as FastifyRequest;

      const reply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      const handler = middleware.authenticate();
      await handler(request, reply);

      expect((request as any).user).toEqual(payload);
      expect(reply.code).not.toHaveBeenCalled();
    });

    it('should return 401 for missing authorization header', async () => {
      const request = {
        headers: {},
      } as FastifyRequest;

      const reply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      const handler = middleware.authenticate();
      await handler(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockJWTService.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const request = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as FastifyRequest;

      const reply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      const handler = middleware.authenticate();
      await handler(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });

    it('should allow API key authentication', async () => {
      const request = {
        headers: {
          'x-api-key': 'api-key-123',
        },
      } as FastifyRequest;

      const reply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      const handler = middleware.authenticate();
      await handler(request, reply);

      expect(mockJWTService.verifyAccessToken).not.toHaveBeenCalled();
      expect(reply.code).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should authorize user with permission', async () => {
      const request = {
        user: {
          userId: 'U1',
          email: 'test@example.com',
          roles: [Role.RESTAURANT_ADMIN],
        },
      } as any;

      const reply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      mockRBACService.hasPermission.mockReturnValue(true);

      const handler = middleware.authorize(Permission.BOOKING_CREATE);
      await handler(request, reply);

      expect(mockRBACService.hasPermission).toHaveBeenCalled();
      expect(reply.code).not.toHaveBeenCalled();
    });

    it('should return 403 for missing permission', async () => {
      const request = {
        user: {
          userId: 'U1',
          email: 'test@example.com',
          roles: [Role.RESTAURANT_STAFF],
        },
      } as any;

      const reply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      mockRBACService.hasPermission.mockReturnValue(false);

      const handler = middleware.authorize(Permission.BOOKING_DELETE);
      await handler(request, reply);

      expect(reply.code).toHaveBeenCalledWith(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const request = {} as FastifyRequest;

      const reply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      const handler = middleware.authorize(Permission.BOOKING_CREATE);
      await handler(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
    });
  });
});
