const axios = require('axios');

const AUTH_SERVICE_URL = 'http://localhost:3001';

async function setupTestUsers() {
  console.log('🔧 Setting up Test Users for Penalty API Testing');
  console.log('='.repeat(50));

  try {
    // Test 1: Check auth service
    console.log('📝 Test 1: Auth Service Health');
    
    try {
      const healthResponse = await axios.get(`${AUTH_SERVICE_URL}/health`);
      console.log('   ✅ Auth service is running');
      console.log('     Service:', healthResponse.data.service);
      console.log('     Version:', healthResponse.data.version);
    } catch (error) {
      console.log('   ❌ Auth service not accessible:', error.message);
      return;
    }
    console.log('');

    // Test 2: Try to register admin user
    console.log('📝 Test 2: Register Admin User');
    
    const adminData = {
      email: 'admin@rabhan.com',
      password: 'admin123',
      name: 'Test Admin',
      role: 'admin'
    };

    try {
      const adminRegisterResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/register`, adminData);
      console.log('   ✅ Admin user registered successfully');
      console.log('     User ID:', adminRegisterResponse.data.data?.id);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('   ✅ Admin user already exists');
      } else {
        console.log('   ❌ Admin registration failed:', error.response?.data?.message || error.message);
      }
    }
    console.log('');

    // Test 3: Try to register contractor user
    console.log('📝 Test 3: Register Contractor User');
    
    const contractorData = {
      email: 'contractor@test.com',
      password: 'contractor123',
      name: 'Test Contractor',
      role: 'contractor'
    };

    try {
      const contractorRegisterResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/register`, contractorData);
      console.log('   ✅ Contractor user registered successfully');
      console.log('     User ID:', contractorRegisterResponse.data.data?.id);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('   ✅ Contractor user already exists');
      } else {
        console.log('   ❌ Contractor registration failed:', error.response?.data?.message || error.message);
      }
    }
    console.log('');

    // Test 4: Try to login admin
    console.log('📝 Test 4: Admin Login Test');
    
    try {
      const adminLoginResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
        email: adminData.email,
        password: adminData.password
      });
      
      if (adminLoginResponse.data.success && adminLoginResponse.data.data.token) {
        console.log('   ✅ Admin login successful');
        console.log('     Token length:', adminLoginResponse.data.data.token.length);
        console.log('     User role:', adminLoginResponse.data.data.user?.role);
      } else {
        console.log('   ❌ Admin login failed - unexpected response structure');
      }
    } catch (error) {
      console.log('   ❌ Admin login failed:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 5: Try to login contractor
    console.log('📝 Test 5: Contractor Login Test');
    
    try {
      const contractorLoginResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
        email: contractorData.email,
        password: contractorData.password
      });
      
      if (contractorLoginResponse.data.success && contractorLoginResponse.data.data.token) {
        console.log('   ✅ Contractor login successful');
        console.log('     Token length:', contractorLoginResponse.data.data.token.length);
        console.log('     User role:', contractorLoginResponse.data.data.user?.role);
      } else {
        console.log('   ❌ Contractor login failed - unexpected response structure');
      }
    } catch (error) {
      console.log('   ❌ Contractor login failed:', error.response?.data?.message || error.message);
    }
    console.log('');

    console.log('🎉 Test User Setup COMPLETED!');
    console.log('');
    console.log('✅ Next Steps:');
    console.log('   • Run penalty endpoint tests with authentication');
    console.log('   • Test penalty system functionality with real tokens');
    console.log('   • Verify role-based access control');

  } catch (error) {
    console.error('❌ Test user setup failed:', error.message);
  }
}

setupTestUsers();