const { spawn } = require('child_process');
const { cleanupPorts } = require('./cleanup-ports');
const { exec } = require('child_process');
const path = require('path');

async function testPostgreSQL() {
  return new Promise((resolve, reject) => {
    exec('node test-postgresql.js', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        console.log('\nPlease make sure PostgreSQL is running with:');
        console.log('- Host: localhost');
        console.log('- Port: 5432');
        console.log('- Username: postgres');
        console.log('- Password: 12345\n');
        reject(error);
      } else {
        console.log('✅ PostgreSQL is ready!\n');
        resolve();
      }
    });
  });
}

function startService(name, port, command, workingDir) {
  console.log(`🚀 Starting ${name} on port ${port}...`);
  
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'cmd' : 'bash';
  const args = isWindows ? ['/k', command] : ['-c', command];
  
  const child = spawn(cmd, args, {
    cwd: workingDir,
    stdio: 'inherit',
    shell: true,
    detached: false
  });
  
  child.on('error', (error) => {
    console.error(`❌ Failed to start ${name}:`, error.message);
  });
  
  return child;
}

async function startAllServices() {
  try {
    console.log('🏗️  Starting RABHAN services...\n');
    
    // Step 1: Cleanup ports
    console.log('Step 1: Cleaning up existing processes...');
    await cleanupPorts();
    
    // Step 2: Test PostgreSQL
    console.log('Step 2: Testing PostgreSQL connection...');
    await testPostgreSQL();
    
    // Step 3: Start services
    console.log('Step 3: Starting services...\n');
    
    const baseDir = path.join(__dirname, '..');
    
    // Start Auth Service
    setTimeout(() => {
      startService(
        'Auth Service',
        3001,
        'npm run dev',
        path.join(baseDir, 'backend/services/auth-service')
      );
    }, 1000);
    
    // Start User Service  
    setTimeout(() => {
      startService(
        'User Service',
        3002,
        'npx ts-node src/server.ts',
        path.join(baseDir, 'backend/services/user-service')
      );
    }, 4000);
    
    // Start Document Service
    setTimeout(() => {
      startService(
        'Document Service',
        3003,
        'npm run dev',
        path.join(baseDir, 'backend/services/document-service')
      );
    }, 7000);
    
    // Start Solar Calculator Service
    setTimeout(() => {
      startService(
        'Solar Calculator Service',
        3004,
        'npm run dev',
        path.join(baseDir, 'backend/services/solar-calculator-service')
      );
    }, 8500);
    
    // Start Frontend
    setTimeout(() => {
      startService(
        'Frontend',
        3000,
        'npm run dev',
        path.join(baseDir, 'frontend/rabhan-web')
      );
    }, 10000);
    
    console.log('\n========================================');
    console.log('🎉 All RABHAN services are starting...');
    console.log('========================================\n');
    console.log('Services:');
    console.log('- Auth Service:             http://localhost:3001');
    console.log('- User Service:             http://localhost:3002');
    console.log('- Document Service:         http://localhost:3003');
    console.log('- Solar Calculator Service: http://localhost:3004');
    console.log('- Frontend:                 http://localhost:3000\n');
    console.log('⏳ Wait 15-20 seconds for all services to initialize');
    console.log('📊 Check console outputs for startup status\n');
    
  } catch (error) {
    console.error('❌ Failed to start services:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startAllServices();
}

module.exports = { startAllServices };