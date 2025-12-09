import { describe, it, expect, beforeEach } from 'vitest';
import { JWTService } from './jwt.service';
import { ValidationError } from '@shared/errors';

describe('JWTService', () => {
  let jwtService: JWTService;
  const accessSecret = 'test-access-secret-key-min-32-chars';
  const refreshSecret = 'test-refresh-secret-key-min-32-chars';

  beforeEach(() => {
    jwtService = new JWTService(accessSecret, refreshSecret);
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', () => {
      const payload = {
        userId: 'U1',
        email: 'test@example.com',
        roles: ['restaurant_admin'],
        restaurantId: 'R1',
      };

      const tokens = jwtService.generateTokenPair(payload);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(900);
    });

    it('should include all payload data in access token', () => {
      const payload = {
        userId: 'U1',
        email: 'test@example.com',
        roles: ['restaurant_admin'],
        restaurantId: 'R1',
        permissions: ['booking:create'],
      };

      const tokens = jwtService.generateTokenPair(payload);
      const decoded = jwtService.verifyAccessToken(tokens.accessToken);

      expect(decoded.userId).toBe('U1');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.roles).toEqual(['restaurant_admin']);
      expect(decoded.restaurantId).toBe('R1');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const payload = {
        userId: 'U1',
        email: 'test@example.com',
        roles: ['restaurant_admin'],
      };

      const tokens = jwtService.generateTokenPair(payload);
      const decoded = jwtService.verifyAccessToken(tokens.accessToken);

      expect(decoded.userId).toBe('U1');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        jwtService.verifyAccessToken('invalid-token');
      }).toThrow(ValidationError);
    });

    it('should throw error for token signed with wrong secret', () => {
      const wrongService = new JWTService('wrong-secret', refreshSecret);
      const payload = {
        userId: 'U1',
        email: 'test@example.com',
        roles: ['restaurant_admin'],
      };

      const tokens = wrongService.generateTokenPair(payload);

      expect(() => {
        jwtService.verifyAccessToken(tokens.accessToken);
      }).toThrow(ValidationError);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const payload = {
        userId: 'U1',
        email: 'test@example.com',
        roles: ['restaurant_admin'],
      };

      const tokens = jwtService.generateTokenPair(payload);
      const decoded = jwtService.verifyRefreshToken(tokens.refreshToken);

      expect(decoded.userId).toBe('U1');
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        jwtService.verifyRefreshToken('invalid-token');
      }).toThrow(ValidationError);
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token from refresh token', () => {
      const payload = {
        userId: 'U1',
        email: 'test@example.com',
        roles: ['restaurant_admin'],
      };

      const tokens = jwtService.generateTokenPair(payload);
      const newPayload = {
        ...payload,
        permissions: ['booking:create'],
      };

      const newAccessToken = jwtService.refreshAccessToken(tokens.refreshToken, newPayload);
      const decoded = jwtService.verifyAccessToken(newAccessToken);

      expect(decoded.userId).toBe('U1');
      expect(decoded.permissions).toEqual(['booking:create']);
    });

    it('should throw error for invalid refresh token', () => {
      const payload = {
        userId: 'U1',
        email: 'test@example.com',
        roles: ['restaurant_admin'],
      };

      expect(() => {
        jwtService.refreshAccessToken('invalid-refresh-token', payload);
      }).toThrow(ValidationError);
    });
  });
});
