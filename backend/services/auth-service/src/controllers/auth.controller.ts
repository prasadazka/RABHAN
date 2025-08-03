import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { PhoneVerificationService } from '../services/phone-verification.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { 
  RegisterRequest, 
  LoginRequest, 
  RefreshTokenRequest 
} from '../types/auth.types';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { logger, SAMALogger } from '../utils/logger';
import { PasswordUtils } from '../utils/password.utils';
import { transformFrontendData } from '../utils/validation.utils';
import axios from 'axios';

export class AuthController {
  private authService: AuthService;
  private phoneVerificationService: PhoneVerificationService;
  private emailVerificationService: EmailVerificationService;

  constructor() {
    this.authService = new AuthService();
    this.phoneVerificationService = new PhoneVerificationService();
    this.emailVerificationService = new EmailVerificationService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: RegisterRequest = req.body;
      
      // Set role to USER for regular registration
      data.role = 'USER' as any;
      
      // Validate Saudi National ID if provided
      if (data.national_id) {
        if (!data.national_id.match(/^[12][0-9]{9}$/)) {
          SAMALogger.logComplianceViolation('INVALID_NATIONAL_ID', undefined, {
            nationalId: data.national_id,
            ip: req.ip
          });
          
          res.status(400).json({ 
            error: 'Invalid Saudi National ID format',
            compliance: 'SAMA_BNPL_RULES'
          });
          return;
        }
      }
      
      const tokens = await this.authService.registerUser(data);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: tokens
      });
      
    } catch (error) {
      logger.error('User registration error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Email already registered')) {
          res.status(409).json({ error: 'Email already registered' });
        } else if (error.message.includes('National ID already registered')) {
          res.status(409).json({ error: 'National ID already registered' });
        } else if (error.message.includes('Password must')) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Registration failed' });
        }
      } else {
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  };

  contractorRegister = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: RegisterRequest = req.body;
      
      // Set role and user_type for contractor
      data.role = 'CONTRACTOR' as any;
      if (!data.user_type) {
        data.user_type = 'BUSINESS';
      }
      
      // Extract company info for logging
      const companyName = (data as any).company_name || (data as any).companyName;
      
      SAMALogger.logAuthEvent('CONTRACTOR_REGISTRATION_ATTEMPT', undefined, {
        email: data.email,
        companyName: companyName,
        userType: data.user_type,
        ip: req.ip
      });
      
      // Register user - this will create both users and contractors tables
      const tokens = await this.authService.register(data);
      
      SAMALogger.logAuthEvent('CONTRACTOR_REGISTRATION_SUCCESS', tokens.user?.id, {
        email: data.email,
        companyName: companyName,
        userType: data.user_type,
        ip: req.ip,
        compliance: 'SAMA_THIRD_PARTY_FRAMEWORK'
      });
      
      res.status(201).json({
        success: true,
        message: 'Contractor registered successfully',
        data: tokens
      });
      
    } catch (error) {
      logger.error('Contractor registration error:', error);
      
      SAMALogger.logAuthEvent('CONTRACTOR_REGISTRATION_FAILED', undefined, {
        email: req.body.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip,
        compliance: 'SAMA_THIRD_PARTY_FRAMEWORK'
      });
      
      if (error instanceof Error) {
        if (error.message.includes('Email already registered')) {
          res.status(409).json({ error: 'Business email already registered' });
        } else if (error.message.includes('Phone already registered')) {
          res.status(409).json({ error: 'Business phone already registered' });
        } else if (error.message.includes('Password must')) {
          res.status(400).json({ error: error.message });
        } else if (error.message.includes('Company name is required')) {
          res.status(400).json({ error: 'Company name is required' });
        } else {
          res.status(500).json({ error: 'Contractor registration failed' });
        }
      } else {
        res.status(500).json({ error: 'Contractor registration failed' });
      }
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: LoginRequest = req.body;
      
      const tokens = await this.authService.login(data);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: tokens
      });
      
    } catch (error) {
      logger.error('Login error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('User type must be specified')) {
          res.status(400).json({ error: 'User type must be specified (USER or CONTRACTOR)' });
        } else if (error.message.includes('Invalid credentials')) {
          res.status(401).json({ error: 'Invalid credentials' });
        } else if (error.message.includes('Account temporarily locked')) {
          res.status(423).json({ error: 'Account temporarily locked. Please try again later.' });
        } else if (error.message.includes('Account is not active')) {
          res.status(403).json({ error: 'Account is not active' });
        } else {
          res.status(500).json({ error: 'Login failed' });
        }
      } else {
        res.status(500).json({ error: 'Login failed' });
      }
    }
  };


  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: RefreshTokenRequest = req.body;
      
      const tokens = await this.authService.refreshToken(data.refreshToken);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokens
      });
      
    } catch (error) {
      logger.error('Token refresh error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid refresh token')) {
          res.status(401).json({ error: 'Invalid refresh token' });
        } else if (error.message.includes('expired')) {
          res.status(401).json({ error: 'Refresh token expired' });
        } else {
          res.status(500).json({ error: 'Token refresh failed' });
        }
      } else {
        res.status(500).json({ error: 'Token refresh failed' });
      }
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      await this.authService.logout(req.user.id, req.user.sessionId);
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
      
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  };

  getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      const user = await this.authService.getUserByIdAndRole(req.user.id, req.user.role);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      const { password_hash, mfa_secret, ...userProfile } = user;
      
      res.json({
        success: true,
        data: userProfile
      });
      
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  };

  updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { first_name, last_name, email, phone, company_name, cr_number, vat_number, business_type } = req.body;

      // Separate user fields from contractor fields
      const userUpdateData: any = {};
      const contractorUpdateData: any = {};
      
      if (first_name !== undefined) userUpdateData.first_name = first_name;
      if (last_name !== undefined) userUpdateData.last_name = last_name;
      if (email !== undefined) userUpdateData.email = email;
      if (phone !== undefined) userUpdateData.phone = phone;
      
      // Contractor fields go to contractors table
      if (company_name !== undefined) contractorUpdateData.company_name = company_name;
      if (cr_number !== undefined) contractorUpdateData.cr_number = cr_number;
      if (vat_number !== undefined) contractorUpdateData.vat_number = vat_number;
      if (business_type !== undefined) contractorUpdateData.business_type = business_type;

      if (Object.keys(userUpdateData).length === 0 && Object.keys(contractorUpdateData).length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      // Update user table if needed
      if (Object.keys(userUpdateData).length > 0) {
        await this.authService.updateProfileByRole(req.user.id, req.user.role, userUpdateData);
      }

      // Update contractors table if needed and user is contractor
      if (Object.keys(contractorUpdateData).length > 0 && req.user.role === 'CONTRACTOR') {
        await this.authService.updateContractorProfile(req.user.id, contractorUpdateData);
      }

      const updatedUser = await this.authService.getUserByIdAndRole(req.user.id, req.user.role);
      
      if (!updatedUser) {
        res.status(404).json({ error: 'User not found after update' });
        return;
      }

      const { password_hash, mfa_secret, ...userProfile } = updatedUser;

      res.json({
        success: true,
        data: userProfile,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  };

  checkPasswordStrength = async (req: Request, res: Response): Promise<void> => {
    try {
      const { password } = req.body;
      
      if (!password) {
        res.status(400).json({ error: 'Password is required' });
        return;
      }
      
      const strengthCheck = PasswordUtils.checkPasswordStrength(password);
      
      res.json({
        success: true,
        data: strengthCheck
      });
      
    } catch (error) {
      logger.error('Password strength check error:', error);
      res.status(500).json({ error: 'Password strength check failed' });
    }
  };

  requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      
      await this.authService.requestPasswordReset(email);
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
      
    } catch (error) {
      logger.error('Password reset request error:', error);
      res.status(500).json({ error: 'Password reset request failed' });
    }
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body;
      
      await this.authService.resetPassword(token, newPassword);
      
      res.json({
        success: true,
        message: 'Password reset successfully'
      });
      
    } catch (error) {
      logger.error('Password reset error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired reset token')) {
          res.status(400).json({ error: 'Invalid or expired reset token' });
        } else if (error.message.includes('Password must')) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Password reset failed' });
        }
      } else {
        res.status(500).json({ error: 'Password reset failed' });
      }
    }
  };

  changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      const { oldPassword, newPassword } = req.body;
      
      await this.authService.changePassword(req.user.id, oldPassword, newPassword);
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
      
    } catch (error) {
      logger.error('Password change error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid old password')) {
          res.status(400).json({ error: 'Invalid old password' });
        } else if (error.message.includes('Password must')) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Password change failed' });
        }
      } else {
        res.status(500).json({ error: 'Password change failed' });
      }
    }
  };

  sendPhoneOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber } = req.body;
      const userId = undefined;

      if (!phoneNumber) {
        res.status(400).json({ error: 'Phone number is required' });
        return;
      }

      await this.phoneVerificationService.sendOTP(phoneNumber, userId);

      res.json({
        success: true,
        message: 'OTP sent successfully'
      });
    } catch (error) {
      logger.error('Send phone OTP error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid Saudi phone number')) {
          res.status(400).json({ error: 'Invalid Saudi phone number format' });
        } else if (error.message.includes('Too many OTP requests')) {
          res.status(429).json({ error: 'Too many OTP requests. Please try again later.' });
        } else if (error.message.includes('Invalid phone number')) {
          res.status(400).json({ error: 'Invalid phone number' });
        } else {
          res.status(500).json({ error: 'Failed to send OTP' });
        }
      } else {
        res.status(500).json({ error: 'Failed to send OTP' });
      }
    }
  };

  verifyPhoneOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber, otp } = req.body;
      const userId = undefined;

      if (!phoneNumber || !otp) {
        res.status(400).json({ error: 'Phone number and OTP are required' });
        return;
      }

      const isValid = await this.phoneVerificationService.verifyOTP(phoneNumber, otp, userId);

      if (isValid) {
        res.json({
          success: true,
          message: 'Phone verification successful'
        });
      } else {
        res.status(400).json({ error: 'Invalid OTP' });
      }
    } catch (error) {
      logger.error('Verify phone OTP error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        } else if (error.message.includes('Invalid OTP')) {
          res.status(400).json({ error: 'Invalid OTP' });
        } else {
          res.status(500).json({ error: 'Phone verification failed' });
        }
      } else {
        res.status(500).json({ error: 'Phone verification failed' });
      }
    }
  };

  sendEmailVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, userFullName } = req.body;
      const userId = req.user?.id;

      if (!email || !userId) {
        res.status(400).json({ error: 'Email and user ID are required' });
        return;
      }

      await this.emailVerificationService.sendVerificationEmail(email, userId, userFullName);

      res.json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (error) {
      logger.error('Send email verification error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Too many email verification requests')) {
          res.status(429).json({ error: 'Too many verification requests. Please try again later.' });
        } else {
          res.status(500).json({ error: 'Failed to send verification email' });
        }
      } else {
        res.status(500).json({ error: 'Failed to send verification email' });
      }
    }
  };

  verifyEmailToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Verification token is required' });
        return;
      }

      const result = await this.emailVerificationService.verifyToken(token);

      res.json({
        success: true,
        message: 'Email verification successful',
        data: result
      });
    } catch (error) {
      logger.error('Verify email token error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          res.status(400).json({ error: 'Verification token expired. Please request a new one.' });
        } else if (error.message.includes('not found')) {
          res.status(400).json({ error: 'Invalid verification token' });
        } else {
          res.status(500).json({ error: 'Email verification failed' });
        }
      } else {
        res.status(500).json({ error: 'Email verification failed' });
      }
    }
  };

  sendEmailOTP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      const userId = req.user?.id;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      await this.emailVerificationService.sendOTPEmail(email, userId);

      res.json({
        success: true,
        message: 'Email OTP sent successfully'
      });
    } catch (error) {
      logger.error('Send email OTP error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Too many email OTP requests')) {
          res.status(429).json({ error: 'Too many OTP requests. Please try again later.' });
        } else {
          res.status(500).json({ error: 'Failed to send email OTP' });
        }
      } else {
        res.status(500).json({ error: 'Failed to send email OTP' });
      }
    }
  };

  verifyEmailOTP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, otp } = req.body;
      const userId = req.user?.id;

      if (!email || !otp) {
        res.status(400).json({ error: 'Email and OTP are required' });
        return;
      }

      const isValid = await this.emailVerificationService.verifyOTP(email, otp, userId);

      if (isValid) {
        res.json({
          success: true,
          message: 'Email OTP verification successful'
        });
      } else {
        res.status(400).json({ error: 'Invalid OTP' });
      }
    } catch (error) {
      logger.error('Verify email OTP error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        } else if (error.message.includes('Invalid OTP')) {
          res.status(400).json({ error: 'Invalid OTP' });
        } else {
          res.status(500).json({ error: 'Email OTP verification failed' });
        }
      } else {
        res.status(500).json({ error: 'Email OTP verification failed' });
      }
    }
  };

  sendTestOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber, countryCode } = req.body;
      
      if (!phoneNumber) {
        res.status(400).json({ error: 'Phone number is required' });
        return;
      }
      
      const validation = this.phoneVerificationService.validatePhoneNumberPublic(phoneNumber, countryCode);
      
      if (!validation.isValid) {
        res.status(400).json({ 
          error: validation.country ? 
            `Invalid ${validation.countryName} phone number format` : 
            'Invalid phone number format',
          supportedCountries: this.phoneVerificationService.getSupportedCountries()
        });
        return;
      }
      
      await this.phoneVerificationService.sendOTP(phoneNumber, 'test-user', countryCode);
      
      res.json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          phoneNumber: validation.formatted,
          country: validation.country,
          countryName: validation.countryName,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Send test OTP error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to send OTP',
        phoneNumber: req.body.phoneNumber
      });
    }
  };

  verifyTestOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber, otp, countryCode } = req.body;
      
      if (!phoneNumber || !otp) {
        res.status(400).json({ error: 'Phone number and OTP are required' });
        return;
      }
      
      const validation = this.phoneVerificationService.validatePhoneNumberPublic(phoneNumber, countryCode);
      
      if (!validation.isValid) {
        res.status(400).json({ 
          error: 'Invalid phone number format',
          supportedCountries: this.phoneVerificationService.getSupportedCountries()
        });
        return;
      }
      
      const isValid = await this.phoneVerificationService.verifyOTP(phoneNumber, otp, 'test-user', countryCode);
      
      if (isValid) {
        res.json({
          success: true,
          message: 'OTP verified successfully',
          data: {
            phoneNumber: validation.formatted,
            country: validation.country,
            countryName: validation.countryName,
            verified: true,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid OTP'
        });
      }
      
    } catch (error) {
      logger.error('Verify test OTP error:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to verify OTP',
        phoneNumber: req.body.phoneNumber
      });
    }
  };

  getSupportedCountries = async (_req: Request, res: Response): Promise<void> => {
    try {
      const countries = this.phoneVerificationService.getSupportedCountries();
      
      res.json({
        success: true,
        data: {
          countries,
          defaultCountry: 'SA',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Get supported countries error:', error);
      res.status(500).json({ error: 'Failed to get supported countries' });
    }
  };

  validatePhoneNumber = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber, countryCode } = req.body;
      
      if (!phoneNumber) {
        res.status(400).json({ error: 'Phone number is required' });
        return;
      }
      
      const validation = this.phoneVerificationService.validatePhoneNumberPublic(phoneNumber, countryCode);
      
      res.json({
        success: true,
        data: {
          ...validation,
          supportedCountries: this.phoneVerificationService.getSupportedCountries()
        }
      });
      
    } catch (error) {
      logger.error('Validate phone number error:', error);
      res.status(500).json({ error: 'Phone number validation failed' });
    }
  };

  lookupEmailForLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, userType } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const result = await this.authService.lookupUserByEmailAndType(email, userType);
      
      if (!result) {
        res.json({
          success: true,
          message: 'If the email is registered, OTP will be sent to the associated phone number'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          hasPhone: !!result.phone,
          maskedPhone: result.maskedPhone,
          userExists: true,
          userType: result.userType
        },
        message: 'User found. OTP will be sent to registered phone number.'
      });

    } catch (error) {
      logger.error('Email lookup error:', error);
      res.status(500).json({ error: 'Email lookup failed' });
    }
  };

  sendLoginOTPToPhone = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, userType } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const result = await this.authService.sendLoginOTPByEmailAndType(email, userType);
      
      if (result) {
        res.json({
          success: true,
          message: 'OTP sent successfully',
          data: {
            maskedPhone: result.maskedPhone
          }
        });
      } else {
        res.json({
          success: true,
          message: 'If the email is registered, OTP has been sent'
        });
      }

    } catch (error) {
      logger.error('Send login OTP error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Too many OTP requests')) {
          res.status(429).json({ error: 'Too many OTP requests. Please try again later.' });
        } else if (error.message.includes('No phone number')) {
          res.status(400).json({ error: 'No phone number associated with this account' });
        } else {
          res.status(500).json({ error: 'Failed to send OTP' });
        }
      } else {
        res.status(500).json({ error: 'Failed to send OTP' });
      }
    }
  };

  verifyLoginOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, otp, userType } = req.body;

      if (!email || !otp) {
        res.status(400).json({ error: 'Email and OTP are required' });
        return;
      }

      const isValid = await this.authService.verifyLoginOTPWithType(email, otp, userType);

      if (isValid) {
        res.json({
          success: true,
          message: 'OTP verification successful. You can now enter your password.',
          data: {
            otpVerified: true,
            canProceedToPassword: true
          }
        });
      } else {
        res.status(400).json({ error: 'Invalid or expired OTP' });
      }

    } catch (error) {
      logger.error('Verify login OTP error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        } else if (error.message.includes('Invalid OTP')) {
          res.status(400).json({ error: 'Invalid OTP' });
        } else {
          res.status(500).json({ error: 'OTP verification failed' });
        }
      } else {
        res.status(500).json({ error: 'OTP verification failed' });
      }
    }
  };


  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        message: 'Auth service is healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '1.0.0'
      });
    } catch (error) {
      res.status(500).json({ error: 'Health check failed' });
    }
  };

  getDummyOTPInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.phoneVerificationService.isDummyOTPMode()) {
        res.status(403).json({ 
          error: 'This endpoint is only available in development mode',
          production: true 
        });
        return;
      }

      const { phoneNumber } = req.query;

      if (!phoneNumber) {
        res.json({
          success: true,
          message: '🧪 Development Mode: Dummy OTP Information',
          data: {
            dummyOTP: this.phoneVerificationService.getDummyOTP(),
            developmentMode: true,
            instructions: 'Use this OTP for any phone number during development',
            note: 'Twilio SMS is bypassed in development mode'
          }
        });
        return;
      }

      // Test with specific phone number
      const testInfo = await this.phoneVerificationService.testOTPVerification(phoneNumber as string);
      
      res.json({
        success: true,
        message: '🧪 Development Mode: Test OTP Info',
        data: {
          ...testInfo,
          developmentMode: true,
          instructions: 'Use this OTP to verify the phone number',
          phoneNumber: phoneNumber
        }
      });

    } catch (error) {
      logger.error('Get dummy OTP info error:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to get dummy OTP info'
      });
    }
  };
}