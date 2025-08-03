import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { TokenService } from '../services/token.service';
import { RedisService } from '../services/redis.service';
import { EmailService } from '../services/email.service';
import { SAMAComplianceService } from '../services/sama-compliance.service';
import { AuditService } from '../services/audit.service';
import { SecurityService } from '../services/security.service';
import { AppError } from '../utils/app-error';
import { UserRole } from '../types/user.types';

// Mock dependencies
jest.mock('../repositories/user.repository');
jest.mock('../services/token.service');
jest.mock('../services/redis.service');
jest.mock('../services/email.service');
jest.mock('../services/sama-compliance.service');
jest.mock('../services/audit.service');
jest.mock('../services/security.service');

const mockUserRepository = jest.mocked(UserRepository);
const mockTokenService = jest.mocked(TokenService);
const mockRedisService = jest.mocked(RedisService);
const mockEmailService = jest.mocked(EmailService);
const mockSAMAComplianceService = jest.mocked(SAMAComplianceService);
const mockAuditService = jest.mocked(AuditService);
const mockSecurityService = jest.mocked(SecurityService);

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let redisService: jest.Mocked<RedisService>;
  let emailService: jest.Mocked<EmailService>;
  let samaComplianceService: jest.Mocked<SAMAComplianceService>;
  let auditService: jest.Mocked<AuditService>;
  let securityService: jest.Mocked<SecurityService>;

  beforeEach(() => {
    // Create mocked instances
    userRepository = new mockUserRepository() as jest.Mocked<UserRepository>;
    tokenService = new mockTokenService() as jest.Mocked<TokenService>;
    redisService = new mockRedisService() as jest.Mocked<RedisService>;
    emailService = new mockEmailService() as jest.Mocked<EmailService>;
    samaComplianceService = new mockSAMAComplianceService() as jest.Mocked<SAMAComplianceService>;
    auditService = new mockAuditService() as jest.Mocked<AuditService>;
    securityService = new mockSecurityService() as jest.Mocked<SecurityService>;

    // Create AuthService instance
    authService = new AuthService(
      userRepository,
      tokenService,
      redisService,
      emailService,
      samaComplianceService,
      auditService,
      securityService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      role: UserRole.USER,
      phone: '+966501234567',
      nationalId: '1234567890'
    };

    it('should successfully register a new user', async () => {
      // Mock user doesn't exist
      userRepository.findByEmail.mockResolvedValue(null);
      
      // Mock password validation
      securityService.validatePassword.mockReturnValue({ valid: true });
      
      // Mock password hashing
      securityService.hashPassword.mockResolvedValue('hashedPassword');
      
      // Mock user creation
      const mockUser = {
        id: 'user-id',
        email: validRegistrationData.email,
        role: validRegistrationData.role,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      userRepository.create.mockResolvedValue(mockUser);
      
      // Mock token generation
      tokenService.generateJWT.mockResolvedValue('jwt-token');
      
      // Mock SAMA compliance check
      samaComplianceService.validateUserRegistration.mockResolvedValue(true);
      
      // Mock audit logging
      auditService.logUserAction.mockResolvedValue(undefined);

      const result = await authService.register(validRegistrationData);

      expect(result).toEqual({
        success: true,
        user: mockUser,
        token: 'jwt-token'
      });
      
      expect(userRepository.findByEmail).toHaveBeenCalledWith(validRegistrationData.email);
      expect(securityService.validatePassword).toHaveBeenCalledWith(validRegistrationData.password);
      expect(securityService.hashPassword).toHaveBeenCalledWith(validRegistrationData.password);
      expect(userRepository.create).toHaveBeenCalled();
      expect(samaComplianceService.validateUserRegistration).toHaveBeenCalled();
      expect(auditService.logUserAction).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      const existingUser = {
        id: 'existing-user-id',
        email: validRegistrationData.email,
        role: UserRole.USER,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      userRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(authService.register(validRegistrationData))
        .rejects
        .toThrow(AppError);
    });

    it('should throw error if password is weak', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      securityService.validatePassword.mockReturnValue({ 
        valid: false, 
        message: 'Password is too weak' 
      });

      await expect(authService.register(validRegistrationData))
        .rejects
        .toThrow(AppError);
    });

    it('should validate Saudi phone number format', async () => {
      const invalidPhoneData = {
        ...validRegistrationData,
        phone: '123456789' // Invalid format
      };
      
      userRepository.findByEmail.mockResolvedValue(null);
      securityService.validatePassword.mockReturnValue({ valid: true });

      await expect(authService.register(invalidPhoneData))
        .rejects
        .toThrow(AppError);
    });

    it('should validate Saudi National ID format', async () => {
      const invalidNationalIdData = {
        ...validRegistrationData,
        nationalId: '123' // Invalid format
      };
      
      userRepository.findByEmail.mockResolvedValue(null);
      securityService.validatePassword.mockReturnValue({ valid: true });

      await expect(authService.register(invalidNationalIdData))
        .rejects
        .toThrow(AppError);
    });

    it('should handle SAMA compliance validation failure', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      securityService.validatePassword.mockReturnValue({ valid: true });
      securityService.hashPassword.mockResolvedValue('hashedPassword');
      
      samaComplianceService.validateUserRegistration.mockResolvedValue(false);

      await expect(authService.register(validRegistrationData))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      deviceId: 'device-123'
    };

    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user-id',
        email: validLoginData.email,
        passwordHash: 'hashedPassword',
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      userRepository.findByEmail.mockResolvedValue(mockUser);
      securityService.verifyPassword.mockResolvedValue(true);
      tokenService.generateJWT.mockResolvedValue('jwt-token');
      samaComplianceService.validateUserLogin.mockResolvedValue(true);
      auditService.logUserAction.mockResolvedValue(undefined);

      const result = await authService.login(validLoginData);

      expect(result).toEqual({
        success: true,
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role
        }),
        token: 'jwt-token'
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith(validLoginData.email);
      expect(securityService.verifyPassword).toHaveBeenCalledWith(
        validLoginData.password,
        mockUser.passwordHash
      );
      expect(tokenService.generateJWT).toHaveBeenCalled();
      expect(auditService.logUserAction).toHaveBeenCalled();
    });

    it('should throw error for non-existent user', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(validLoginData))
        .rejects
        .toThrow(AppError);
    });

    it('should throw error for invalid password', async () => {
      const mockUser = {
        id: 'user-id',
        email: validLoginData.email,
        passwordHash: 'hashedPassword',
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      userRepository.findByEmail.mockResolvedValue(mockUser);
      securityService.verifyPassword.mockResolvedValue(false);

      await expect(authService.login(validLoginData))
        .rejects
        .toThrow(AppError);
    });

    it('should throw error for unverified user', async () => {
      const mockUser = {
        id: 'user-id',
        email: validLoginData.email,
        passwordHash: 'hashedPassword',
        role: UserRole.USER,
        isVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.login(validLoginData))
        .rejects
        .toThrow(AppError);
    });

    it('should throw error for inactive user', async () => {
      const mockUser = {
        id: 'user-id',
        email: validLoginData.email,
        passwordHash: 'hashedPassword',
        role: UserRole.USER,
        isVerified: true,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.login(validLoginData))
        .rejects
        .toThrow(AppError);
    });

    it('should handle SAMA compliance validation failure', async () => {
      const mockUser = {
        id: 'user-id',
        email: validLoginData.email,
        passwordHash: 'hashedPassword',
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      userRepository.findByEmail.mockResolvedValue(mockUser);
      securityService.verifyPassword.mockResolvedValue(true);
      samaComplianceService.validateUserLogin.mockResolvedValue(false);

      await expect(authService.login(validLoginData))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('requestPasswordReset', () => {
    it('should send password reset email for valid user', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-id',
        email,
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      userRepository.findByEmail.mockResolvedValue(mockUser);
      tokenService.generatePasswordResetToken.mockResolvedValue('reset-token');
      redisService.set.mockResolvedValue(undefined);
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);
      auditService.logUserAction.mockResolvedValue(undefined);

      await authService.requestPasswordReset(email);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(tokenService.generatePasswordResetToken).toHaveBeenCalledWith(mockUser.id);
      expect(redisService.set).toHaveBeenCalledWith(
        `password-reset:${mockUser.id}`,
        'reset-token',
        3600 // 1 hour
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        email,
        'reset-token'
      );
      expect(auditService.logUserAction).toHaveBeenCalled();
    });

    it('should not throw error for non-existent user (security)', async () => {
      const email = 'nonexistent@example.com';
      userRepository.findByEmail.mockResolvedValue(null);

      // Should not throw error to prevent email enumeration
      await expect(authService.requestPasswordReset(email))
        .resolves
        .not.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewSecurePassword123!';
      const userId = 'user-id';
      
      tokenService.verifyPasswordResetToken.mockResolvedValue(userId);
      redisService.get.mockResolvedValue(token);
      securityService.validatePassword.mockReturnValue({ valid: true });
      securityService.hashPassword.mockResolvedValue('newHashedPassword');
      userRepository.updatePassword.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);
      auditService.logUserAction.mockResolvedValue(undefined);

      await authService.resetPassword(token, newPassword);

      expect(tokenService.verifyPasswordResetToken).toHaveBeenCalledWith(token);
      expect(securityService.validatePassword).toHaveBeenCalledWith(newPassword);
      expect(securityService.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(userRepository.updatePassword).toHaveBeenCalledWith(userId, 'newHashedPassword');
      expect(redisService.del).toHaveBeenCalledWith(`password-reset:${userId}`);
      expect(auditService.logUserAction).toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';
      const newPassword = 'NewSecurePassword123!';
      
      tokenService.verifyPasswordResetToken.mockRejectedValue(new Error('Invalid token'));

      await expect(authService.resetPassword(token, newPassword))
        .rejects
        .toThrow(AppError);
    });

    it('should throw error for weak password', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'weak';
      const userId = 'user-id';
      
      tokenService.verifyPasswordResetToken.mockResolvedValue(userId);
      redisService.get.mockResolvedValue(token);
      securityService.validatePassword.mockReturnValue({ 
        valid: false, 
        message: 'Password is too weak' 
      });

      await expect(authService.resetPassword(token, newPassword))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('validateSaudiPhone', () => {
    it('should validate correct Saudi phone numbers', () => {
      const validPhones = [
        '+966501234567',
        '+966541234567',
        '+966551234567',
        '+966561234567',
        '+966591234567'
      ];

      validPhones.forEach(phone => {
        expect(authService.validateSaudiPhone(phone)).toBe(true);
      });
    });

    it('should reject invalid Saudi phone numbers', () => {
      const invalidPhones = [
        '501234567',        // Missing country code
        '+966401234567',    // Invalid prefix
        '+966501234',       // Too short
        '+9665012345678',   // Too long
        '+1234567890',      // Wrong country code
        'invalid'           // Not a number
      ];

      invalidPhones.forEach(phone => {
        expect(authService.validateSaudiPhone(phone)).toBe(false);
      });
    });
  });

  describe('validateSaudiNationalId', () => {
    it('should validate correct Saudi National IDs', () => {
      const validIds = [
        '1234567890',
        '2345678901',
        '1000000000',
        '2999999999'
      ];

      validIds.forEach(id => {
        expect(authService.validateSaudiNationalId(id)).toBe(true);
      });
    });

    it('should reject invalid Saudi National IDs', () => {
      const invalidIds = [
        '123456789',      // Too short
        '12345678901',    // Too long
        '0234567890',     // Starts with 0
        '3234567890',     // Starts with 3
        'abcdefghij',     // Not numbers
        '1234567890a'     // Contains letters
      ];

      invalidIds.forEach(id => {
        expect(authService.validateSaudiNationalId(id)).toBe(false);
      });
    });
  });

  describe('SAMA Compliance Tests', () => {
    it('should enforce SAMA user registration requirements', async () => {
      const registrationData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.USER,
        phone: '+966501234567',
        nationalId: '1234567890'
      };

      userRepository.findByEmail.mockResolvedValue(null);
      securityService.validatePassword.mockReturnValue({ valid: true });
      securityService.hashPassword.mockResolvedValue('hashedPassword');
      
      // Mock SAMA compliance failure
      samaComplianceService.validateUserRegistration.mockResolvedValue(false);

      await expect(authService.register(registrationData))
        .rejects
        .toThrow(AppError);

      expect(samaComplianceService.validateUserRegistration).toHaveBeenCalledWith({
        email: registrationData.email,
        role: registrationData.role,
        phone: registrationData.phone,
        nationalId: registrationData.nationalId
      });
    });

    it('should enforce SAMA login requirements', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        deviceId: 'device-123'
      };

      const mockUser = {
        id: 'user-id',
        email: loginData.email,
        passwordHash: 'hashedPassword',
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);
      securityService.verifyPassword.mockResolvedValue(true);
      
      // Mock SAMA compliance failure
      samaComplianceService.validateUserLogin.mockResolvedValue(false);

      await expect(authService.login(loginData))
        .rejects
        .toThrow(AppError);

      expect(samaComplianceService.validateUserLogin).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        deviceId: loginData.deviceId
      });
    });
  });

  describe('Security Tests', () => {
    it('should hash passwords securely', async () => {
      const password = 'SecurePassword123!';
      const hashedPassword = 'hashedPassword';
      
      securityService.hashPassword.mockResolvedValue(hashedPassword);
      
      const result = await authService.hashPassword(password);
      
      expect(result).toBe(hashedPassword);
      expect(securityService.hashPassword).toHaveBeenCalledWith(password);
    });

    it('should verify passwords correctly', async () => {
      const password = 'SecurePassword123!';
      const hashedPassword = 'hashedPassword';
      
      securityService.verifyPassword.mockResolvedValue(true);
      
      const result = await authService.verifyPassword(password, hashedPassword);
      
      expect(result).toBe(true);
      expect(securityService.verifyPassword).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should validate password strength', () => {
      const weakPassword = 'weak';
      const strongPassword = 'SecurePassword123!';
      
      securityService.validatePassword.mockReturnValueOnce({ 
        valid: false, 
        message: 'Password is too weak' 
      });
      securityService.validatePassword.mockReturnValueOnce({ 
        valid: true 
      });

      const weakResult = authService.validatePassword(weakPassword);
      const strongResult = authService.validatePassword(strongPassword);

      expect(weakResult.valid).toBe(false);
      expect(strongResult.valid).toBe(true);
    });
  });

  describe('Audit Logging Tests', () => {
    it('should log user registration events', async () => {
      const registrationData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.USER,
        phone: '+966501234567',
        nationalId: '1234567890'
      };

      userRepository.findByEmail.mockResolvedValue(null);
      securityService.validatePassword.mockReturnValue({ valid: true });
      securityService.hashPassword.mockResolvedValue('hashedPassword');
      
      const mockUser = {
        id: 'user-id',
        email: registrationData.email,
        role: registrationData.role,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      userRepository.create.mockResolvedValue(mockUser);
      tokenService.generateJWT.mockResolvedValue('jwt-token');
      samaComplianceService.validateUserRegistration.mockResolvedValue(true);
      auditService.logUserAction.mockResolvedValue(undefined);

      await authService.register(registrationData);

      expect(auditService.logUserAction).toHaveBeenCalledWith(
        mockUser.id,
        'USER_REGISTER',
        expect.objectContaining({
          email: registrationData.email,
          role: registrationData.role
        })
      );
    });

    it('should log user login events', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        deviceId: 'device-123'
      };

      const mockUser = {
        id: 'user-id',
        email: loginData.email,
        passwordHash: 'hashedPassword',
        role: UserRole.USER,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);
      securityService.verifyPassword.mockResolvedValue(true);
      tokenService.generateJWT.mockResolvedValue('jwt-token');
      samaComplianceService.validateUserLogin.mockResolvedValue(true);
      auditService.logUserAction.mockResolvedValue(undefined);

      await authService.login(loginData);

      expect(auditService.logUserAction).toHaveBeenCalledWith(
        mockUser.id,
        'USER_LOGIN',
        expect.objectContaining({
          email: loginData.email,
          deviceId: loginData.deviceId
        })
      );
    });
  });
});