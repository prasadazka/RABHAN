import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import {
  uploadMiddleware,
  handleUploadError,
  validateUploadRequest,
  uploadRateLimit,
  securityHeaders,
  requestId,
  requestLogger,
  corsMiddleware,
  authenticate,
  errorHandler,
} from '../middleware/upload.middleware';

const router = Router();
const documentController = new DocumentController();

// Apply global middleware
router.use(securityHeaders);
router.use(requestId);
router.use(requestLogger);
router.use(corsMiddleware);

// Public routes (no authentication required)
// Get document categories
router.get(
  '/categories/list',
  documentController.getCategories
);

// Health check
router.get(
  '/health/status',
  documentController.getHealthStatus
);

// Admin routes (no user authentication required)
router.get(
  '/admin/user/:userId',
  documentController.listUserDocumentsAdmin
);

// Admin document proxy/preview routes
router.get(
  '/admin/proxy/:documentId',
  documentController.proxyDocumentAdmin
);

router.get(
  '/admin/download/:documentId',
  documentController.downloadDocumentAdmin
);

// Protected routes (authentication required)
router.use(authenticate);

// Document upload route
router.post(
  '/upload',
  // uploadRateLimit, // Disabled for testing
  uploadMiddleware.single('file'),
  handleUploadError,
  validateUploadRequest,
  documentController.uploadDocument
);

// Document download route
router.get(
  '/:documentId/download',
  documentController.downloadDocument
);

// Get document information
router.get(
  '/:documentId',
  documentController.getDocumentInfo
);

// Delete document
router.delete(
  '/:documentId',
  documentController.deleteDocument
);

// List user documents
router.get(
  '/',
  documentController.listDocuments
);

// Error handling middleware
router.use(errorHandler);

export default router;