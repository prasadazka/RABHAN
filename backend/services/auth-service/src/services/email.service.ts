import { logger } from '../utils/logger';
import { config } from '../config/environment.config';

export interface EmailResult {
  success: boolean;
  message: string;
}

export class EmailService {
  private transporter: any;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // In production, use proper email service like SendGrid, AWS SES, etc.
    // For now, we'll simulate email sending
    this.transporter = {
      sendMail: this.simulateEmailSend.bind(this)
    };
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string, userId: string): Promise<EmailResult> {
    try {
      const verificationLink = `${config.frontend.url}/verify-email?token=${token}&userId=${userId}`;
      
      const emailContent = this.generateVerificationEmailHTML(verificationLink);
      
      const mailOptions = {
        from: config.email.from,
        to: email,
        subject: 'Verify Your Email - RABHAN Solar Platform',
        html: emailContent
      };
      
      await this.transporter.sendMail(mailOptions);
      
      logger.info(`Verification email sent to ${email} for user ${userId}`);
      
      return {
        success: true,
        message: 'Verification email sent successfully'
      };
      
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      return {
        success: false,
        message: 'Failed to send verification email'
      };
    }
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email: string, userName: string, userRole: string): Promise<EmailResult> {
    try {
      const emailContent = this.generateWelcomeEmailHTML(userName, userRole);
      
      const mailOptions = {
        from: config.email.from,
        to: email,
        subject: 'Welcome to RABHAN Solar Platform',
        html: emailContent
      };
      
      await this.transporter.sendMail(mailOptions);
      
      logger.info(`Welcome email sent to ${email}`);
      
      return {
        success: true,
        message: 'Welcome email sent successfully'
      };
      
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      return {
        success: false,
        message: 'Failed to send welcome email'
      };
    }
  }

  /**
   * Generate verification email HTML
   */
  private generateVerificationEmailHTML(verificationLink: string): string {
    return `
      <!DOCTYPE html>
      <html dir="ltr" lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - RABHAN</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #f0fdf9 0%, #ccfbf1 100%);
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .logo {
            font-size: 2rem;
            font-weight: bold;
            color: #3eb2b1;
            margin-bottom: 20px;
          }
          .title {
            font-size: 1.5rem;
            color: #1e293b;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #64748b;
            margin-bottom: 30px;
          }
          .verify-button {
            display: inline-block;
            background: linear-gradient(135deg, #3eb2b1 0%, #0891b2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1.1rem;
            margin-bottom: 30px;
            transition: transform 0.2s ease;
          }
          .verify-button:hover {
            transform: translateY(-2px);
          }
          .info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: left;
          }
          .footer {
            color: #94a3b8;
            font-size: 0.875rem;
            margin-top: 30px;
          }
          .security {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
            font-size: 0.875rem;
            color: #dc2626;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚡ RABHAN</div>
            <h1 class="title">Verify Your Email Address</h1>
            <p class="subtitle">
              Welcome to RABHAN Solar Platform! Please verify your email address to complete your registration.
            </p>
            
            <a href="${verificationLink}" class="verify-button">
              Verify Email Address
            </a>
            
            <div class="info">
              <h3 style="margin-top: 0; color: #1e293b;">Next Steps:</h3>
              <ul style="text-align: left; color: #475569;">
                <li>Click the verification button above</li>
                <li>Complete your profile setup</li>
                <li>Start exploring solar solutions</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>This verification link expires in 24 hours.</p>
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
            
            <div class="security">
              <strong>🛡️ Security Notice:</strong> This platform is SAMA compliant and all activities are monitored for regulatory compliance.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate welcome email HTML
   */
  private generateWelcomeEmailHTML(userName: string, userRole: string): string {
    const roleEmoji = userRole === 'CONTRACTOR' ? '⚡' : '🏠';
    const roleText = userRole === 'CONTRACTOR' ? 'Solar Contractor' : 'Solar Customer';
    
    return `
      <!DOCTYPE html>
      <html dir="ltr" lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to RABHAN - ${roleText}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #f0fdf9 0%, #ccfbf1 100%);
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .logo {
            font-size: 2rem;
            font-weight: bold;
            color: #3eb2b1;
            margin-bottom: 20px;
          }
          .title {
            font-size: 1.5rem;
            color: #1e293b;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #64748b;
            margin-bottom: 30px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3eb2b1 0%, #0891b2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1.1rem;
            margin-bottom: 30px;
          }
          .features {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: left;
          }
          .footer {
            color: #94a3b8;
            font-size: 0.875rem;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚡ RABHAN</div>
            <h1 class="title">Welcome to RABHAN, ${userName}! ${roleEmoji}</h1>
            <p class="subtitle">
              Your ${roleText} account has been successfully verified and is ready to use.
            </p>
            
            <a href="${config.frontend.url}/dashboard" class="cta-button">
              Go to Dashboard
            </a>
            
            <div class="features">
              <h3 style="margin-top: 0; color: #1e293b;">What's Next:</h3>
              <ul style="color: #475569;">
                ${userRole === 'CONTRACTOR' ? `
                  <li>Complete your contractor profile</li>
                  <li>Upload your certifications</li>
                  <li>List your solar products</li>
                  <li>Start receiving quote requests</li>
                ` : `
                  <li>Use our solar calculator</li>
                  <li>Request quotes from contractors</li>
                  <li>Apply for BNPL financing</li>
                  <li>Track your solar installation</li>
                `}
              </ul>
            </div>
            
            <div class="footer">
              <p>Need help? Contact our support team anytime.</p>
              <p>🛡️ SAMA compliant platform with secure financial services</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Simulate email sending (replace with real email service in production)
   */
  private async simulateEmailSend(mailOptions: any): Promise<void> {
    // In production, replace this with actual email sending logic
    logger.info('📧 EMAIL SIMULATION:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      from: mailOptions.from
    });
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In development, log the email content for testing
    if (process.env.NODE_ENV === 'development') {
      logger.info('Email content preview:', mailOptions.html.substring(0, 200) + '...');
    }
  }
}