import { config } from 'dotenv';
import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/test_auth_db';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Mock external services
jest.mock('../services/email.service');
jest.mock('../services/redis.service');

// Global test setup
beforeAll(async () => {
  // Setup test database
  // Setup test Redis
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test database
  // Cleanup test Redis
  console.log('Cleaning up test environment...');
});

beforeEach(async () => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Cleanup after each test
  jest.restoreAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Export test utilities
export const testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'USER',
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),
  
  createMockToken: () => 'mock-jwt-token',
  
  
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};