import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3008;
const DOCUMENT_SERVICE_URL = 'http://localhost:3003';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'document-proxy-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Proxy all document requests to the document service
app.use('/api/documents', createProxyMiddleware({
  target: DOCUMENT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/documents': '/api/documents'
  },
  onError: (err: any, req: any, res: any) => {
    console.error('Proxy error:', err);
    if (res.headersSent) {
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Document service unavailable',
      code: 'PROXY_ERROR',
    });
  },
  onProxyReq: (proxyReq: any, req: any, res: any) => {
    console.log(`Proxying ${req.method} ${req.path} to ${DOCUMENT_SERVICE_URL}${req.path}`);
  },
  onProxyRes: (proxyRes: any, req: any, res: any) => {
    console.log(`Proxy response: ${proxyRes.statusCode} for ${req.method} ${req.path}`);
  },
}));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled application error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Document Proxy Service started successfully on port ${PORT}`);
  console.log(`Proxying requests to: ${DOCUMENT_SERVICE_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Process ID: ${process.pid}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;