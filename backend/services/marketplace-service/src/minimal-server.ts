/**
 * RABHAN Marketplace Service - Minimal Working Server
 * Quick fix to get the service running
 */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const port = parseInt(process.env.PORT || '3007', 10);

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3006'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'marketplace-service',
    timestamp: new Date().toISOString() 
  });
});

// API info route
app.get('/', (req, res) => {
  res.json({
    name: 'RABHAN Marketplace Service',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      api: '/api/v1'
    }
  });
});

// Basic API routes placeholder
app.get('/api/v1/categories', (req, res) => {
  res.json({ 
    success: true,
    data: [],
    message: 'Categories endpoint - minimal server running' 
  });
});

app.get('/api/v1/products', (req, res) => {
  res.json({ 
    success: true,
    data: [],
    message: 'Products endpoint - minimal server running' 
  });
});

// Admin dashboard compatibility endpoint
app.get('/api/dashboard/products', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Admin dashboard endpoint - marketplace service is running'
  });
});

// Start server
function startServer() {
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 RABHAN Marketplace Service (minimal) started successfully!`);
    console.log(`📍 Server: http://localhost:${port}`);
    console.log(`🏥 Health: http://localhost:${port}/health`);
    console.log(`📚 API Info: http://localhost:${port}/`);
    console.log(`✅ Ready to receive requests`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startServer();