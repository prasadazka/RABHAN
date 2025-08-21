const express = require('express');

const app = express();
const PORT = 3006;

// Enable CORS manually
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Parse JSON
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Admin Service Proxy is running', 
    timestamp: new Date().toISOString() 
  });
});

// Admin login endpoint
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    
    console.log('Admin login attempt:', req.body);
    
    // Transform request for auth service compatibility
    const { username, password } = req.body;
    const authRequest = {
      email: username,
      password: password,
      userType: 'USER' // Admin users are stored as USER type with admin role
    };
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authRequest)
    });

    const data = await response.json();
    console.log('Auth service response:', response.status, data);
    
    // Transform response to match admin dashboard expectations
    if (data.success && data.data && data.data.user) {
      const user = data.data.user;
      
      // Transform to admin dashboard format
      data.data.user = {
        id: user.id,
        username: user.email,
        email: user.email,
        role: 'super_admin',
        permissions: [
          'dashboard.view',
          'users.view',
          'contractors.view',
          'quotes.view',
          'products.view',
          'loans.view',
          'analytics.view',
          'compliance.view',
          'settings.view'
        ],
        profile: {
          firstName: user.first_name,
          lastName: user.last_name,
          avatar: null,
          department: 'Administration',
          lastLogin: new Date().toISOString()
        }
      };
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal proxy error',
      error: error.message 
    });
  }
});

// Contractors endpoints proxy to contractor service
app.get('/api/contractors', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const queryParams = new URLSearchParams(req.query);
    
    const response = await fetch(`http://localhost:3004/api/contractors/admin/contractors?${queryParams}`, {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json',
        'x-service': 'admin-service'
      }
    });
    
    const data = await response.json();
    
    // Transform contractor data to match frontend expectations
    if (data.success && data.data && Array.isArray(data.data)) {
      data.data = data.data.map(contractor => ({
        ...contractor,
        companyName: contractor.businessName, // Map businessName to companyName for frontend
        name: contractor.businessName // Also add name field as backup
      }));
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contractors',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Admin Service Proxy running on port ${PORT}`);
  console.log(`💡 Admin login available at http://localhost:${PORT}/api/v1/auth/login`);
  console.log(`📊 Dashboard APIs available at http://localhost:${PORT}/api/dashboard/*`);
});