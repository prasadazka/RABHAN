import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import { DatabaseConfig } from '../config/database.config';
import { RedisConfig } from '../config/redis.config';
import { logger, SAMALogger } from '../utils/logger';
import { ValidationUtils } from '../utils/validation.utils';
import { EmailService } from './email.service';
import { PhoneVerificationService } from './phone-verification.service';

export enum VerificationType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  PASSWORD_RESET = 'PASSWORD_RESET'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED'
}

export interface VerificationToken {
  id: string;
  userId: string;
  verificationType: VerificationType;
  token: string;
  code?: string;
  targetValue: string;
  status: VerificationStatus;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendVerificationRequest {
  userId: string;
  type: VerificationType;
  targetValue: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface VerifyCodeRequest {
  userId: string;
  token?: string;
  code?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  resetTime?: Date;
}

export class VerificationService {
  private pool: Pool;
  private redis: any;
  private emailService: EmailService;
  private phoneVerificationService: PhoneVerificationService;

  constructor() {
    this.pool = DatabaseConfig.getInstance().getPool();
    this.redis = RedisConfig.getInstance().getClient();
    this.emailService = new EmailService();
    this.phoneVerificationService = new PhoneVerificationService();
  }

  /**
   * Send verification code/link
   */
  async sendVerification(request: SendVerificationRequest): Promise<{ success: boolean; message: string }> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check rate limits
      const rateLimit = await this.checkRateLimit(
        request.userId,
        request.ipAddress,
        request.type,
        request.targetValue
      );
      
      if (!rateLimit.allowed) {
        SAMALogger.logSecurityEvent('VERIFICATION_RATE_LIMIT_EXCEEDED', 'MEDIUM', {
          userId: request.userId,
          type: request.type,
          targetValue: request.targetValue,
          reason: rateLimit.reason
        });
        
        throw new Error(`Rate limit exceeded: ${rateLimit.reason}`);
      }
      
      // Clean up any existing pending verification for this user/type/target
      await this.cleanupPendingVerifications(request.userId, request.type, request.targetValue);
      
      // Generate verification token and code
      const token = this.generateSecureToken();
      const code = request.type === VerificationType.PHONE ? this.generateOTPCode() : undefined;
      
      // Calculate expiry (15 minutes for phone, 24 hours for email)
      const expiryMinutes = request.type === VerificationType.PHONE ? 15 : 1440;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
      
      // Store verification token
      const insertTokenQuery = `
        INSERT INTO verification_tokens (
          user_id, verification_type, token, code, target_value, 
          expires_at, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
      
      const tokenResult = await client.query(insertTokenQuery, [
        request.userId,
        request.type,
        token,
        code,
        request.targetValue,
        expiresAt,
        request.ipAddress,
        request.userAgent
      ]);
      
      const tokenId = tokenResult.rows[0].id;
      
      // Log attempt
      await this.logVerificationAttempt(
        tokenId,
        request.userId,
        'SEND',
        true,
        undefined,
        request.ipAddress,
        request.userAgent
      );
      
      await client.query('COMMIT');
      
      // Send verification message
      let sendResult = { success: false, message: '' };
      
      if (request.type === VerificationType.EMAIL) {
        sendResult = await this.emailService.sendVerificationEmail(
          request.targetValue,
          token,
          request.userId
        );
      } else if (request.type === VerificationType.PHONE) {
        await this.phoneVerificationService.sendOTP(
          request.targetValue,
          request.userId
        );
        sendResult = { success: true, message: 'Phone OTP sent successfully' };
      }
      
      // Log SAMA compliance event
      SAMALogger.logAuthEvent('VERIFICATION_SENT', request.userId, {
        type: request.type,
        targetValue: request.targetValue,
        tokenId,
        success: sendResult.success
      });
      
      if (!sendResult.success) {
        throw new Error(sendResult.message);
      }
      
      return {
        success: true,
        message: this.getSuccessMessage(request.type)
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Send verification failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify code or token
   */
  async verifyCode(request: VerifyCodeRequest): Promise<{ success: boolean; message: string }> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Find verification token
      const findTokenQuery = `
        SELECT * FROM verification_tokens 
        WHERE user_id = $1 
          AND status = 'PENDING' 
          AND expires_at > CURRENT_TIMESTAMP
          AND (token = $2 OR code = $3)
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const tokenResult = await client.query(findTokenQuery, [
        request.userId,
        request.token,
        request.code
      ]);
      
      if (tokenResult.rows.length === 0) {
        await this.logVerificationAttempt(
          null,
          request.userId,
          'VERIFY',
          false,
          'Token not found or expired',
          request.ipAddress,
          request.userAgent
        );
        
        SAMALogger.logSecurityEvent('VERIFICATION_INVALID_TOKEN', 'MEDIUM', {
          userId: request.userId,
          providedToken: request.token,
          providedCode: request.code
        });
        
        throw new Error('Invalid or expired verification code');
      }
      
      const verificationToken = tokenResult.rows[0];
      
      // Check if max attempts exceeded
      if (verificationToken.attempts >= verificationToken.max_attempts) {
        await client.query(
          'UPDATE verification_tokens SET status = $1 WHERE id = $2',
          [VerificationStatus.FAILED, verificationToken.id]
        );
        
        await this.logVerificationAttempt(
          verificationToken.id,
          request.userId,
          'VERIFY',
          false,
          'Max attempts exceeded',
          request.ipAddress,
          request.userAgent
        );
        
        SAMALogger.logSecurityEvent('VERIFICATION_MAX_ATTEMPTS_EXCEEDED', 'HIGH', {
          userId: request.userId,
          tokenId: verificationToken.id,
          attempts: verificationToken.attempts
        });
        
        throw new Error('Maximum verification attempts exceeded');
      }
      
      // Verify the code/token
      const isValid = request.token 
        ? request.token === verificationToken.token
        : request.code === verificationToken.code;
      
      if (!isValid) {
        // Increment attempts
        await client.query(
          'UPDATE verification_tokens SET attempts = attempts + 1 WHERE id = $1',
          [verificationToken.id]
        );
        
        await this.logVerificationAttempt(
          verificationToken.id,
          request.userId,
          'VERIFY',
          false,
          'Invalid code/token',
          request.ipAddress,
          request.userAgent
        );
        
        SAMALogger.logSecurityEvent('VERIFICATION_INVALID_CODE', 'MEDIUM', {
          userId: request.userId,
          tokenId: verificationToken.id,
          attempts: verificationToken.attempts + 1
        });
        
        throw new Error('Invalid verification code');
      }
      
      // Mark as verified
      await client.query(
        'UPDATE verification_tokens SET status = $1, verified_at = CURRENT_TIMESTAMP WHERE id = $2',
        [VerificationStatus.VERIFIED, verificationToken.id]
      );
      
      // Update user verification status
      if (verificationToken.verification_type === VerificationType.EMAIL) {
        await client.query(
          'UPDATE users SET email_verified = TRUE WHERE id = $1',
          [request.userId]
        );
      } else if (verificationToken.verification_type === VerificationType.PHONE) {
        await client.query(
          'UPDATE users SET phone_verified = TRUE WHERE id = $1',
          [request.userId]
        );
      }
      
      await this.logVerificationAttempt(
        verificationToken.id,
        request.userId,
        'VERIFY',
        true,
        undefined,
        request.ipAddress,
        request.userAgent
      );
      
      await client.query('COMMIT');
      
      // Log SAMA compliance event
      SAMALogger.logAuthEvent('VERIFICATION_COMPLETED', request.userId, {
        type: verificationToken.verification_type,
        targetValue: verificationToken.target_value,
        tokenId: verificationToken.id
      });
      
      // Clear cache
      await this.clearUserVerificationCache(request.userId);
      
      return {
        success: true,
        message: this.getVerificationSuccessMessage(verificationToken.verification_type)
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Verify code failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Resend verification
   */
  async resendVerification(userId: string, type: VerificationType, ipAddress?: string, userAgent?: string): Promise<{ success: boolean; message: string }> {
    // Get user's email/phone for the type
    const getUserQuery = 'SELECT email, phone FROM users WHERE id = $1';
    const userResult = await this.pool.query(getUserQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = userResult.rows[0];
    const targetValue = type === VerificationType.EMAIL ? user.email : user.phone;
    
    if (!targetValue) {
      throw new Error(`${type.toLowerCase()} not available for verification`);
    }
    
    return this.sendVerification({
      userId,
      type,
      targetValue,
      ipAddress,
      userAgent
    });
  }

  /**
   * Check verification status
   */
  async getVerificationStatus(userId: string): Promise<{ emailVerified: boolean; phoneVerified: boolean }> {
    const cached = await this.getUserVerificationCache(userId);
    if (cached) return cached;
    
    const getUserQuery = 'SELECT email_verified, phone_verified FROM users WHERE id = $1';
    const result = await this.pool.query(getUserQuery, [userId]);
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const status = {
      emailVerified: result.rows[0].email_verified,
      phoneVerified: result.rows[0].phone_verified
    };
    
    await this.cacheUserVerificationStatus(userId, status);
    return status;
  }

  private async checkRateLimit(userId: string, ipAddress: string | undefined, type: VerificationType, targetValue: string): Promise<RateLimitResult> {
    const checkQuery = `
      SELECT * FROM verification_rate_limits 
      WHERE (user_id = $1 OR ip_address = $2) 
        AND verification_type = $3 
        AND target_value = $4
    `;
    
    const result = await this.pool.query(checkQuery, [userId, ipAddress, type, targetValue]);
    
    if (result.rows.length === 0) {
      // Create new rate limit record
      await this.pool.query(
        'INSERT INTO verification_rate_limits (user_id, ip_address, verification_type, target_value) VALUES ($1, $2, $3, $4)',
        [userId, ipAddress, type, targetValue]
      );
      return { allowed: true };
    }
    
    const rateLimitRecord = result.rows[0];
    const maxRequests = 5;
    const windowMinutes = 60;
    
    // Check if blocked
    if (rateLimitRecord.blocked_until && new Date(rateLimitRecord.blocked_until) > new Date()) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        resetTime: new Date(rateLimitRecord.blocked_until)
      };
    }
    
    // Check if within window
    const windowStart = new Date(rateLimitRecord.window_start);
    const windowEnd = new Date(windowStart.getTime() + windowMinutes * 60 * 1000);
    
    if (new Date() < windowEnd) {
      if (rateLimitRecord.request_count >= maxRequests) {
        // Block for 1 hour
        const blockedUntil = new Date(Date.now() + 60 * 60 * 1000);
        await this.pool.query(
          'UPDATE verification_rate_limits SET blocked_until = $1 WHERE id = $2',
          [blockedUntil, rateLimitRecord.id]
        );
        
        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          resetTime: blockedUntil
        };
      }
      
      // Increment counter
      await this.pool.query(
        'UPDATE verification_rate_limits SET request_count = request_count + 1 WHERE id = $1',
        [rateLimitRecord.id]
      );
    } else {
      // Reset window
      await this.pool.query(
        'UPDATE verification_rate_limits SET request_count = 1, window_start = CURRENT_TIMESTAMP, blocked_until = NULL WHERE id = $1',
        [rateLimitRecord.id]
      );
    }
    
    return { allowed: true };
  }

  private async cleanupPendingVerifications(userId: string, type: VerificationType, targetValue: string): Promise<void> {
    await this.pool.query(
      'UPDATE verification_tokens SET status = $1 WHERE user_id = $2 AND verification_type = $3 AND target_value = $4 AND status = $5',
      [VerificationStatus.EXPIRED, userId, type, targetValue, VerificationStatus.PENDING]
    );
  }

  private async logVerificationAttempt(
    tokenId: string | null,
    userId: string,
    attemptType: string,
    success: boolean,
    errorMessage?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.pool.query(
        'INSERT INTO verification_attempts (verification_token_id, user_id, attempt_type, success, error_message, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [tokenId, userId, attemptType, success, errorMessage, ipAddress, userAgent]
      );
    } catch (error) {
      logger.error('Failed to log verification attempt:', error);
    }
  }

  private generateSecureToken(): string {
    return uuidv4().replace(/-/g, '');
  }

  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getSuccessMessage(type: VerificationType): string {
    switch (type) {
      case VerificationType.EMAIL:
        return 'Verification email sent successfully';
      case VerificationType.PHONE:
        return 'Verification code sent to your phone';
      default:
        return 'Verification sent successfully';
    }
  }

  private getVerificationSuccessMessage(type: VerificationType): string {
    switch (type) {
      case VerificationType.EMAIL:
        return 'Email verified successfully';
      case VerificationType.PHONE:
        return 'Phone number verified successfully';
      default:
        return 'Verification completed successfully';
    }
  }

  private async cacheUserVerificationStatus(userId: string, status: { emailVerified: boolean; phoneVerified: boolean }): Promise<void> {
    const key = `user_verification:${userId}`;
    await this.redis.setex(key, 3600, JSON.stringify(status));
  }

  private async getUserVerificationCache(userId: string): Promise<{ emailVerified: boolean; phoneVerified: boolean } | null> {
    const key = `user_verification:${userId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async clearUserVerificationCache(userId: string): Promise<void> {
    const key = `user_verification:${userId}`;
    await this.redis.del(key);
  }
}