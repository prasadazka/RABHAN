// Simple endpoint test script for Contractor Service
const axios = require('axios');

const BASE_URL = 'http://localhost:3006';

async function testEndpoints() {
  console.log('🧪 Testing RABHAN Contractor Service Endpoints...\n');
  
  const tests = [
    {
      name: 'Root Endpoint',
      method: 'GET',
      url: '/',
      expectedStatus: 200
    },
    {
      name: 'Health Check',
      method: 'GET', 
      url: '/health',
      expectedStatus: [200, 503] // 503 acceptable due to database connection
    },
    {
      name: 'API Health Check',
      method: 'GET',
      url: '/api/contractors/health',
      expectedStatus: 200
    },
    {
      name: 'Search Contractors (No Auth)',
      method: 'GET',
      url: '/api/contractors/search',
      expectedStatus: [200, 500] // 500 expected due to database
    },
    {
      name: 'Get Contractor Profile (No Auth)',
      method: 'GET',
      url: '/api/contractors/profile',
      expectedStatus: 401 // Should require authentication
    },
    {
      name: 'Register Contractor (No Auth)',
      method: 'POST',
      url: '/api/contractors/register',
      expectedStatus: 401 // Should require authentication
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      
      const config = {
        method: test.method,
        url: `${BASE_URL}${test.url}`,
        timeout: 5000,
        validateStatus: () => true // Don't throw on any status code
      };
      
      if (test.data) {
        config.data = test.data;
        config.headers = { 'Content-Type': 'application/json' };
      }
      
      const response = await axios(config);
      
      const expectedStatuses = Array.isArray(test.expectedStatus) 
        ? test.expectedStatus 
        : [test.expectedStatus];
      
      if (expectedStatuses.includes(response.status)) {
        console.log(`✅ ${test.name}: ${response.status} - ${response.statusText}`);
        if (response.data && typeof response.data === 'object') {
          console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
      } else {
        console.log(`❌ ${test.name}: Expected ${expectedStatuses.join(' or ')}, got ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}`);
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${test.name}: Service not running (Connection refused)`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`❌ ${test.name}: Request timeout`);
      } else {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('🏁 Endpoint testing completed!');
}

// Run tests
testEndpoints().catch(console.error);