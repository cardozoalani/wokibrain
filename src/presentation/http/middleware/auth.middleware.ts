import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTService } from '@infrastructure/auth/jwt.service';
import { RBACService, Permission } from '@infrastructure/auth/rbac.service';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    email: string;
    roles: string[];
    restaurantId?: string;
  };
}

export class AuthMiddleware {
  constructor(
    private jwtService: JWTService,
    private rbacService: RBACService
  ) {}

  authenticate() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const authHeader = request.headers.authorization;
      const apiKey = request.headers['x-api-key'] as string;

      if (apiKey) {
        return;
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          detail: 'Missing or invalid authorization header',
        });
      }

      const token = authHeader.substring(7);

      try {
        const payload = this.jwtService.verifyAccessToken(token);
        (request as AuthenticatedRequest).user = payload;
      } catch (error) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          detail: 'Invalid or expired token',
        });
      }
    };
  }

  authorize(permission: Permission) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const user = (request as AuthenticatedRequest).user;

      if (!user) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          detail: 'Authentication required',
        });
      }

      const hasPermission = this.rbacService.hasPermission(user.roles as any, permission);

      if (!hasPermission) {
        return reply.code(403).send({
          error: 'FORBIDDEN',
          detail: `Missing required permission: ${permission}`,
        });
      }
    };
  }
}
