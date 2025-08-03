import { TwilioConfig } from '../config/twilio.config';
import { RedisConfig } from '../config/redis.config';
import { logger, SAMALogger } from '../utils/logger';
import { Pool } from 'pg';
import { DatabaseConfig } from '../config/database.config';
import { createMockRedis } from '../utils/mock-redis';

export class PhoneVerificationService {
  private twilio: TwilioConfig;
  private redis: any;
  private pool: Pool;

  constructor() {
    this.twilio = TwilioConfig.getInstance();
    this.redis = RedisConfig.getInstance().getClient() || createMockRedis();
    this.pool = DatabaseConfig.getInstance().getPool();
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Country-specific phone validation patterns
  private phonePatterns: Record<string, {
    code: string;
    regex: RegExp;
    localFormat: RegExp;
    name: string;
    example: string;
  }> = {
    SA: {
      code: '+966',
      regex: /^\+966[5][0-9]{8}$/,
      localFormat: /^05[0-9]{8}$/,
      name: 'Saudi Arabia',
      example: '+966501234567'
    },
    IN: {
      code: '+91',
      regex: /^\+91[6-9][0-9]{9}$/,
      localFormat: /^[6-9][0-9]{9}$/,
      name: 'India',
      example: '+919182614577'
    },
    US: {
      code: '+1',
      regex: /^\+1[2-9][0-9]{9}$/,
      localFormat: /^[2-9][0-9]{9}$/,
      name: 'United States',
      example: '+19182614577'
    }
  };

  private detectCountry(phoneNumber: string): string | null {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Check each country pattern
    for (const [countryCode, pattern] of Object.entries(this.phonePatterns)) {
      if (cleaned.startsWith(pattern.code) || pattern.localFormat.test(cleaned)) {
        return countryCode;
      }
    }
    
    return null;
  }

  private validatePhoneNumber(phoneNumber: string, countryCode?: string): { isValid: boolean; country: string | null; formatted: string } {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If country code provided, validate against that specific country
    if (countryCode && this.phonePatterns[countryCode]) {
      const pattern = this.phonePatterns[countryCode];
      const formatted = this.formatPhoneNumber(cleaned, countryCode);
      return {
        isValid: pattern.regex.test(formatted),
        country: countryCode,
        formatted
      };
    }
    
    // Auto-detect country and validate
    const detectedCountry = this.detectCountry(cleaned);
    if (detectedCountry) {
      const formatted = this.formatPhoneNumber(cleaned, detectedCountry);
      const pattern = this.phonePatterns[detectedCountry];
      if (pattern) {
        return {
          isValid: pattern.regex.test(formatted),
          country: detectedCountry,
          formatted
        };
      }
    }
    
    return {
      isValid: false,
      country: null,
      formatted: cleaned
    };
  }

  private formatPhoneNumber(phoneNumber: string, countryCode: string): string {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    const pattern = this.phonePatterns[countryCode];
    
    if (!pattern) return cleaned;
    
    // If already has country code, return as is
    if (cleaned.startsWith(pattern.code)) {
      return cleaned;
    }
    
    // Handle country-specific local formats
    switch (countryCode) {
      case 'SA':
        // Convert 05XXXXXXXX to +9665XXXXXXXX
        if (cleaned.startsWith('05')) {
          return `+9665${cleaned.substring(2)}`;
        }
        // Convert 966XXXXXXXXX to +966XXXXXXXXX
        if (cleaned.startsWith('966')) {
          return `+${cleaned}`;
        }
        // Convert 5XXXXXXXX to +9665XXXXXXXX
        if (cleaned.match(/^5[0-9]{8}$/)) {
          return `+966${cleaned}`;
        }
        break;
        
      case 'IN':
        // Convert 91XXXXXXXXXX (12 digits total) to +91XXXXXXXXXX
        if (cleaned.startsWith('91') && cleaned.length === 12) {
          return `+${cleaned}`;
        }
        // Convert XXXXXXXXXX (10 digits) to +91XXXXXXXXXX
        if (cleaned.match(/^[6-9][0-9]{9}$/)) {
          return `+91${cleaned}`;
        }
        break;
        
      case 'US':
        // Convert 1XXXXXXXXXX to +1XXXXXXXXXX
        if (cleaned.startsWith('1')) {
          return `+${cleaned}`;
        }
        // Convert XXXXXXXXXX to +1XXXXXXXXXX
        if (cleaned.match(/^[2-9][0-9]{9}$/)) {
          return `+1${cleaned}`;
        }
        break;
    }
    
    return cleaned;
  }

  private getCountryName(countryCode: string): string {
    return this.phonePatterns[countryCode]?.name || countryCode;
  }

  private getPhoneExample(countryCode: string): string {
    return this.phonePatterns[countryCode]?.example || '';
  }

  private generateSMSMessage(otp: string, countryCode: string): string {
    // Short, single-segment message for better delivery
    const shortMessage = `RABHAN OTP: ${otp}. Expires in 5 min. Do not share.`;
    
    switch (countryCode) {
      case 'SA':
        // Short Arabic + English for Saudi Arabia
        return `${shortMessage} رمز رابحان: ${otp}`;
      
      case 'IN':
        // English only for India to avoid multi-segment SMS issues
        return shortMessage;
      
      case 'US':
        // English only for United States
        return shortMessage;
      
      default:
        return shortMessage;
    }
  }

  private async getOTPAttempts(phoneNumber: string): Promise<number> {
    const key = `otp_attempts:${phoneNumber}`;
    const attempts = await this.redis.get(key);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  private async incrementOTPAttempts(phoneNumber: string): Promise<void> {
    const key = `otp_attempts:${phoneNumber}`;
    const attempts = await this.getOTPAttempts(phoneNumber);
    await this.redis.setex(key, 3600, attempts + 1); // 1 hour expiry
  }

  private async clearOTPAttempts(phoneNumber: string): Promise<void> {
    const key = `otp_attempts:${phoneNumber}`;
    await this.redis.del(key);
  }

  public async sendOTP(phoneNumber: string, userId?: string, countryCode?: string): Promise<void> {
    try {
      // Validate and format phone number for any supported country
      const validation = this.validatePhoneNumber(phoneNumber, countryCode);
      
      if (!validation.isValid || !validation.country) {
        const supportedCountries = Object.values(this.phonePatterns)
          .map(p => `${p.name} (${p.example})`)
          .join(', ');
        throw new Error(`Invalid phone number format. Supported countries: ${supportedCountries}`);
      }
      
      const formattedPhone = validation.formatted;
      const detectedCountry = validation.country;

      // Check rate limiting - max 5 attempts per hour
      const attempts = await this.getOTPAttempts(formattedPhone);
      if (attempts >= 5) {
        SAMALogger.logSecurityEvent('OTP_RATE_LIMIT_EXCEEDED', 'MEDIUM', {
          phoneNumber: formattedPhone,
          userId,
          attempts
        });
        throw new Error('Too many OTP requests. Please try again later.');
      }

      // Generate OTP
      const otp = this.generateOTP();
      const otpKey = `phone_otp:${formattedPhone}`;

      // Store OTP in Redis with 5-minute expiry
      await this.redis.setex(otpKey, 300, otp);

      // 🚀 DEVELOPMENT MODE: Use dummy OTP for easier testing
      // TODO: Remove this bypass in production and restore Twilio functionality
      const isDevelopmentMode = process.env.NODE_ENV === 'development' || process.env.USE_DUMMY_OTP === 'true';
      
      if (isDevelopmentMode) {
        // Store dummy OTP '123456' for easy testing
        const dummyOTP = '123456';
        await this.redis.setex(otpKey, 300, dummyOTP);
        
        logger.info(`🧪 DEVELOPMENT MODE: Using dummy OTP '${dummyOTP}' for ${formattedPhone}`);
        logger.info(`📱 Real OTP would have been: ${otp}`);
        
        // Log for SAMA compliance (development mode)
        SAMALogger.logAuthEvent('PHONE_OTP_SENT_DUMMY', userId || 'unknown', {
          phoneNumber: formattedPhone,
          country: detectedCountry,
          countryName: this.getCountryName(detectedCountry),
          attempts: attempts + 1,
          developmentMode: true
        });
      } else {
        // PRODUCTION MODE: Use real Twilio SMS
        
        // Validate phone number with Twilio
        const isValidNumber = await this.twilio.validatePhoneNumber(formattedPhone);
        if (!isValidNumber) {
          logger.warn(`Twilio validation failed for ${formattedPhone}, but proceeding with Saudi validation`);
        }

        // Send SMS via Twilio with country-specific message
        const message = this.generateSMSMessage(otp, detectedCountry);
        await this.twilio.sendSMS(formattedPhone, message);

        // Log for SAMA compliance (production mode)
        SAMALogger.logAuthEvent('PHONE_OTP_SENT', userId || 'unknown', {
          phoneNumber: formattedPhone,
          country: detectedCountry,
          countryName: this.getCountryName(detectedCountry),
          attempts: attempts + 1
        });

        logger.info(`OTP sent to ${formattedPhone} (${this.getCountryName(detectedCountry)})`);
      }

      // Increment attempts
      await this.incrementOTPAttempts(formattedPhone);

    } catch (error) {
      logger.error('Send OTP error:', error);
      SAMALogger.logSecurityEvent('PHONE_OTP_SEND_FAILED', 'HIGH', {
        phoneNumber: phoneNumber,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public async verifyOTP(phoneNumber: string, otp: string, userId?: string, countryCode?: string): Promise<boolean> {
    try {
      // Validate and format phone number
      const validation = this.validatePhoneNumber(phoneNumber, countryCode);
      
      if (!validation.isValid || !validation.country) {
        throw new Error('Invalid phone number format');
      }
      
      const formattedPhone = validation.formatted;
      const detectedCountry = validation.country;
      const otpKey = `phone_otp:${formattedPhone}`;
      const storedOTP = await this.redis.get(otpKey);

      if (!storedOTP) {
        SAMALogger.logSecurityEvent('PHONE_OTP_EXPIRED', 'LOW', {
          phoneNumber: formattedPhone,
          country: detectedCountry,
          userId
        });
        throw new Error('OTP expired or not found');
      }

      if (storedOTP !== otp) {
        SAMALogger.logSecurityEvent('PHONE_OTP_INVALID', 'MEDIUM', {
          phoneNumber: formattedPhone,
          country: detectedCountry,
          userId,
          providedOTP: otp
        });
        throw new Error('Invalid OTP');
      }

      // OTP is valid, remove it and clear attempts
      await this.redis.del(otpKey);
      await this.clearOTPAttempts(formattedPhone);

      // Store verified phone for registration process (24 hour expiry)
      const verifiedPhoneKey = `verified_phone:${formattedPhone}`;
      await this.redis.setex(verifiedPhoneKey, 86400, 'true');

      // Update user's phone verification status
      if (userId) {
        await this.updatePhoneVerificationStatus(userId, formattedPhone);
      }

      // Log successful verification
      SAMALogger.logAuthEvent('PHONE_VERIFICATION_SUCCESS', userId || 'unknown', {
        phoneNumber: formattedPhone,
        country: detectedCountry,
        countryName: this.getCountryName(detectedCountry)
      });

      logger.info(`Phone verification successful for ${formattedPhone} (${this.getCountryName(detectedCountry)})`);
      return true;
    } catch (error) {
      logger.error('Verify OTP error:', error);
      throw error;
    }
  }

  private async updatePhoneVerificationStatus(userId: string, phoneNumber: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE users SET phone_verified = true, phone_verified_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
    } finally {
      client.release();
    }
  }

  public async resendOTP(phoneNumber: string, userId?: string, countryCode?: string): Promise<void> {
    // Same as sendOTP but with additional logging
    const validation = this.validatePhoneNumber(phoneNumber, countryCode);
    const formattedPhone = validation.formatted;
    const detectedCountry = validation.country;
    
    SAMALogger.logAuthEvent('PHONE_OTP_RESEND', userId || 'unknown', {
      phoneNumber: formattedPhone,
      country: detectedCountry
    });
    
    await this.sendOTP(phoneNumber, userId, countryCode);
  }

  // Public method to get supported countries for frontend
  public getSupportedCountries(): Array<{code: string; name: string; example: string; countryCode: string}> {
    return Object.entries(this.phonePatterns).map(([code, pattern]) => ({
      code,
      name: pattern.name,
      example: pattern.example,
      countryCode: pattern.code
    }));
  }

  // Public method to validate phone number (for API endpoints)
  public validatePhoneNumberPublic(phoneNumber: string, countryCode?: string): { isValid: boolean; country: string | null; formatted: string; countryName?: string } {
    const validation = this.validatePhoneNumber(phoneNumber, countryCode);
    return {
      ...validation,
      countryName: validation.country ? this.getCountryName(validation.country) : undefined
    };
  }

  // Check if phone number has been verified (for registration)
  public async isPhoneVerified(phoneNumber: string): Promise<boolean> {
    const validation = this.validatePhoneNumber(phoneNumber);
    if (!validation.isValid) return false;
    
    const verifiedPhoneKey = `verified_phone:${validation.formatted}`;
    const isVerified = await this.redis.get(verifiedPhoneKey);
    return isVerified === 'true';
  }

  // 🚀 DEVELOPMENT HELPER: Check if using dummy OTP mode
  public isDummyOTPMode(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.USE_DUMMY_OTP === 'true';
  }

  // 🚀 DEVELOPMENT HELPER: Get dummy OTP for testing
  public getDummyOTP(): string {
    return '123456';
  }

  // 🚀 DEVELOPMENT HELPER: Method to easily test OTP verification
  public async testOTPVerification(phoneNumber: string, userId?: string): Promise<{ otp: string; message: string }> {
    if (!this.isDummyOTPMode()) {
      throw new Error('Test OTP verification is only available in development mode');
    }

    const validation = this.validatePhoneNumber(phoneNumber);
    if (!validation.isValid || !validation.country) {
      throw new Error('Invalid phone number format');
    }

    const formattedPhone = validation.formatted;
    const dummyOTP = this.getDummyOTP();

    return {
      otp: dummyOTP,
      message: `🧪 Test mode: Use OTP '${dummyOTP}' for phone ${formattedPhone}`
    };
  }
}