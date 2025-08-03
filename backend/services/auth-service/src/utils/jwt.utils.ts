import jwt from 'jsonwebtoken';
import ms from 'ms';
import { config } from '../config/environment.config';
import { JWTPayload, UserRole } from '../types/auth.types';

export class JWTUtils {
  public static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiresIn,
      issuer: 'rabhan-auth-service',
      audience: 'rabhan-platform'
    });
  }

  public static generateRefreshToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshTokenExpiresIn,
      issuer: 'rabhan-auth-service',
      audience: 'rabhan-platform'
    });
  }

  public static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: 'rabhan-auth-service',
        audience: 'rabhan-platform'
      }) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  public static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'rabhan-auth-service',
        audience: 'rabhan-platform'
      }) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  public static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  public static getExpiresInMs(expiresIn: string): number {
    return ms(expiresIn);
  }

  public static generateTokenPair(userId: string, email: string, role: UserRole, sessionId: string): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    const payload: JWTPayload = {
      userId,
      email,
      role,
      sessionId
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    const expiresIn = this.getExpiresInMs(config.jwt.accessTokenExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  public static isTokenExpiringSoon(token: string, thresholdMs: number = 5 * 60 * 1000): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;

      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      return timeUntilExpiry <= thresholdMs;
    } catch {
      return true;
    }
  }
}