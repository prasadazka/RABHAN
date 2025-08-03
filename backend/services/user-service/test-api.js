// Test user service API with JWT token from auth service
const axios = require('axios');

async function testUserService() {
  try {
    // First get a JWT token from auth service
    console.log('Getting JWT token from auth service...');
    const authResponse = await axios.post('http://localhost:3001/api/auth/register', {
      first_name: 'Omar',
      last_name: 'Al-Riyadh',
      email: 'omar.alriyadh.test@rabhan.sa',
      password: 'SecurePass123!',
      phone: '+966507654321',
      national_id: '2234567890',
      user_type: 'HOMEOWNER'
    });

    console.log('Auth registration successful:', authResponse.data.success);
    const token = authResponse.data.data.accessToken;
    console.log('JWT Token obtained');

    // Now test user service with the token
    console.log('\nTesting user service with JWT token...');
    const userResponse = await axios.post('http://localhost:3005/api/user/profiles/register', {
      auth_user_id: authResponse.data.data.user.id,
      first_name: 'Omar',
      last_name: 'Al-Riyadh',
      phone: '+966507654321',
      national_id: '2234567890',
      date_of_birth: '1990-01-01',
      nationality: 'Saudi',
      city: 'Riyadh',
      district: 'Al-Olaya',
      street_address: '123 King Fahd Road',
      postal_code: '12345',
      user_type: 'HOMEOWNER',
      employment_status: 'EMPLOYED',
      monthly_income: 15000,
      employer_name: 'Tech Company'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('User service test successful:', userResponse.data);

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testUserService();