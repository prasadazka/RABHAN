const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3007;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'marketplace-service' });
});

app.get('/api/v1/admin/products', (req, res) => {
  console.log('📦 Admin products requested');
  res.json({
    success: true,
    data: [
      {
        id: 'test-product-1',
        name: 'Test Solar Panel',
        description: 'High-efficiency test solar panel',
        brand: 'TestBrand',
        model: 'TP-500W',
        price: 1500,
        currency: 'SAR',
        status: 'PENDING_APPROVAL',
        approval_status: 'PENDING',
        contractor_id: 'test-contractor-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contractor: {
          id: 'test-contractor-1',
          company_name: 'Solar Solutions Co.',
          contact_name: 'Ahmed Al-Rashid',
          email: 'ahmed@solarsolutions.sa',
          phone: '+966501234567'
        }
      },
      {
        id: 'test-product-2', 
        name: 'Premium Solar Inverter',
        description: 'Advanced solar inverter for residential use',
        brand: 'InverterPro',
        model: 'IP-5000',
        price: 2500,
        currency: 'SAR',
        status: 'PENDING_APPROVAL', 
        approval_status: 'PENDING',
        contractor_id: 'test-contractor-2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contractor: {
          id: 'test-contractor-2',
          company_name: 'Green Energy Systems',
          contact_name: 'Fatima Al-Zahra',
          email: 'fatima@greenenergy.sa',
          phone: '+966502345678'
        }
      }
    ],
    message: 'Products retrieved for admin review',
    total: 2
  });
});

app.get('/api/v1/admin/products/pending', (req, res) => {
  console.log('📋 Pending products requested');
  res.json({
    success: true,
    data: {
      data: [
        {
          id: 'test-product-1',
          name: 'Test Solar Panel',
          description: 'High-efficiency test solar panel',
          brand: 'TestBrand',
          price: 1500,
          status: 'PENDING_APPROVAL',
          approval_status: 'PENDING',
          contractor_id: 'test-contractor-1',
          created_at: new Date().toISOString()
        }
      ],
      total: 1
    },
    message: 'Pending products retrieved successfully'
  });
});

app.post('/api/v1/admin/products/:productId/approve', (req, res) => {
  const { productId } = req.params;
  console.log(`✅ Approving product: ${productId}`);
  res.json({
    success: true,
    data: {
      id: productId,
      approval_status: 'APPROVED',
      status: 'ACTIVE'
    },
    message: 'Product approved successfully'
  });
});

app.post('/api/v1/admin/products/:productId/reject', (req, res) => {
  const { productId } = req.params;
  console.log(`❌ Rejecting product: ${productId}`);
  res.json({
    success: true,
    data: {
      id: productId,
      approval_status: 'REJECTED',
      status: 'REJECTED'
    },
    message: 'Product rejected successfully'
  });
});

app.listen(PORT, () => {
  console.log('🚀 Marketplace Service (Simple) running on http://localhost:' + PORT);
  console.log('📦 Health: http://localhost:' + PORT + '/health');
  console.log('📋 Products: http://localhost:' + PORT + '/api/v1/admin/products');
  console.log('⏳ Pending Products: http://localhost:' + PORT + '/api/v1/admin/products/pending');
});