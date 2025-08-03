import { MinioConfig } from '../config/minio.config';
import { EncryptionService } from './encryption.service';
import { logger, SAMALogger } from '../utils/logger';
import { config } from '../config/environment.config';
import path from 'path';
import fs from 'fs/promises';

export interface StorageResult {
  success: boolean;
  storagePath: string;
  etag: string;
  size: number;
  encryptionKeyId: string;
  backupPath?: string | undefined;
  uploadTime: number;
}

export interface StorageMetadata {
  documentId: string;
  userId: string;
  categoryId: string;
  originalFilename: string;
  mimeType: string;
  fileExtension: string;
  encryptionRequired: boolean;
  createBackup: boolean;
  compressionLevel?: number;
}

export class DocumentStorageService {
  private static instance: DocumentStorageService;
  private minio: MinioConfig;
  private encryption: EncryptionService;

  private constructor() {
    this.minio = MinioConfig.getInstance();
    this.encryption = EncryptionService.getInstance();
  }

  public static getInstance(): DocumentStorageService {
    if (!DocumentStorageService.instance) {
      DocumentStorageService.instance = new DocumentStorageService();
    }
    return DocumentStorageService.instance;
  }

  /**
   * Store a document with encryption and backup
   */
  public async storeDocument(
    fileBuffer: Buffer,
    metadata: StorageMetadata
  ): Promise<StorageResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting document storage', {
        documentId: metadata.documentId,
        userId: metadata.userId,
        filename: metadata.originalFilename,
        size: fileBuffer.length,
        encryptionRequired: metadata.encryptionRequired,
      });

      // Validate file buffer
      if (fileBuffer.length === 0) {
        throw new Error('Empty file buffer');
      }

      if (fileBuffer.length > config.server.maxFileSize) {
        throw new Error(`File size ${fileBuffer.length} exceeds maximum ${config.server.maxFileSize}`);
      }

      let processedBuffer = fileBuffer;
      let encryptionKeyId = '';

      // Encrypt the file if required
      if (metadata.encryptionRequired) {
        const encryptionResult = await this.encryption.encryptBuffer(
          fileBuffer,
          metadata.documentId,
          metadata.userId
        );

        processedBuffer = encryptionResult.encryptedBuffer;
        encryptionKeyId = encryptionResult.keyId;

        logger.debug('File encrypted', {
          documentId: metadata.documentId,
          originalSize: fileBuffer.length,
          encryptedSize: processedBuffer.length,
          keyId: encryptionKeyId,
        });
      }

      // Generate storage path
      const storagePath = this.generateStoragePath(metadata);

      // Prepare upload metadata
      const uploadMetadata = {
        documentId: metadata.documentId,
        userId: metadata.userId,
        categoryId: metadata.categoryId,
        originalFilename: metadata.originalFilename,
        contentType: metadata.mimeType,
        fileExtension: metadata.fileExtension,
        encryptionKeyId,
        encrypted: metadata.encryptionRequired,
        uploadTimestamp: new Date().toISOString(),
        fileHash: this.encryption.generateFileHash(fileBuffer),
        originalSize: fileBuffer.length,
        processedSize: processedBuffer.length,
      };

      // Upload to storage (MinIO in production, local in development)
      let uploadResult: { etag: string; size: number; uploadTime: number };
      
      if (config.isDevelopment) {
        // Use local filesystem storage in development
        uploadResult = await this.storeToLocalFilesystem(
          storagePath,
          processedBuffer,
          uploadMetadata
        );
      } else {
        // Use MinIO in production
        uploadResult = await this.minio.uploadFile(
          config.minio.bucketName,
          storagePath,
          processedBuffer,
          uploadMetadata
        );
      }

      // Create backup if required
      let backupPath: string | undefined;
      if (metadata.createBackup) {
        backupPath = await this.createBackup(
          storagePath,
          processedBuffer,
          metadata
        );
      }

      const uploadTime = Date.now() - startTime;

      // Log SAMA compliance event
      SAMALogger.logDocumentEvent(
        'DOCUMENT_UPLOAD',
        metadata.documentId,
        metadata.userId,
        {
          storagePath,
          encrypted: metadata.encryptionRequired,
          backupCreated: !!backupPath,
          uploadTime,
          fileSize: fileBuffer.length,
          processedSize: processedBuffer.length,
        }
      );

      const result: StorageResult = {
        success: true,
        storagePath,
        etag: uploadResult.etag,
        size: uploadResult.size,
        encryptionKeyId,
        backupPath,
        uploadTime,
      };

      logger.info('Document stored successfully', {
        documentId: metadata.documentId,
        userId: metadata.userId,
        storagePath,
        size: result.size,
        encrypted: metadata.encryptionRequired,
        uploadTime,
      });

      return result;
    } catch (error) {
      logger.error('Document storage failed:', {
        documentId: metadata.documentId,
        userId: metadata.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      SAMALogger.logSecurityEvent(
        'ENCRYPTION_FAILURE',
        'HIGH',
        {
          documentId: metadata.documentId,
          userId: metadata.userId,
          operation: 'store',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      throw error;
    }
  }

  /**
   * Retrieve a document with decryption
   */
  public async retrieveDocument(
    storagePath: string,
    documentId: string,
    userId: string,
    encryptionKeyId?: string
  ): Promise<{
    fileBuffer: Buffer;
    metadata: any;
    retrievalTime: number;
  }> {
    const startTime = Date.now();

    try {
      logger.info('Starting document retrieval', {
        documentId,
        userId,
        storagePath,
        encrypted: !!encryptionKeyId,
      });

      // Download from storage (MinIO in production, local in development)
      let encryptedBuffer: Buffer;
      
      if (config.isDevelopment) {
        // Read from local filesystem in development
        const localStorageDir = path.join(process.cwd(), 'uploads');
        const fullPath = path.join(localStorageDir, storagePath);
        encryptedBuffer = await fs.readFile(fullPath);
      } else {
        // Download from MinIO in production
        encryptedBuffer = await this.minio.downloadFile(
          config.minio.bucketName,
          storagePath
        );
      }

      // Get file metadata (simplified for development)
      let fileInfo: any;
      
      if (config.isDevelopment) {
        // For local storage, use simplified metadata
        fileInfo = {
          size: encryptedBuffer.length,
          lastModified: new Date(),
          etag: require('crypto').createHash('md5').update(encryptedBuffer).digest('hex'),
          contentType: 'application/octet-stream',
          metadata: {},
        };
      } else {
        // Get full metadata from MinIO in production
        fileInfo = await this.minio.getFileInfo(
          config.minio.bucketName,
          storagePath
        );
      }

      let fileBuffer = encryptedBuffer;

      // Decrypt if encrypted
      if (encryptionKeyId) {
        fileBuffer = await this.encryption.decryptBuffer(
          encryptedBuffer,
          encryptionKeyId,
          documentId,
          userId
        );

        logger.debug('File decrypted', {
          documentId,
          encryptedSize: encryptedBuffer.length,
          decryptedSize: fileBuffer.length,
          keyId: encryptionKeyId,
        });
      }

      const retrievalTime = Date.now() - startTime;

      // Log SAMA compliance event
      SAMALogger.logDocumentEvent(
        'DOCUMENT_DOWNLOAD',
        documentId,
        userId,
        {
          storagePath,
          encrypted: !!encryptionKeyId,
          retrievalTime,
          fileSize: fileBuffer.length,
        }
      );

      logger.info('Document retrieved successfully', {
        documentId,
        userId,
        storagePath,
        size: fileBuffer.length,
        retrievalTime,
      });

      return {
        fileBuffer,
        metadata: fileInfo.metadata,
        retrievalTime,
      };
    } catch (error) {
      logger.error('Document retrieval failed:', {
        documentId,
        userId,
        storagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      SAMALogger.logSecurityEvent(
        'UNAUTHORIZED_ACCESS',
        'HIGH',
        {
          documentId,
          userId,
          storagePath,
          operation: 'retrieve',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      throw error;
    }
  }

  /**
   * Delete a document and its backup
   */
  public async deleteDocument(
    storagePath: string,
    documentId: string,
    userId: string,
    backupPath?: string
  ): Promise<{
    success: boolean;
    deletionTime: number;
  }> {
    const startTime = Date.now();

    try {
      logger.info('Starting document deletion', {
        documentId,
        userId,
        storagePath,
        hasBackup: !!backupPath,
      });

      // Delete main file (MinIO in production, local in development)
      if (config.isDevelopment) {
        // Delete from local filesystem in development
        const localStorageDir = path.join(process.cwd(), 'uploads');
        const fullPath = path.join(localStorageDir, storagePath);
        try {
          await fs.unlink(fullPath);
        } catch (error) {
          // File might not exist, which is okay for deletion
          logger.warn('Failed to delete local file (might not exist)', { fullPath });
        }
      } else {
        // Delete from MinIO in production
        await this.minio.deleteFile(config.minio.bucketName, storagePath);
      }

      // Delete backup if exists
      if (backupPath) {
        if (config.isDevelopment) {
          // Delete backup from local filesystem in development
          const localStorageDir = path.join(process.cwd(), 'uploads');
          const fullBackupPath = path.join(localStorageDir, backupPath);
          try {
            await fs.unlink(fullBackupPath);
          } catch (error) {
            // File might not exist, which is okay for deletion
            logger.warn('Failed to delete local backup file (might not exist)', { fullBackupPath });
          }
        } else {
          // Delete backup from MinIO in production
          await this.minio.deleteFile(config.minio.bucketName, backupPath);
        }
      }

      const deletionTime = Date.now() - startTime;

      // Log SAMA compliance event
      SAMALogger.logDocumentEvent(
        'DOCUMENT_DELETE',
        documentId,
        userId,
        {
          storagePath,
          backupPath,
          deletionTime,
        }
      );

      logger.info('Document deleted successfully', {
        documentId,
        userId,
        storagePath,
        deletionTime,
      });

      return {
        success: true,
        deletionTime,
      };
    } catch (error) {
      logger.error('Document deletion failed:', {
        documentId,
        userId,
        storagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Create a backup copy of the document
   */
  private async createBackup(
    originalPath: string,
    fileBuffer: Buffer,
    metadata: StorageMetadata
  ): Promise<string> {
    try {
      const backupPath = this.generateBackupPath(originalPath);

      const backupMetadata = {
        ...metadata,
        backupOf: originalPath,
        backupTimestamp: new Date().toISOString(),
        backupType: 'automatic',
      };

      // Upload backup (MinIO in production, local in development)
      if (config.isDevelopment) {
        // Store backup to local filesystem in development
        await this.storeToLocalFilesystem(
          backupPath,
          fileBuffer,
          backupMetadata
        );
      } else {
        // Store backup to MinIO in production
        await this.minio.uploadFile(
          config.minio.bucketName,
          backupPath,
          fileBuffer,
          backupMetadata
        );
      }

      logger.debug('Backup created', {
        documentId: metadata.documentId,
        originalPath,
        backupPath,
      });

      return backupPath;
    } catch (error) {
      logger.error('Backup creation failed:', {
        documentId: metadata.documentId,
        originalPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate storage path for document
   */
  private generateStoragePath(metadata: StorageMetadata): string {
    return this.minio.generateStoragePath(
      metadata.documentId,
      metadata.userId,
      metadata.categoryId,
      metadata.fileExtension
    );
  }

  /**
   * Generate backup path for document
   */
  private generateBackupPath(originalPath: string): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timestamp = date.getTime();
    
    return `backups/${dateStr}/${timestamp}_${originalPath}`;
  }

  /**
   * Generate thumbnail for image documents
   */
  public async generateThumbnail(
    fileBuffer: Buffer,
    documentId: string,
    size: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<{
    thumbnailBuffer: Buffer;
    thumbnailPath: string;
  }> {
    try {
      const sharp = require('sharp');
      
      const sizeMap = {
        small: { width: 150, height: 150 },
        medium: { width: 300, height: 300 },
        large: { width: 600, height: 600 },
      };

      const dimensions = sizeMap[size];

      // Generate thumbnail
      const thumbnailBuffer = await sharp(fileBuffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Generate thumbnail path
      const thumbnailPath = this.minio.generateThumbnailPath(documentId, size);

      // Upload thumbnail
      await this.minio.uploadFile(
        config.minio.bucketName,
        thumbnailPath,
        thumbnailBuffer,
        {
          documentId,
          thumbnailSize: size,
          contentType: 'image/jpeg',
          originalSize: fileBuffer.length,
          thumbnailSize: thumbnailBuffer.length,
        }
      );

      logger.debug('Thumbnail generated', {
        documentId,
        size,
        originalSize: fileBuffer.length,
        thumbnailSize: thumbnailBuffer.length,
        thumbnailPath,
      });

      return {
        thumbnailBuffer,
        thumbnailPath,
      };
    } catch (error) {
      logger.error('Thumbnail generation failed:', {
        documentId,
        size,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStatistics(): Promise<{
    totalDocuments: number;
    totalSize: number;
    totalBackups: number;
    totalThumbnails: number;
    storageHealth: string;
  }> {
    try {
      const documentsList = await this.minio.listFiles(
        config.minio.bucketName,
        'documents/',
        10000
      );

      const backupsList = await this.minio.listFiles(
        config.minio.bucketName,
        'backups/',
        10000
      );

      const thumbnailsList = await this.minio.listFiles(
        config.minio.bucketName,
        'thumbnails/',
        10000
      );

      const totalSize = documentsList.files.reduce(
        (sum, file) => sum + file.size,
        0
      );

      return {
        totalDocuments: documentsList.files.length,
        totalSize,
        totalBackups: backupsList.files.length,
        totalThumbnails: thumbnailsList.files.length,
        storageHealth: 'healthy',
      };
    } catch (error) {
      logger.error('Failed to get storage statistics:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        totalDocuments: 0,
        totalSize: 0,
        totalBackups: 0,
        totalThumbnails: 0,
        storageHealth: 'unhealthy',
      };
    }
  }

  /**
   * Cleanup old backups and temporary files
   */
  public async cleanupOldFiles(retentionDays: number = 90): Promise<{
    deletedFiles: number;
    freedSpace: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const backupsList = await this.minio.listFiles(
        config.minio.bucketName,
        'backups/',
        10000
      );

      const tempsList = await this.minio.listFiles(
        config.minio.bucketName,
        'temp/',
        10000
      );

      const filesToDelete = [
        ...backupsList.files.filter(file => file.lastModified < cutoffDate),
        ...tempsList.files.filter(file => file.lastModified < cutoffDate),
      ];

      let deletedFiles = 0;
      let freedSpace = 0;

      for (const file of filesToDelete) {
        try {
          await this.minio.deleteFile(config.minio.bucketName, file.name);
          deletedFiles++;
          freedSpace += file.size;
        } catch (error) {
          logger.warn('Failed to delete old file:', {
            filename: file.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Old files cleanup completed', {
        deletedFiles,
        freedSpace,
        retentionDays,
      });

      return {
        deletedFiles,
        freedSpace,
      };
    } catch (error) {
      logger.error('Old files cleanup failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        deletedFiles: 0,
        freedSpace: 0,
      };
    }
  }

  /**
   * Verify file integrity
   */
  public async verifyFileIntegrity(
    storagePath: string,
    expectedHash: string,
    documentId: string
  ): Promise<{
    isValid: boolean;
    actualHash: string;
    verificationTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Download file
      const fileBuffer = await this.minio.downloadFile(
        config.minio.bucketName,
        storagePath
      );

      // Calculate hash
      const actualHash = this.encryption.generateFileHash(fileBuffer);

      // Compare hashes
      const isValid = actualHash === expectedHash;

      const verificationTime = Date.now() - startTime;

      if (!isValid) {
        logger.error('File integrity verification failed', {
          documentId,
          storagePath,
          expectedHash,
          actualHash,
        });

        SAMALogger.logSecurityEvent(
          'ENCRYPTION_FAILURE',
          'CRITICAL',
          {
            documentId,
            storagePath,
            expectedHash,
            actualHash,
            integrityCheck: 'failed',
          }
        );
      }

      return {
        isValid,
        actualHash,
        verificationTime,
      };
    } catch (error) {
      logger.error('File integrity verification error:', {
        documentId,
        storagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Get storage service health status
   */
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      minioConnected: boolean;
      bucketExists: boolean;
      encryptionServiceHealthy: boolean;
      totalDocuments: number;
      totalSize: number;
      availableSpace: number;
    };
  }> {
    try {
      const minioHealth = await this.minio.healthCheck();
      const encryptionHealth = this.encryption.getHealthStatus();
      const stats = await this.getStorageStatistics();

      const isHealthy = minioHealth.status === 'healthy' && 
                       encryptionHealth.status === 'healthy' && 
                       stats.storageHealth === 'healthy';

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          minioConnected: minioHealth.details.connected,
          bucketExists: minioHealth.details.bucketExists,
          encryptionServiceHealthy: encryptionHealth.status === 'healthy',
          totalDocuments: stats.totalDocuments,
          totalSize: stats.totalSize,
          availableSpace: config.server.maxFileSize * 10000, // Estimated
        },
      };
    } catch (error) {
      logger.error('Storage health check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        status: 'unhealthy',
        details: {
          minioConnected: false,
          bucketExists: false,
          encryptionServiceHealthy: false,
          totalDocuments: 0,
          totalSize: 0,
          availableSpace: 0,
        },
      };
    }
  }

  /**
   * Store document to local filesystem (development only)
   */
  private async storeToLocalFilesystem(
    storagePath: string,
    fileBuffer: Buffer,
    metadata: any
  ): Promise<{ etag: string; size: number; uploadTime: number }> {
    const startTime = Date.now();
    
    try {
      // Create local storage directory
      const localStorageDir = path.join(process.cwd(), 'uploads');
      const fullPath = path.join(localStorageDir, storagePath);
      const dirPath = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });
      
      // Write file to local filesystem
      await fs.writeFile(fullPath, fileBuffer);
      
      // Generate fake etag (MD5 hash for consistency)
      const crypto = require('crypto');
      const etag = crypto.createHash('md5').update(fileBuffer).digest('hex');
      
      const uploadTime = Date.now() - startTime;
      
      logger.info('File stored to local filesystem', {
        storagePath,
        fullPath,
        size: fileBuffer.length,
        uploadTime,
        etag,
      });
      
      return {
        etag,
        size: fileBuffer.length,
        uploadTime,
      };
    } catch (error) {
      logger.error('Local filesystem storage failed:', {
        storagePath,
        size: fileBuffer.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}