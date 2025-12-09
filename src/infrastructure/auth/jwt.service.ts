import jwt, { SignOptions } from 'jsonwebtoken';
import { ValidationError } from '@shared/errors';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  restaurantId?: string;
  permissions?: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string = '15m';
  private readonly refreshTokenExpiry: string = '7d';

  constructor(accessSecret: string, refreshSecret: string) {
    this.accessTokenSecret = accessSecret;
    this.refreshTokenSecret = refreshSecret;
  }

  generateTokenPair(payload: JWTPayload): TokenPair {
    const accessTokenOptions = {
      expiresIn: this.accessTokenExpiry,
      issuer: 'wokibrain',
      audience: 'wokibrain-api',
    } as SignOptions;
    const accessToken = jwt.sign(payload, this.accessTokenSecret, accessTokenOptions);

    const refreshTokenOptions = {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'wokibrain',
      audience: 'wokibrain-api',
    } as SignOptions;
    const refreshToken = jwt.sign(
      { userId: payload.userId },
      this.refreshTokenSecret,
      refreshTokenOptions
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'wokibrain',
        audience: 'wokibrain-api',
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ValidationError('Access token expired', 'token');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ValidationError('Invalid access token', 'token');
      }
      throw error;
    }
  }

  verifyRefreshToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'wokibrain',
        audience: 'wokibrain-api',
      }) as { userId: string };

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ValidationError('Refresh token expired', 'token');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ValidationError('Invalid refresh token', 'token');
      }
      throw error;
    }
  }

  refreshAccessToken(refreshToken: string, payload: JWTPayload): string {
    this.verifyRefreshToken(refreshToken);

    const accessTokenOptions = {
      expiresIn: this.accessTokenExpiry,
      issuer: 'wokibrain',
      audience: 'wokibrain-api',
    } as SignOptions;
    return jwt.sign(payload, this.accessTokenSecret, accessTokenOptions);
  }
}
