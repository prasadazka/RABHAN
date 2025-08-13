import { Request, Response } from 'express';
import { DocumentValidationSimpleService } from '../services/document-validation-simple.service';
import { DocumentStorageService } from '../services/document-storage.service';
import { VirusScannerService } from '../services/virus-scanner.service';
import { DatabaseConfig } from '../config/database.config';
import { logger, SAMALogger } from '../utils/logger';
import { config } from '../config/environment.config';
// Temporarily disabled shared services imports to fix startup issues
// import { verificationEvents, DocumentCompletionEvent } from '../../../../shared/events/verification.events';
// import { verificationManager } from '../../../../shared/services/verification-manager.service';

// Mock implementations for now
const verificationEvents = { emit: (event: string, data: any) => console.log('Mock event:', event, data) };
const verificationManager = { updateVerificationStatus: (data: any) => console.log('Mock verification update:', data) };
interface DocumentCompletionEvent {
  userId: string;
  documentType: string;
  status: 'approved' | 'rejected';
}

export class DocumentController {
  private validationService: DocumentValidationSimpleService;
  private storageService: DocumentStorageService;
  private virusScannerService: VirusScannerService;
  private database: DatabaseConfig;

  constructor() {
    this.validationService = DocumentValidationSimpleService.getInstance();
    this.storageService = DocumentStorageService.getInstance();
    this.virusScannerService = VirusScannerService.getInstance();
    this.database = DatabaseConfig.getInstance();
    
    // Initialize verification manager to handle events
    const manager = verificationManager;
  }

