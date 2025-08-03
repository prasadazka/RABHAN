const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Simple document upload test
app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  try {
    console.log('=== DOCUMENT UPLOAD TEST ===');
    console.log('File:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer.length
    } : 'No file');
    
    console.log('Body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        code: 'MISSING_FILE'
      });
    }

    const { userId, categoryId } = req.body;
    
    if (!userId || !categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId and categoryId',
        code: 'MISSING_FIELDS'
      });
    }

    // Basic validation
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        code: 'INVALID_FILE_TYPE',
        allowed: allowedTypes,
        received: req.file.mimetype
      });
    }
    
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        code: 'FILE_TOO_LARGE',
        maxSize,
        received: req.file.size
      });
    }

    // Success response
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.status(201).json({
      success: true,
      document_id: documentId,
      message: 'Document uploaded successfully',
      validation_results: {
        overall_score: 100,
        file_validation: { valid: true, issues: [] },
        virus_scan: { status: 'clean', clean: true },
        content_validation: { valid: true, confidence: 100, issues: [] },
        security_validation: { valid: true, risk_level: 'low', issues: [] }
      },
      file_info: {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        userId,
        categoryId
      }
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Document upload failed',
      code: 'UPLOAD_FAILED',
      details: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'document-service-test',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Document Service Test running on port ${PORT}`);
});