import sgMail from '@sendgrid/mail';
import { config } from './environment.config';
import { logger } from '../utils/logger';

export class SendGridConfig {
  private static instance: SendGridConfig;
  private isConfigured: boolean = false;

  private constructor() {
    if (!config.sendgrid.apiKey) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('SendGrid API key not provided - using mock email service for development');
        this.isConfigured = false;
        return;
      }
      throw new Error('SendGrid configuration missing: SENDGRID_API_KEY is required');
    }

    sgMail.setApiKey(config.sendgrid.apiKey);
    this.isConfigured = true;
    logger.info('SendGrid client initialized');
  }

  public static getInstance(): SendGridConfig {
    if (!SendGridConfig.instance) {
      SendGridConfig.instance = new SendGridConfig();
    }
    return SendGridConfig.instance;
  }

  public async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.isConfigured) {
      // Mock email service for development
      logger.info(`📧 [MOCK EMAIL] To: ${to}, Subject: ${subject}`);
      logger.debug(`📧 [MOCK EMAIL] HTML Content: ${html.substring(0, 100)}...`);
      return;
    }

    try {
      const msg = {
        to,
        from: {
          email: config.sendgrid.fromEmail,
          name: config.sendgrid.fromName,
        },
        subject,
        html,
      };

      await sgMail.send(msg);
      logger.info(`Email sent successfully to ${to}`);
    } catch (error) {
      logger.error('SendGrid email error:', error);
      throw new Error('Failed to send email');
    }
  }

  public async sendTemplateEmail(
    to: string,
    templateId: string,
    dynamicData: Record<string, any>
  ): Promise<void> {
    if (!this.isConfigured) {
      // Mock template email service for development
      logger.info(`📧 [MOCK TEMPLATE EMAIL] To: ${to}, Template: ${templateId}`);
      logger.debug(`📧 [MOCK TEMPLATE DATA]:`, dynamicData);
      return;
    }

    try {
      const msg = {
        to,
        from: {
          email: config.sendgrid.fromEmail,
          name: config.sendgrid.fromName,
        },
        templateId,
        dynamicTemplateData: dynamicData,
      };

      await sgMail.send(msg);
      logger.info(`Template email sent successfully to ${to}`);
    } catch (error) {
      logger.error('SendGrid template email error:', error);
      throw new Error('Failed to send template email');
    }
  }
}