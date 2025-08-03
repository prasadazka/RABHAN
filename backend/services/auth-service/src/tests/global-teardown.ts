import { Client } from 'pg';
import Redis from 'ioredis';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up global test environment...');

  try {
    // Cleanup test database
    await cleanupTestDatabase();
    
    // Cleanup test Redis
    await cleanupTestRedis();
    
    
    console.log('✅ Global test environment cleanup complete');
  } catch (error) {
    console.error('❌ Global test cleanup failed:', error);
    // Don't throw error to avoid test failure
    console.warn('⚠️  Some cleanup operations may have failed');
  }
}

async function cleanupTestDatabase() {
  console.log('🧹 Cleaning up test database...');
  
  try {
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: 'test_auth_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    });
    
    await client.connect();
    
    // Clean up test data
    await client.query('TRUNCATE TABLE audit_logs CASCADE');
    await client.query('TRUNCATE TABLE user_sessions CASCADE');
    await client.query('TRUNCATE TABLE users CASCADE');
    
    await client.end();
    
    console.log('✅ Test database cleanup complete');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
    // Don't throw error to avoid interfering with test results
  }
}

async function cleanupTestRedis() {
  console.log('🧹 Cleaning up test Redis...');
  
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 1, // Use database 1 for tests
      maxRetriesPerRequest: 3
    });
    
    // Clear all test data
    await redis.flushdb();
    
    await redis.disconnect();
    
    console.log('✅ Test Redis cleanup complete');
  } catch (error) {
    console.error('❌ Test Redis cleanup failed:', error);
    // Don't throw error for Redis cleanup failure
  }
}


// Helper function to ensure graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await globalTeardown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  await globalTeardown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught exception:', error);
  await globalTeardown();
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  await globalTeardown();
  process.exit(1);
});