// Direct execution to start the admin service
console.log('🚀 Starting RABHAN Admin Service...');

async function startAdminService() {
  try {
    // Wait a moment for any async initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { AdminServiceApp } = require('./dist/server.js');
    const adminService = new AdminServiceApp();
    
    console.log('📋 Initializing admin service...');
    
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🎯 Starting HTTP server...');
    await adminService.start();
    
    console.log('✅ Admin Service started successfully');
  } catch (error) {
    console.error('❌ Failed to start Admin Service:', error);
    process.exit(1);
  }
}

startAdminService();