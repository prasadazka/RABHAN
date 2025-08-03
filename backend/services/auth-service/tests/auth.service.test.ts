import { AuthService } from '../src/services/auth.service';
import { UserRole } from '@shared/types/auth.types';
import { DatabaseConfig } from '../src/config/database.config';
import { RedisConfig } from '../src/config/redis.config';

describe('AuthService', () => {
  let authService: AuthService;
  let mockPool: any;
  let mockRedis: any;

  beforeEach(() => {
    // Mock database and Redis
    mockPool = {
      connect: jest.fn(),
      query: jest.fn(),
    };
    
    mockRedis = {
      setex: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    // Mock the singleton instances
    jest.spyOn(DatabaseConfig, 'getInstance').mockReturnValue({
      getPool: () => mockPool,
    } as any);

    jest.spyOn(RedisConfig, 'getInstance').mockReturnValue({
      getClient: () => mockRedis,
    } as any);

    authService = new AuthService();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'test@example.com', role: UserRole.USER }] }) // INSERT user
        .mockResolvedValueOnce(undefined) // INSERT session
        .mockResolvedValueOnce(undefined); // COMMIT

      mockRedis.setex.mockResolvedValue('OK');

      const result = await authService.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: UserRole.USER,
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error for duplicate email', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('duplicate key value violates unique constraint "users_email_key"'));

      await expect(authService.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
        role: UserRole.USER,
      })).rejects.toThrow('Email already registered');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ 
          id: 'user-1', 
          email: 'test@example.com', 
          role: UserRole.USER,
          password_hash: '$2b$12$hashedpassword',
          status: 'ACTIVE',
          locked_until: null,
          login_attempts: 0
        }] }) // SELECT user
        .mockResolvedValueOnce(undefined) // INSERT session
        .mockResolvedValueOnce(undefined); // UPDATE last_login_at

      // Mock password comparison
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      mockRedis.setex.mockResolvedValue('OK');

      const result = await authService.login({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
    });

    it('should throw error for invalid credentials', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // No user found

      await expect(authService.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ 
          id: 'session-1',
          user_id: 'user-1',
          email: 'test@example.com',
          role: UserRole.USER,
          status: 'ACTIVE'
        }] }) // SELECT session
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // DELETE old session
        .mockResolvedValueOnce(undefined) // INSERT new session
        .mockResolvedValueOnce(undefined); // COMMIT

      // Mock JWT verification
      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'verify').mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
        role: UserRole.USER,
        sessionId: 'session-1'
      });

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
    });
  });
});