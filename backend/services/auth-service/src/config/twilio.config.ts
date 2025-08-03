import { Twilio } from 'twilio';
import { config } from './environment.config';
import { logger } from '../utils/logger';

export class TwilioConfig {
  private static instance: TwilioConfig;
  private client: Twilio | null;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    
    // In development, allow missing or invalid Twilio credentials for testing
    const hasValidCredentials = config.twilio.accountSid && 
                               config.twilio.authToken && 
                               config.twilio.phoneNumber &&
                               config.twilio.accountSid.startsWith('AC') && // Valid Twilio Account SID format
                               config.twilio.authToken.length > 10; // Basic auth token validation
    
    if (!hasValidCredentials) {
      if (this.isDevelopment) {
        logger.warn('Twilio configuration missing or invalid - running in development mode with mock SMS');
        this.client = null;
        return;
      } else {
        throw new Error('Twilio configuration missing or invalid: TWILIO_ACCOUNT_SID (starts with AC), TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are required');
      }
    }

    this.client = new Twilio(config.twilio.accountSid, config.twilio.authToken);
    logger.info('Twilio client initialized');
  }

  public static getInstance(): TwilioConfig {
    if (!TwilioConfig.instance) {
      TwilioConfig.instance = new TwilioConfig();
    }
    return TwilioConfig.instance;
  }

  public getClient(): Twilio | null {
    return this.client;
  }

  public getPhoneNumber(): string {
    return config.twilio.phoneNumber || '';
  }

  public async sendSMS(to: string, body: string): Promise<void> {
    // Mock SMS in development mode when Twilio is not configured
    if (!this.client && this.isDevelopment) {
      logger.info(`[MOCK SMS] Would send to ${to}: ${body}`);
      // Simulate delay like real SMS service
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }

    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      logger.info(`Attempting to send SMS to ${to} from ${config.twilio.phoneNumber}`);
      const message = await this.client.messages.create({
        body,
        to,
        from: config.twilio.phoneNumber || '',
      });
      logger.info(`SMS sent successfully to ${to}`, {
        messageSid: message.sid,
        status: message.status,
        direction: message.direction,
        price: message.price,
        priceUnit: message.priceUnit
      });
    } catch (error: any) {
      logger.error('Twilio SMS error:', {
        error: error.message,
        code: error.code,
        moreInfo: error.moreInfo,
        status: error.status,
        details: error
      });
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  public async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    // Mock validation in development mode when Twilio is not configured
    if (!this.client && this.isDevelopment) {
      logger.info(`[MOCK VALIDATION] Phone ${phoneNumber} - assuming valid`);
      // Basic validation for Saudi/Indian numbers
      const saudiRegex = /^\+966[5][0-9]{8}$/;
      const indianRegex = /^\+91[6-9][0-9]{9}$/;
      return saudiRegex.test(phoneNumber) || indianRegex.test(phoneNumber);
    }

    if (!this.client) {
      logger.warn('Twilio client not initialized, assuming phone number is valid');
      return true;
    }

    try {
      const lookup = await this.client.lookups.v2.phoneNumbers(phoneNumber).fetch();
      return lookup.valid;
    } catch (error) {
      logger.error('Phone number validation error:', error);
      return false;
    }
  }
}