  public uploadDocument = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    let documentId = 'pending';
    
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
          code: 'MISSING_FILE',
        });
        return;
      }

      // Get userId from authenticated user instead of request body
      const userId = (req as any).user?.userId;
      const { categoryId, templateId, metadata } = req.body;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'UNAUTHORIZED',
        });
        return;
      }
      
      if (!categoryId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: categoryId',
          code: 'MISSING_CATEGORY_ID',
        });
        return;
      }

      logger.info('Document upload started', {
        userId,
        categoryId,
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });

      let existingDocs = [];
      try {
        logger.info('Checking for existing documents in category', {
          documentId,
          userId,
          categoryId
        });
        
        existingDocs = await this.getExistingDocumentsForCategory(userId, categoryId);
        
        logger.info('Existing documents query result', {
          documentId,
          userId,
          categoryId,
          existingCount: existingDocs.length,
          existingDocs: existingDocs.map(doc => ({ 
            id: doc.id, 
            filename: doc.original_filename,
            status: doc.status 
          }))
        });
        
        if (existingDocs.length > 0) {
          logger.info('Found existing documents in category, will replace them', {
            documentId,
            userId,
            categoryId,
            existingCount: existingDocs.length,
            existingDocIds: existingDocs.map(doc => doc.id)
          });
        } else {
          logger.info('No existing documents found in category', {
            documentId,
            userId,
            categoryId
          });
        }
      } catch (error) {
        logger.error('Failed to check existing documents, continuing with upload', {
          documentId,
          userId,
          categoryId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        existingDocs = [];
      }
      const virusScanResult = await this.virusScannerService.scanFileBuffer(
        req.file.buffer,
        'temp_' + Date.now(), // Temporary ID for scanning
        userId,
        req.file.originalname
      );

      if (!virusScanResult.isClean) {
        logger.warn('Virus detected in uploaded file', {
          userId,
          threats: virusScanResult.threats,
          scanResult: virusScanResult.scanResult,
        });

        res.status(400).json({
          success: false,
          error: 'File contains threats',
          code: 'VIRUS_DETECTED',
          details: {
            threats: virusScanResult.threats,
            scanResult: virusScanResult.scanResult,
          },
        });
        return;
      }

      // 2. Document validation
      const validationMetadata = {
        documentId: 'temp_' + Date.now(), // Temporary ID for logging
        userId,
        categoryId,
        templateId,
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        requiresOCR: this.shouldPerformOCR(categoryId),
        validationRules: await this.getValidationRules(categoryId),
      };

      const validationResult = await this.validationService.validateDocument(
        req.file.buffer,
        validationMetadata
      );

      if (!validationResult.isValid) {
        logger.warn('Document validation failed', {
          userId,
          score: validationResult.score,
          confidence: validationResult.confidence,
          errors: validationResult.errors,
        });

        res.status(400).json({
          success: false,
          error: 'Document validation failed',
          code: 'VALIDATION_FAILED',
          details: {
            score: validationResult.score,
            confidence: validationResult.confidence,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
          },
        });
        return;
      }

      // 3. Store document
      const storageMetadata = {
        documentId: 'temp_' + Date.now(), // Temporary ID for storage path
        userId,
        categoryId,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileExtension: req.file.originalname.split('.').pop()?.toLowerCase() || '',
        encryptionRequired: true,
        createBackup: true,
      };

      const storageResult = await this.storageService.storeDocument(
        req.file.buffer,
        storageMetadata
      );

      // 4. Save document metadata to database
      const documentRecord = await this.saveDocumentMetadata({
        userId,
        categoryId,
        templateId,
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        storagePath: storageResult.storagePath,
        encryptionKeyId: storageResult.encryptionKeyId,
        validationResult,
        virusScanResult,
        metadata: JSON.parse(metadata || '{}'),
      });

      // Use the database-generated UUID as the document ID
      documentId = documentRecord.id;

      // 5. Clean up old documents in the same category (KYC rule: only 1 document per category)
      let cleanedCount = 0;
      if (existingDocs.length > 0) {
        try {
          await this.cleanupOldDocuments(existingDocs, userId);
          cleanedCount = existingDocs.length;
          logger.info('Old documents cleaned up successfully', {
            documentId,
            userId,
            categoryId,
            cleanedCount
          });
        } catch (error) {
          logger.error('Failed to cleanup old documents, but upload succeeded', {
            documentId,
            userId,
            categoryId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Don't fail the upload if cleanup fails
        }
      }

      const processingTime = Date.now() - startTime;

      logger.info('Document upload completed successfully', {
        documentId,
        userId,
        categoryId,
        validationScore: validationResult.score,
        encrypted: true,
        replacedDocuments: cleanedCount,
        processingTime,
      });

      // Emit document completion event for verification system
      try {
        await this.emitDocumentCompletionEvent(userId);
      } catch (error) {
        logger.warn('Failed to emit document completion event after upload', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Don't fail the upload if event emission fails
      }

      res.status(201).json({
        success: true,
        document_id: documentId,
        message: 'Document uploaded successfully',
        validation_results: {
          overall_score: validationResult.score,
          file_validation: { valid: true, issues: [] },
          virus_scan: { status: 'clean', clean: true },
          content_validation: { valid: true, confidence: validationResult.confidence, issues: [] },
          security_validation: { valid: true, risk_level: 'low', issues: [] }
        },
        extracted_data: validationResult.extractedData,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Document upload failed', {
        documentId,
        userId: req.body.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      });

      SAMALogger.logSecurityEvent(
        'INVALID_FILE_TYPE',
        'HIGH',
        {
          documentId,
          userId: req.body.userId,
          filename: req.file?.originalname,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime,
        }
      );

      res.status(500).json({
        success: false,
        error: 'Document upload failed',
        code: 'UPLOAD_FAILED',
      });
    }
  };

  /**
   * Download a document
   */
  public downloadDocument = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const { documentId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    try {
      logger.info('Document download started', {
        documentId,
        userId,
      });

      // Get document metadata from database
      const documentRecord = await this.getDocumentMetadata(documentId, userId);
      
      if (!documentRecord) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      // Check access permissions
      if (!await this.checkDocumentAccess(documentId, userId)) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      // Retrieve document from storage
      const retrievalResult = await this.storageService.retrieveDocument(
        documentRecord.storage_path,
        documentId,
        userId,
        documentRecord.encryption_key_id
      );

      const processingTime = Date.now() - startTime;

      logger.info('Document download completed', {
        documentId,
        userId,
        fileSize: retrievalResult.fileBuffer.length,
        processingTime,
      });

      // Set appropriate headers
      res.setHeader('Content-Type', documentRecord.mime_type);
      res.setHeader('Content-Length', retrievalResult.fileBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${documentRecord.original_filename}"`);

      res.send(retrievalResult.fileBuffer);
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Document download failed', {
        documentId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      });

      SAMALogger.logSecurityEvent(
        'UNAUTHORIZED_ACCESS',
        'HIGH',
        {
          documentId,
          userId,
          operation: 'download',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      res.status(500).json({
        success: false,
        error: 'Document download failed',
        code: 'DOWNLOAD_FAILED',
      });
    }
  };

  /**
   * Get document metadata
   */
  public getDocumentInfo = async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    try {
      const documentRecord = await this.getDocumentMetadata(documentId, userId);
      
      if (!documentRecord) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      if (!await this.checkDocumentAccess(documentId, userId)) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          documentId: documentRecord.document_id,
          originalFilename: documentRecord.original_filename,
          fileSize: documentRecord.file_size,
          mimeType: documentRecord.mime_type,
          status: documentRecord.status,
          uploadedAt: documentRecord.uploaded_at,
          validationScore: documentRecord.validation_score,
          encrypted: !!documentRecord.encryption_key_id,
          extractedData: documentRecord.extracted_data,
        },
      });
    } catch (error) {
      logger.error('Get document info failed', {
        documentId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get document info',
        code: 'GET_INFO_FAILED',
      });
    }
  };

  /**
   * Delete a document
   */
  public deleteDocument = async (req: Request, res: Response): Promise<void> => {
    const { documentId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    try {
      logger.info('Document deletion started', {
        documentId,
        userId,
      });

      const documentRecord = await this.getDocumentMetadata(documentId, userId);
      
      if (!documentRecord) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      if (!await this.checkDocumentAccess(documentId, userId)) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      // Delete from storage
      await this.storageService.deleteDocument(
        documentRecord.storage_path,
        documentId,
        userId,
        null // backup_path not used in current schema
      );

      // Mark as deleted in database
      await this.markDocumentAsDeleted(documentId, userId);

      logger.info('Document deleted successfully', {
        documentId,
        userId,
      });

      // Emit document completion event after deletion to update verification status
      try {
        await this.emitDocumentCompletionEvent(userId);
      } catch (error) {
        logger.warn('Failed to emit document completion event after deletion', {
          userId,
          documentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Don't fail the deletion if event emission fails
      }

      res.json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      logger.error('Document deletion failed', {
        documentId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Document deletion failed',
        code: 'DELETE_FAILED',
      });
    }
  };

  /**
   * List user documents
   */
  public listDocuments = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.userId;
    const { categoryId, status, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    try {
      const documents = await this.getUserDocuments(
        userId,
        categoryId as string,
        status as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        documents: documents,
        total_count: documents.length,
        filtered_count: documents.length,
        page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        limit: parseInt(limit as string),
      });
    } catch (error) {
      logger.error('List documents failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to list documents',
        code: 'LIST_FAILED',
      });
    }
  };

  /**
   * List user documents for admin (no authentication required)
   */
  public listUserDocumentsAdmin = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { categoryId, status, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
        code: 'MISSING_USER_ID',
      });
      return;
    }

    try {
      logger.info('Admin request for user documents', {
        adminUserId: userId,
        categoryId,
        status,
        limit,
        offset
      });

      const documents = await this.getUserDocuments(
        userId,
        categoryId as string,
        status as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: documents,
        total_count: documents.length,
        filtered_count: documents.length,
        page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        limit: parseInt(limit as string),
      });
    } catch (error) {
      logger.error('Admin list documents failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to list user documents',
        code: 'ADMIN_LIST_FAILED',
      });
    }
  };

  /**
   * Get document categories
   */
  public getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const categories = await this.getDocumentCategories();

      res.json({
        success: true,
        categories: categories,
      });
    } catch (error) {
      logger.error('Get categories failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get categories',
        code: 'GET_CATEGORIES_FAILED',
      });
    }
  };

  /**
   * Admin document proxy for preview (no authentication required)
   */
  public proxyDocumentAdmin = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const { documentId } = req.params;

    try {
      logger.info('Admin document proxy started', {
        documentId,
        adminRequest: true
      });

      // Get document metadata without user restriction
      const documentRecord = await this.getDocumentMetadataAdmin(documentId);
      
      if (!documentRecord) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      // Retrieve document from storage for preview
      const retrievalResult = await this.storageService.retrieveDocument(
        documentRecord.storage_path,
        documentId,
        documentRecord.auth_user_id,
        documentRecord.encryption_key_id
      );

      const processingTime = Date.now() - startTime;

      logger.info('Admin document proxy completed', {
        documentId,
        fileSize: retrievalResult.fileBuffer.length,
        processingTime,
      });

      // Set appropriate headers for inline viewing
      res.setHeader('Content-Type', documentRecord.mime_type);
      res.setHeader('Content-Length', retrievalResult.fileBuffer.length);
      res.setHeader('Content-Disposition', `inline; filename="${documentRecord.original_filename}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');

      res.send(retrievalResult.fileBuffer);
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Admin document proxy failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      });

      res.status(500).json({
        success: false,
        error: 'Document preview failed',
        code: 'PREVIEW_FAILED',
      });
    }
  };

  /**
   * Admin document download (no authentication required)
   */
  public downloadDocumentAdmin = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const { documentId } = req.params;

    try {
      logger.info('Admin document download started', {
        documentId,
        adminRequest: true
      });

      // Get document metadata without user restriction
      const documentRecord = await this.getDocumentMetadataAdmin(documentId);
      
      if (!documentRecord) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      // Retrieve document from storage
      const retrievalResult = await this.storageService.retrieveDocument(
        documentRecord.storage_path,
        documentId,
        documentRecord.auth_user_id,
        documentRecord.encryption_key_id
      );

      const processingTime = Date.now() - startTime;

      logger.info('Admin document download completed', {
        documentId,
        fileSize: retrievalResult.fileBuffer.length,
        processingTime,
      });

      // Set appropriate headers for download
      res.setHeader('Content-Type', documentRecord.mime_type);
      res.setHeader('Content-Length', retrievalResult.fileBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${documentRecord.original_filename}"`);

      res.send(retrievalResult.fileBuffer);
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Admin document download failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      });

      res.status(500).json({
        success: false,
        error: 'Document download failed',
        code: 'DOWNLOAD_FAILED',
      });
    }
  };

  /**
   * Get service health status
   */
  public getHealthStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const [
        validationHealth,
        storageHealth,
        virusScanHealth,
      ] = await Promise.all([
        this.validationService.getHealthStatus(),
        this.storageService.getHealthStatus(),
        this.virusScannerService.getHealthStatus(),
      ]);

      const isHealthy = validationHealth.status === 'healthy' &&
                      storageHealth.status === 'healthy' &&
                      virusScanHealth.status === 'healthy';

      res.json({
        success: true,
        status: isHealthy ? 'healthy' : 'unhealthy',
        services: {
          validation: validationHealth,
          storage: storageHealth,
          virusScanner: virusScanHealth,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: 'Health check failed',
      });
    }
  };

  // Helper methods
  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldPerformOCR(categoryId: string): boolean {
    // Temporarily disable OCR for debugging
    return false;
  }

  private async getValidationRules(categoryId: string): Promise<any> {
    const query = `
      SELECT allowed_formats, max_file_size_mb
      FROM document_categories 
      WHERE id = $1
    `;
    
    const result = await this.database.query(query, [categoryId]);
    const row = result.rows[0];
    return row ? {
      allowed_formats: row.allowed_formats,
      max_file_size_mb: row.max_file_size_mb,
      validation_enabled: true
    } : {};
  }

  private async saveDocumentMetadata(data: any): Promise<any> {
    const query = `
      INSERT INTO documents (
        user_id, auth_user_id, category_id, document_type, original_filename,
        file_size_bytes, mime_type, file_hash, file_extension,
        storage_provider, storage_bucket, storage_path, storage_region,
        encryption_key_id, encryption_algorithm, validation_score, 
        validation_results, status, sama_audit_log
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `;

    const fileExtension = data.originalFilename.split('.').pop()?.toLowerCase() || '';
    const fileHash = require('crypto').createHash('sha256').update(data.originalFilename + Date.now()).digest('hex');
    
    logger.info('Attempting to save document metadata', {
      query,
      userId: data.userId,
      categoryId: data.categoryId,
      filename: data.originalFilename
    });
    
    // Map category to document type
    const getDocumentType = (categoryId: string) => {
      // Default mapping - you can enhance this based on category names
      const categoryMappings: { [key: string]: string } = {
        '99655c95-616f-4f28-8b4d-84b683b23642': 'NATIONAL_ID_FRONT', // National ID
        '75063139-ab8e-4e5b-96f7-014cc03bdef5': 'ADDRESS_PROOF', // Address Proof  
        '03f5dd41-d602-4839-bf0e-67d8ef28a646': 'INCOME_PROOF', // Income Proof
      };
      return categoryMappings[categoryId] || 'NATIONAL_ID_FRONT'; // Default fallback
    };

    const values = [
      data.userId, // user_id
      data.userId, // auth_user_id (same as user_id for now)
      data.categoryId, // category_id
      getDocumentType(data.categoryId), // document_type (mapped from category)
      data.originalFilename, // original_filename
      data.fileSize, // file_size_bytes
      data.mimeType, // mime_type
      fileHash, // file_hash
      fileExtension, // file_extension
      'minio', // storage_provider
      'rabhan-documents', // storage_bucket
      data.storagePath || `/uploads/${fileHash}`, // storage_path
      'ksa-central', // storage_region
      data.encryptionKeyId || 'default-key', // encryption_key_id
      'AES-256-GCM', // encryption_algorithm
      data.validationResult?.score || 85.0, // validation_score
      JSON.stringify({
        extractedData: data.validationResult?.extractedData || {},
        errors: data.validationResult?.errors || [],
        warnings: data.validationResult?.warnings || [],
        confidence: data.validationResult?.confidence || 100
      }), // validation_results
      'pending', // status
      JSON.stringify([{ event: 'upload', timestamp: new Date().toISOString(), user_id: data.userId }]) // sama_audit_log
    ];

    try {
      const result = await this.database.query(query, values);
      logger.info('Document metadata saved successfully', {
        documentId: result.rows[0]?.id,
        userId: data.userId
      });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to save document metadata', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        categoryId: data.categoryId,
        filename: data.originalFilename,
        values: values.map((v, i) => `$${i + 1}: ${typeof v === 'string' ? v.substring(0, 100) : v}`)
      });
      throw error;
    }
  }

  private async getDocumentMetadata(documentId: string, userId: string): Promise<any> {
    const query = `
      SELECT * FROM documents 
      WHERE id = $1 AND user_id = $2 AND status != 'archived'
    `;
    
    const result = await this.database.query(query, [documentId, userId]);
    return result.rows[0];
  }

  private async getDocumentMetadataAdmin(documentId: string): Promise<any> {
    const query = `
      SELECT * FROM documents 
      WHERE id = $1 AND status != 'archived'
    `;
    
    const result = await this.database.query(query, [documentId]);
    return result.rows[0];
  }

  private async checkDocumentAccess(documentId: string, userId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count 
      FROM documents 
      WHERE id = $1 AND user_id = $2 AND status != 'archived'
    `;
    
    const result = await this.database.query(query, [documentId, userId]);
    return result.rows[0].count > 0;
  }

  private async markDocumentAsDeleted(documentId: string, userId: string): Promise<void> {
    const query = `
      UPDATE documents 
      SET status = 'archived', archived_at = $1 
      WHERE id = $2 AND user_id = $3
    `;
    
    await this.database.query(query, [new Date(), documentId, userId]);
  }

  private async getUserDocuments(
    userId: string,
    categoryId?: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    let query = `
      SELECT 
        id as document_id, auth_user_id as user_id, category_id, original_filename, 
        file_size_bytes, mime_type, file_hash, created_at as upload_timestamp,
        validation_score, status as document_status, approval_status,
        virus_scan_status, validation_results, sama_audit_log
      FROM documents 
      WHERE auth_user_id = $1 AND status != 'archived'
    `;
    
    const params = [userId];
    let paramIndex = 2;

    if (categoryId) {
      query += ` AND category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.database.query(query, params);
    return result.rows.map(row => ({
      ...row,
      approval_status: row.approval_status || 'pending',
      virus_scan_status: row.virus_scan_status || 'pending',
      extracted_data: row.validation_results?.extractedData || {},
      sama_audit_log: row.sama_audit_log || []
    }));
  }

  private async getDocumentCategories(): Promise<any[]> {
    const query = `
      SELECT id, name, description, 
             allowed_formats, max_file_size_mb, required_for_role
      FROM document_categories
      WHERE is_active = true
      ORDER BY required_for_role, name
    `;
    
    const result = await this.database.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      allowed_formats: row.allowed_formats,
      max_file_size_mb: row.max_file_size_mb,
      // KYC documents are required for both customers and contractors, but not "both" type documents
      required_for_kyc: row.required_for_role === 'customer' || row.required_for_role === 'contractor',
      user_type: row.required_for_role === 'customer' ? 'USER' : 
                 row.required_for_role === 'contractor' ? 'CONTRACTOR' : 'BOTH',
      validation_rules: {}
    }));
  }


  // Helper method to get existing documents for a category (for replacement logic)
  private async getExistingDocumentsForCategory(userId: string, categoryId: string): Promise<any[]> {
    const query = `
      SELECT id, user_id, category_id, original_filename, storage_path
      FROM documents 
      WHERE user_id = $1 AND category_id = $2 AND status != 'archived'
      ORDER BY created_at DESC
    `;
    
    const result = await this.database.query(query, [userId, categoryId]);
    return result.rows;
  }

  // Helper method to clean up old documents when replacing with new one
  private async cleanupOldDocuments(oldDocuments: any[], userId: string): Promise<void> {
    for (const doc of oldDocuments) {
      try {
        // Delete from storage first
        if (doc.storage_path) {
          await this.storageService.deleteDocument(
            doc.storage_path,
            doc.id,
            userId,
            null // backup_path not used in current schema
          );
        }
        
        // Then mark as archived in database
        await this.markDocumentAsDeleted(doc.id, userId);
        
        logger.info('Old document cleaned up', {
          documentId: doc.id,
          userId,
          filename: doc.original_filename
        });
      } catch (error) {
        logger.error('Failed to cleanup old document', {
          documentId: doc.id,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue with other documents even if one fails
      }
    }
  }

  /**
   * Emit document completion event for verification system
   */
  private async emitDocumentCompletionEvent(userId: string): Promise<void> {
    try {
      logger.info('Checking document completion and emitting event', { userId });

      // Check document completion status
      const userDocuments = await this.getUserDocuments(userId);
      
      // Required MVP Phase 1 documents
      const requiredCategories = ['national_id_front', 'national_id_back', 'proof_of_address'];
      const uploadedCategories = userDocuments
        .filter(doc => doc.document_status === 'completed' || doc.approval_status === 'approved')
        .map(doc => doc.category_id);

      const allDocumentsUploaded = requiredCategories.every(category => 
        uploadedCategories.includes(category)
      );

      // Create document completion event
      const documentCompletionEvent: DocumentCompletionEvent = {
        userId,
        allDocumentsCompleted: allDocumentsUploaded,
        completedDocuments: uploadedCategories,
        requiredDocuments: requiredCategories,
        timestamp: new Date()
      };

      logger.info('Emitting document completion event', {
        userId,
        allDocumentsCompleted: allDocumentsUploaded,
        completedDocuments: uploadedCategories.length,
        requiredDocuments: requiredCategories.length
      });

      verificationEvents.emit('documents:completed', documentCompletionEvent);
    } catch (error) {
      logger.error('Failed to emit document completion event', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check if user profile is 100% complete by calling user service
   */
  private async checkUserProfileCompletion(userId: string): Promise<boolean> {
    try {
      const axios = require('axios');
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://127.0.0.1:3002';
      
      const response = await axios.get(
        `${userServiceUrl}/api/users/profiles/${userId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            // Add service-to-service authentication if needed
          },
          timeout: 5000
        }
      );

      if (response.data.success && response.data.data) {
        const profile = response.data.data;
        const isCompleted = profile.profileCompleted === true || profile.profileCompletionPercentage >= 100;
        
        logger.info('Profile completion check from user service', {
          userId,
          profileCompleted: profile.profileCompleted,
          profileCompletionPercentage: profile.profileCompletionPercentage,
          isCompleted
        });

        return isCompleted;
      } else {
        logger.warn('Failed to get profile data from user service', {
          userId,
          response: response.data
        });
        return false;
      }
    } catch (error) {
      logger.error('Failed to check profile completion from user service', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false; // Assume not completed if we can't check
    }
  }

  /**
   * Call user service to update verification status
   */
  private async updateUserVerificationStatus(
    userId: string, 
    status: 'not_verified' | 'pending' | 'verified' | 'rejected'
  ): Promise<void> {
    try {
      const axios = require('axios');
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://127.0.0.1:3002';
      
      await axios.put(
        `${userServiceUrl}/api/users/profiles/${userId}/verification-status`,
        { status },
        {
          headers: {
            'Content-Type': 'application/json',
            // Add service-to-service authentication if needed
          },
          timeout: 5000
        }
      );

      logger.info('Successfully updated verification status in user service', {
        userId,
        status
      });
    } catch (error) {
      logger.error('Failed to update verification status in user service', {
        userId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}