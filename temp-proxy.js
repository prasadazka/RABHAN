const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Proxy quotes list endpoint to quote service (admin-specific with assignments)
app.get('/api/quotes', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const queryParams = new URLSearchParams(req.query);
    
    const response = await fetch(`http://localhost:3009/api/admin/quotes-with-assignments?${queryParams}`, {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ success: false, message: 'Proxy error', error: error.message });
  }
});

// Proxy individual quote details endpoint
app.get('/api/v1/quotes/:quoteId', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const { quoteId } = req.params;
    
    const response = await fetch(`http://localhost:3009/api/admin/quotes/${quoteId}`, {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error for quote details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quote details', error: error.message });
  }
});

// Proxy quote assignments endpoint
app.get('/api/v1/quotes/:quoteId/assignments', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const { quoteId } = req.params;
    
    const response = await fetch(`http://localhost:3009/api/admin/quotes/${quoteId}/assignments`, {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error for quote assignments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quote assignments', error: error.message });
  }
});

// Proxy contractor quotes endpoint (alternative name for assignments)
app.get('/api/v1/quotes/:quoteId/contractor-quotes', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const { quoteId } = req.params;
    
    const response = await fetch(`http://localhost:3009/api/admin/quotes/${quoteId}/assignments`, {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error for contractor quotes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contractor quotes', error: error.message });
  }
});

// Get available contractors for assignment
app.get('/api/contractors/available', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const queryParams = new URLSearchParams(req.query);
    
    const response = await fetch(`http://localhost:3009/api/admin/contractors/available?${queryParams}`, {
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error for available contractors:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch available contractors', error: error.message });
  }
});

// Assign contractors to quote
app.post('/api/v1/quotes/:quoteId/assign-contractors', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const { quoteId } = req.params;
    
    const response = await fetch(`http://localhost:3009/api/admin/quotes/${quoteId}/assign-contractors`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token-admin-proxy',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error for contractor assignment:', error);
    res.status(500).json({ success: false, message: 'Failed to assign contractors', error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ healthy: true, service: 'temp-admin-proxy' });
});

app.listen(3006, () => {
  console.log('🚀 Temporary admin proxy running on port 3006');
  console.log('📋 Proxying /api/quotes to quote service on port 3009');
});