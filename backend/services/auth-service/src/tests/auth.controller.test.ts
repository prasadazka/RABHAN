import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { createApp } from '../app';
import { UserRole } from '../types/user.types';
import { AppError } from '../utils/app-error';

// Mock AuthService
jest.mock('../services/auth.service');
const mockAuthService = jest.mocked(AuthService);

describe('AuthController', () => {
  let app: Express;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    // Create mocked AuthService instance
    authService = new mockAuthService() as jest.Mocked<AuthService>;
    
    // Create Express app with mocked service
    app = createApp({ authService });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      role: UserRole.USER,
      phone: '+966501234567',
      nationalId: '1234567890'
    };

    it('should register a new user successfully', async () => {
      const mockResponse = {
        success: true,
        user: {
          id: 'user-id',
          email: validRegistrationData.email,
          role: validRegistrationData.role,
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        token: 'jwt-token'
      };

      authService.register.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockResponse,
        message: 'User registered successfully'
      });

      expect(authService.register).toHaveBeenCalledWith(validRegistrationData);
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = {
        ...validRegistrationData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should return 400 for weak password', async () => {
      const invalidData = {
        ...validRegistrationData,
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    it('should return 400 for invalid role', async () => {
      const invalidData = {
        ...validRegistrationData,
        role: 'INVALID_ROLE'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('role');
    });

    it('should return 400 for invalid Saudi phone number', async () => {
      const invalidData = {
        ...validRegistrationData,
        phone: '123456789'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('phone');
    });

    it('should return 400 for invalid National ID', async () => {
      const invalidData = {
        ...validRegistrationData,
        nationalId: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('nationalId');
    });

    it('should return 409 for existing email', async () => {
      authService.register.mockRejectedValue(
        new AppError('Email already registered', 409)
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already registered');
    });

    it('should return 422 for SAMA compliance failure', async () => {
      authService.register.mockRejectedValue(
        new AppError('SAMA compliance validation failed', 422)
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('SAMA compliance');
    });

    it('should return 500 for internal server error', async () => {
      authService.register.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Internal server error');
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      deviceId: 'device-123'
    };

    it('should login user successfully', async () => {
      const mockResponse = {
        success: true,
        user: {
          id: 'user-id',
          email: validLoginData.email,
          role: UserRole.USER,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        token: 'jwt-token'
      };

      authService.login.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResponse,
        message: 'Login successful'
      });

      expect(authService.login).toHaveBeenCalledWith(validLoginData);
    });

    it('should return 400 for missing email', async () => {
      const invalidData = {
        password: 'SecurePassword123!',
        deviceId: 'device-123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should return 400 for missing password', async () => {
      const invalidData = {
        email: 'test@example.com',
        deviceId: 'device-123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    it('should return 401 for invalid credentials', async () => {
      authService.login.mockRejectedValue(
        new AppError('Invalid credentials', 401)
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should return 403 for unverified user', async () => {
      authService.login.mockRejectedValue(
        new AppError('Account not verified', 403)
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not verified');
    });

    it('should return 403 for inactive user', async () => {
      authService.login.mockRejectedValue(
        new AppError('Account is inactive', 403)
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('inactive');
    });

    it('should return 422 for SAMA compliance failure', async () => {
      authService.login.mockRejectedValue(
        new AppError('SAMA compliance validation failed', 422)
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('SAMA compliance');
    });
  });


  describe('POST /api/auth/password-reset', () => {
    const validResetData = {
      email: 'test@example.com'
    };

    it('should send password reset email successfully', async () => {
      authService.requestPasswordReset.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/password-reset')
        .send(validResetData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password reset email sent'
      });

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(
        validResetData.email
      );
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = {
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/auth/password-reset')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should return 200 even for non-existent email (security)', async () => {
      authService.requestPasswordReset.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password reset email sent'
      });
    });
  });

  describe('POST /api/auth/password-reset/confirm', () => {
    const validConfirmData = {
      token: 'valid-reset-token',
      newPassword: 'NewSecurePassword123!'
    };

    it('should reset password successfully', async () => {
      authService.resetPassword.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send(validConfirmData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password reset successful'
      });

      expect(authService.resetPassword).toHaveBeenCalledWith(
        validConfirmData.token,
        validConfirmData.newPassword
      );
    });

    it('should return 400 for missing token', async () => {
      const invalidData = {
        newPassword: 'NewSecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });

    it('should return 400 for weak password', async () => {
      const invalidData = {
        token: 'valid-reset-token',
        newPassword: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    it('should return 400 for invalid token', async () => {
      authService.resetPassword.mockRejectedValue(
        new AppError('Invalid or expired token', 400)
      );

      const response = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send(validConfirmData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid or expired token');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      authService.getCurrentUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUser
      });

      expect(authService.getCurrentUser).toHaveBeenCalledWith('user-id');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      authService.logout.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Logout successful'
      });

      expect(authService.logout).toHaveBeenCalledWith('user-id');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });
  });

  describe('POST /api/auth/change-password', () => {
    const validChangeData = {
      oldPassword: 'OldSecurePassword123!',
      newPassword: 'NewSecurePassword123!'
    };

    it('should change password successfully', async () => {
      authService.changePassword.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(validChangeData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password changed successfully'
      });

      expect(authService.changePassword).toHaveBeenCalledWith(
        'user-id',
        validChangeData.oldPassword,
        validChangeData.newPassword
      );
    });

    it('should return 400 for missing old password', async () => {
      const invalidData = {
        newPassword: 'NewSecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('oldPassword');
    });

    it('should return 400 for weak new password', async () => {
      const invalidData = {
        oldPassword: 'OldSecurePassword123!',
        newPassword: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('newPassword');
    });

    it('should return 400 for incorrect old password', async () => {
      authService.changePassword.mockRejectedValue(
        new AppError('Current password is incorrect', 400)
      );

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(validChangeData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('incorrect');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send(validChangeData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should apply rate limiting to login endpoint', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        deviceId: 'device-123'
      };

      authService.login.mockRejectedValue(
        new AppError('Invalid credentials', 401)
      );

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // The 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Too many requests');
    });

    it('should apply rate limiting to password reset endpoint', async () => {
      const resetData = {
        email: 'test@example.com'
      };

      authService.requestPasswordReset.mockResolvedValue(undefined);

      // Make multiple password reset requests
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/password-reset')
          .send(resetData);
      }

      // The 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send(resetData)
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Too many requests');
    });
  });

  describe('SAMA Compliance Endpoint Tests', () => {
    it('should validate SAMA compliance for user registration', async () => {
      const registrationData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.USER,
        phone: '+966501234567',
        nationalId: '1234567890'
      };

      authService.register.mockRejectedValue(
        new AppError('User does not meet SAMA eligibility requirements', 422)
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('SAMA eligibility');
    });

    it('should validate SAMA compliance for user login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        deviceId: 'device-123'
      };

      authService.login.mockRejectedValue(
        new AppError('Login violates SAMA compliance rules', 422)
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('SAMA compliance');
    });
  });
});