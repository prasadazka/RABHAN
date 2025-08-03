import { config } from 'dotenv';
import { Client } from 'pg';
import Redis from 'ioredis';

// Load test environment variables
config({ path: '.env.test' });

export default async function globalSetup() {
  console.log('🔧 Setting up global test environment...');

  try {
    // Setup test database
    await setupTestDatabase();
    
    // Setup test Redis
    await setupTestRedis();
    
    
    console.log('✅ Global test environment setup complete');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}

async function setupTestDatabase() {
  console.log('🔧 Setting up test database...');
  
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // Connect to default database first
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  try {
    await client.connect();
    
    // Create test database if it doesn't exist
    const testDbName = 'test_auth_db';
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [testDbName]
    );
    
    if (result.rows.length === 0) {
      await client.query(`CREATE DATABASE ${testDbName}`);
      console.log(`📋 Created test database: ${testDbName}`);
    }
    
    await client.end();
    
    // Connect to test database and run migrations
    const testClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: testDbName,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    });
    
    await testClient.connect();
    
    // Run basic table creation for tests
    await testClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'USER',
        is_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        phone VARCHAR(20),
        national_id VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await testClient.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(255) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true
      )
    `);
    
    await testClient.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await testClient.end();
    
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}

async function setupTestRedis() {
  console.log('🔧 Setting up test Redis...');
  
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 1, // Use database 1 for tests
      maxRetriesPerRequest: 3
    });
    
    // Test Redis connection
    await redis.ping();
    
    // Clear any existing test data
    await redis.flushdb();
    
    await redis.disconnect();
    
    console.log('✅ Test Redis setup complete');
  } catch (error) {
    console.error('❌ Test Redis setup failed:', error);
    // Don't throw error for Redis setup failure in tests
    console.warn('⚠️  Continuing without Redis for tests');
  }
}


// Helper function to wait for services to be ready
async function waitForServices() {
  const maxRetries = 30;
  const delay = 1000;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Test database connection
      const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: 'test_auth_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password'
      });
      
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      
      // Test Redis connection
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: 1,
        maxRetriesPerRequest: 1
      });
      
      await redis.ping();
      await redis.disconnect();
      
      console.log('✅ All services are ready');
      return;
    } catch (error) {
      console.log(`⏳ Waiting for services... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Services failed to start within timeout');
}