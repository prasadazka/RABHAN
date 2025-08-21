// Development startup script for admin service
const { spawn } = require('child_process');

console.log('🚀 Starting RABHAN Admin Service in development mode...');

// Start with ts-node and force the server to start
const child = spawn('npx', ['ts-node', '--transpile-only', '-e', `
console.log('Loading admin service...');
const { AdminServiceApp } = require('./src/server.ts');

async function startService() {
  try {
    console.log('Creating admin service instance...');
    const adminService = new AdminServiceApp();
    
    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Starting admin server...');
    await adminService.start();
    
    console.log('✅ Admin service started successfully!');
  } catch (error) {
    console.error('❌ Failed to start admin service:', error);
    process.exit(1);
  }
}

startService();
`], {
  cwd: process.cwd(),
  stdio: 'inherit'
});

child.on('close', (code) => {
  console.log(`Admin service exited with code ${code}`);
});

child.on('error', (error) => {
  console.error('Failed to start admin service:', error);
});