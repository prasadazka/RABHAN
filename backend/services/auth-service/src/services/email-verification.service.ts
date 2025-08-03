import { SendGridConfig } from '../config/sendgrid.config';
import { RedisConfig } from '../config/redis.config';
import { logger, SAMALogger } from '../utils/logger';
import { Pool } from 'pg';
import { DatabaseConfig } from '../config/database.config';
import { config } from '../config/environment.config';
import crypto from 'crypto';

export class EmailVerificationService {
  private sendgrid: SendGridConfig;
  private redis: any;
  private pool: Pool;

  constructor() {
    this.sendgrid = SendGridConfig.getInstance();
    this.redis = RedisConfig.getInstance().getClient();
    this.pool = DatabaseConfig.getInstance().getPool();
  }

  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async getEmailAttempts(email: string): Promise<number> {
    const key = `email_attempts:${email}`;
    const attempts = await this.redis.get(key);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  private async incrementEmailAttempts(email: string): Promise<void> {
    const key = `email_attempts:${email}`;
    const attempts = await this.getEmailAttempts(email);
    await this.redis.setex(key, 3600, attempts + 1); // 1 hour expiry
  }

  private async clearEmailAttempts(email: string): Promise<void> {
    const key = `email_attempts:${email}`;
    await this.redis.del(key);
  }

  public async sendVerificationEmail(email: string, userId: string, userFullName?: string): Promise<void> {
    try {
      // Check rate limiting - max 5 attempts per hour
      const attempts = await this.getEmailAttempts(email);
      if (attempts >= 5) {
        SAMALogger.logSecurityEvent('EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED', 'MEDIUM', {
          email,
          userId,
          attempts
        });
        throw new Error('Too many email verification requests. Please try again later.');
      }

      // Generate verification token
      const token = this.generateVerificationToken();
      const tokenKey = `email_verification:${token}`;

      // Store token in Redis with 24-hour expiry
      await this.redis.setex(tokenKey, 86400, JSON.stringify({
        userId,
        email,
        createdAt: new Date().toISOString()
      }));

      // Generate verification URL
      const verificationUrl = `${config.isDevelopment ? 'http://localhost:3000' : 'https://rabhan.sa'}/verify-email?token=${token}`;

      // Send email
      if (config.sendgrid.emailVerificationTemplateId) {
        // Use SendGrid template
        await this.sendgrid.sendTemplateEmail(email, config.sendgrid.emailVerificationTemplateId, {
          user_name: userFullName || 'User',
          verification_url: verificationUrl,
          company_name: 'RABHAN'
        });
      } else {
        // Use custom HTML template
        const htmlContent = this.generateVerificationEmailHTML(verificationUrl, userFullName);
        await this.sendgrid.sendEmail(email, 'Verify Your RABHAN Account', htmlContent);
      }

      // Increment attempts
      await this.incrementEmailAttempts(email);

      // Log for SAMA compliance
      SAMALogger.logAuthEvent('EMAIL_VERIFICATION_SENT', userId, {
        email,
        attempts: attempts + 1
      });

      logger.info(`Email verification sent to ${email}`);
    } catch (error) {
      logger.error('Send verification email error:', error);
      SAMALogger.logSecurityEvent('EMAIL_VERIFICATION_SEND_FAILED', 'HIGH', {
        email,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public async sendOTPEmail(email: string, userId?: string): Promise<void> {
    try {
      // Check rate limiting
      const attempts = await this.getEmailAttempts(email);
      if (attempts >= 5) {
        throw new Error('Too many email OTP requests. Please try again later.');
      }

      // Generate OTP
      const otp = this.generateOTP();
      const otpKey = `email_otp:${email}`;

      // Store OTP in Redis with 15-minute expiry
      await this.redis.setex(otpKey, 900, otp);

      // Send OTP email
      const htmlContent = this.generateOTPEmailHTML(otp);
      await this.sendgrid.sendEmail(email, 'Your RABHAN Verification Code', htmlContent);

      // Increment attempts
      await this.incrementEmailAttempts(email);

      // Log for SAMA compliance
      SAMALogger.logAuthEvent('EMAIL_OTP_SENT', userId || 'unknown', {
        email,
        attempts: attempts + 1
      });

      logger.info(`Email OTP sent to ${email}`);
    } catch (error) {
      logger.error('Send email OTP error:', error);
      throw error;
    }
  }

  public async verifyToken(token: string): Promise<{ userId: string; email: string }> {
    try {
      const tokenKey = `email_verification:${token}`;
      const tokenData = await this.redis.get(tokenKey);

      if (!tokenData) {
        SAMALogger.logSecurityEvent('EMAIL_VERIFICATION_TOKEN_EXPIRED', 'LOW', {
          token: token.substring(0, 8) + '...'
        });
        throw new Error('Verification token expired or not found');
      }

      const { userId, email } = JSON.parse(tokenData);

      // Remove token after use
      await this.redis.del(tokenKey);
      await this.clearEmailAttempts(email);

      // Update user's email verification status
      await this.updateEmailVerificationStatus(userId);

      // Log successful verification
      SAMALogger.logAuthEvent('EMAIL_VERIFICATION_SUCCESS', userId, {
        email
      });

      logger.info(`Email verification successful for ${email}`);
      return { userId, email };
    } catch (error) {
      logger.error('Verify email token error:', error);
      throw error;
    }
  }

  public async verifyOTP(email: string, otp: string, userId?: string): Promise<boolean> {
    try {
      const otpKey = `email_otp:${email}`;
      const storedOTP = await this.redis.get(otpKey);

      if (!storedOTP) {
        throw new Error('OTP expired or not found');
      }

      if (storedOTP !== otp) {
        SAMALogger.logSecurityEvent('EMAIL_OTP_INVALID', 'MEDIUM', {
          email,
          userId,
          providedOTP: otp
        });
        throw new Error('Invalid OTP');
      }

      // OTP is valid, remove it and clear attempts
      await this.redis.del(otpKey);
      await this.clearEmailAttempts(email);

      // Update user's email verification status if userId provided
      if (userId) {
        await this.updateEmailVerificationStatus(userId);
      }

      // Log successful verification
      SAMALogger.logAuthEvent('EMAIL_OTP_VERIFICATION_SUCCESS', userId || 'unknown', {
        email
      });

      logger.info(`Email OTP verification successful for ${email}`);
      return true;
    } catch (error) {
      logger.error('Verify email OTP error:', error);
      throw error;
    }
  }

  private async updateEmailVerificationStatus(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE users SET email_verified = true, email_verified_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
    } finally {
      client.release();
    }
  }

  private generateVerificationEmailHTML(verificationUrl: string, userFullName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your RABHAN Account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3eb2b1; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #3eb2b1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RABHAN</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hello ${userFullName || 'User'},</p>
            <p>Thank you for registering with RABHAN. Please click the button below to verify your email address and complete your account setup.</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p>This link will expire in 24 hours for security reasons.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 RABHAN. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateOTPEmailHTML(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your RABHAN Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3eb2b1; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .otp-code { font-size: 32px; font-weight: bold; color: #3eb2b1; text-align: center; padding: 20px; background: white; border-radius: 10px; margin: 20px 0; letter-spacing: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RABHAN</h1>
          </div>
          <div class="content">
            <h2>Your Verification Code</h2>
            <p>Use this code to verify your email address:</p>
            <div class="otp-code">${otp}</div>
            <p>This code will expire in 15 minutes for security reasons.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 RABHAN. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}