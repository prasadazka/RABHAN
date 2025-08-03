// Minimal test server for contractor service endpoint testing
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3006;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'RABHAN Contractor Management Service',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    compliance: 'SAMA Level 4',
    environment: 'test'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'contractor-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'test',
    database: 'skipped',
    port: PORT
  });
});

// API Health check
app.get('/api/contractors/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'contractor-service',
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0'
    }
  });
});

// Search contractors (public endpoint)
app.get('/api/contractors/search', (req, res) => {
  // Mock response showing structure
  res.json({
    success: true,
    data: {
      contractors: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          business_name: 'Solar Solutions Riyadh',
          business_name_ar: 'حلول الطاقة الشمسية الرياض',
          business_type: 'llc',
          email: 'contact@solarsolutions.sa',
          phone: '+966501234567',
          city: 'Riyadh',
          region: 'Riyadh',
          service_categories: ['residential_solar', 'commercial_solar'],
          service_areas: ['Riyadh', 'Al Kharj'],
          years_experience: 6,
          status: 'active',
          verification_level: 4,
          average_rating: 4.5,
          total_reviews: 25,
          created_at: new Date()
        }
      ],
      total_count: 1,
      page: 1,
      limit: 20,
      total_pages: 1
    },
    metadata: {
      timestamp: new Date(),
      request_id: 'test_' + Date.now(),
      version: '1.0.0'
    }
  });
});

// Get contractor profile (requires auth)
app.get('/api/contractors/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'User authentication required',
        timestamp: new Date()
      }
    });
  }
  
  // Mock authenticated response
  res.json({
    success: true,
    data: {
      id: '22222222-2222-2222-2222-222222222222',
      user_id: '33333333-3333-3333-3333-333333333333',
      business_name: 'Test Contractor',
      business_type: 'individual',
      email: 'test@contractor.sa',
      phone: '+966501234567',
      status: 'pending',
      verification_level: 0
    }
  });
});

// Register contractor (requires auth)
app.post('/api/contractors/register', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'User authentication required',
        timestamp: new Date()
      }
    });
  }
  
  // Mock registration response
  res.status(201).json({
    success: true,
    data: {
      id: '44444444-4444-4444-4444-444444444444',
      user_id: '55555555-5555-5555-5555-555555555555',
      business_name: req.body.business_name || 'New Contractor',
      business_type: req.body.business_type || 'individual',
      email: req.body.email || 'new@contractor.sa',
      phone: req.body.phone || '+966501234567',
      status: 'pending',
      verification_level: 0,
      created_at: new Date()
    },
    metadata: {
      timestamp: new Date(),
      request_id: 'test_' + Date.now(),
      version: '1.0.0'
    }
  });
});

// Get contractor by ID
app.get('/api/contractors/:id', (req, res) => {
  const contractorId = req.params.id;
  
  if (!contractorId || contractorId.length < 10) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Valid contractor ID required',
        timestamp: new Date()
      }
    });
  }
  
  // Mock contractor data
  res.json({
    success: true,
    data: {
      id: contractorId,
      business_name: 'Mock Contractor',
      business_type: 'llc',
      email: 'mock@contractor.sa',
      phone: '+966501234567',
      city: 'Riyadh',
      region: 'Riyadh',
      status: 'active',
      verification_level: 3,
      average_rating: 4.2,
      total_reviews: 15
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested endpoint was not found',
      timestamp: new Date()
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🧪 Test Contractor Service running on port ${PORT}`);
  console.log(`📋 Endpoints available:`);
  console.log(`   GET  /                           - Service info`);
  console.log(`   GET  /health                     - Health check`);
  console.log(`   GET  /api/contractors/health     - API health`);
  console.log(`   GET  /api/contractors/search     - Search contractors`);
  console.log(`   GET  /api/contractors/profile    - Get profile (auth required)`);
  console.log(`   POST /api/contractors/register   - Register (auth required)`);
  console.log(`   GET  /api/contractors/:id        - Get by ID`);
  console.log(`\n🔄 Run 'node test-endpoints.js' to test all endpoints`);
});