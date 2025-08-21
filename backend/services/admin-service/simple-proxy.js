const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3010'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const QUOTE_SERVICE_URL = 'http://localhost:3009';

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'admin-service-proxy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Basic auth login (mock)
app.post('/api/v1/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: 'admin-1',
          username: username,
          email: `${username}@admin.com`,
          role: 'super_admin'
        },
        token: 'mock-jwt-token-' + Date.now(),
        expiresIn: 24 * 60 * 60
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }
});

// Proxy quotes endpoints to quote service
app.get('/api/quotes', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const queryParams = new URLSearchParams(req.query);
    const response = await fetch(`${QUOTE_SERVICE_URL}/api/admin/quotes?${queryParams}`, {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quotes' });
  }
});

app.get('/api/v1/quotes/:quoteId', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const { quoteId } = req.params;
    const response = await fetch(`${QUOTE_SERVICE_URL}/api/admin/quotes/${quoteId}`, {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quote details' });
  }
});

// Assignments endpoint (what frontend calls)
app.get('/api/v1/quotes/:quoteId/assignments', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const { quoteId } = req.params;
    const response = await fetch(`${QUOTE_SERVICE_URL}/api/admin/quotes/${quoteId}/assignments`, {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
});

// Contractor quotes endpoint (alternative name)
app.get('/api/v1/quotes/:quoteId/contractor-quotes', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const { quoteId } = req.params;
    const response = await fetch(`${QUOTE_SERVICE_URL}/api/admin/quotes/${quoteId}/assignments`, {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contractor quotes' });
  }
});

// Mock endpoints for other admin dashboard functionality
app.get('/api/v1/users', async (req, res) => {
  try {
    // Try to fetch from user service first
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('http://localhost:3002/api/users', {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      throw new Error('User service unavailable');
    }
  } catch (error) {
    console.log('User service unavailable, using mock data');
    res.json({
      success: true,
      data: [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+966501234567',
          status: 'active',
          createdAt: new Date().toISOString(),
          verificationStatus: 'verified'
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '+966501234568',
          status: 'active',
          createdAt: new Date().toISOString(),
          verificationStatus: 'pending'
        }
      ],
      meta: { total: 2, page: 1, limit: 10 }
    });
  }
});

// Contractors endpoint
app.get('/api/contractors', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('http://localhost:3004/api/contractors', {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      throw new Error('Contractor service unavailable');
    }
  } catch (error) {
    console.log('Contractor service unavailable, using mock data');
    res.json({
      success: true,
      data: [
        {
          id: '1',
          businessName: 'Solar Pro Solutions',
          email: 'admin@solarpro.sa',
          phone: '+966501234570',
          status: 'active',
          verificationStatus: 'verified',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          businessName: 'Green Energy Co',
          email: 'info@greenenergy.sa',
          phone: '+966501234571',
          status: 'pending',
          verificationStatus: 'pending',
          createdAt: new Date().toISOString()
        }
      ],
      meta: { total: 2, page: 1, limit: 10 }
    });
  }
});

// Contractor analytics
app.get('/api/dashboard/contractor-analytics', (req, res) => {
  res.json({
    success: true,
    data: {
      totalContractors: 25,
      activeContractors: 18,
      newContractorsThisMonth: 3,
      averageRating: 4.2,
      verificationRate: 72.0
    }
  });
});

app.get('/api/v1/dashboard/user-analytics', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 1250,
      activeUsers: 980,
      newUsersThisMonth: 85,
      verificationRate: 78.5,
      userGrowth: [
        { month: 'Jan', users: 1100 },
        { month: 'Feb', users: 1180 },
        { month: 'Mar', users: 1250 }
      ],
      statusDistribution: {
        verified: 65,
        pending: 25,
        rejected: 10
      }
    }
  });
});

// Dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 1250,
      activeLoans: 284,
      totalContractors: 25,
      monthlyRevenue: 2500000,
      pendingApprovals: 12,
      completedInstallations: 189,
      energyGenerated: 15600,
      co2Saved: 7800
    }
  });
});

// Dashboard activity
app.get('/api/dashboard/activity', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Dashboard compliance
app.get('/api/dashboard/compliance', (req, res) => {
  res.json({
    success: true,
    data: {
      sama: 'compliant',
      kycApproval: 94.2,
      riskAssessment: 'low',
      auditScore: 97
    }
  });
});

const PORT = 3006;
app.listen(PORT, () => {
  console.log(`🚀 Admin Service Proxy running on port ${PORT}`);
  console.log(`📋 Proxying quote requests to ${QUOTE_SERVICE_URL}`);
  console.log(`🔗 Admin Dashboard: http://localhost:3010`);
});