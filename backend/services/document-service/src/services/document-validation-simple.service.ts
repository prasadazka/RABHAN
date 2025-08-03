import { logger } from '../utils/logger';

export interface ValidationResult {
  isValid: boolean;
  score: number;
  confidence: number;
  errors: string[];
  warnings: string[];
  extractedData: any;
  processingTime: number;
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  type: string;
  passed: boolean;
  score: number;
  details: any;
  processingTime: number;
}

export interface DocumentMetadata {
  documentId: string;
  userId: string;
  categoryId: string;
  templateId?: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  requiresOCR: boolean;
  validationRules: any;
}

export class DocumentValidationSimpleService {
  private static instance: DocumentValidationSimpleService;

  private constructor() {}

  public static getInstance(): DocumentValidationSimpleService {
    if (!DocumentValidationSimpleService.instance) {
      DocumentValidationSimpleService.instance = new DocumentValidationSimpleService();
    }
    return DocumentValidationSimpleService.instance;
  }

  /**
   * Validate a document - SIMPLIFIED VERSION FOR TESTING
   */
  public async validateDocument(
    fileBuffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const validationResult: ValidationResult = {
      isValid: false,
      score: 0,
      confidence: 0,
      errors: [],
      warnings: [],
      extractedData: {},
      processingTime: 0,
      checks: [],
    };

    try {
      logger.info('Starting simple document validation', {
        documentId: metadata.documentId,
        userId: metadata.userId,
        filename: metadata.originalFilename,
        fileSize: metadata.fileSize,
        bufferSize: fileBuffer.length
      });

      // 1. Basic file validation
      const basicCheck = this.validateBasicFile(fileBuffer, metadata);
      validationResult.checks.push(basicCheck);

      // Calculate simple validation result
      const passedChecks = validationResult.checks.filter(check => check.passed).length;
      const totalChecks = validationResult.checks.length;
      
      validationResult.score = Math.round((passedChecks / totalChecks) * 100);
      validationResult.confidence = Math.round((passedChecks / totalChecks) * 100);
      validationResult.isValid = passedChecks === totalChecks; // All checks must pass

      // Collect errors
      for (const check of validationResult.checks) {
        if (!check.passed) {
          validationResult.errors.push(`${check.type}: ${check.details.error || 'Validation failed'}`);
        }
      }

      validationResult.processingTime = Date.now() - startTime;

      logger.info('Simple document validation completed', {
        documentId: metadata.documentId,
        userId: metadata.userId,
        isValid: validationResult.isValid,
        score: validationResult.score,
        confidence: validationResult.confidence,
        processingTime: validationResult.processingTime,
        errors: validationResult.errors.length
      });

      return validationResult;
    } catch (error) {
      logger.error('Document validation failed:', {
        documentId: metadata.documentId,
        userId: metadata.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      validationResult.errors.push('Validation process failed');
      validationResult.processingTime = Date.now() - startTime;
      validationResult.isValid = false;
      validationResult.score = 0;

      return validationResult;
    }
  }

  /**
   * Basic file validation - just check if file exists and has reasonable size
   */
  private validateBasicFile(
    fileBuffer: Buffer,
    metadata: DocumentMetadata
  ): ValidationCheck {
    const startTime = Date.now();
    
    try {
      const actualSize = fileBuffer.length;
      const maxSize = 50 * 1024 * 1024; // 50MB max
      const minSize = 10; // 10 bytes minimum (very small files allowed)
      
      // Very basic checks
      const hasContent = actualSize > minSize;
      const notTooLarge = actualSize <= maxSize;
      const hasValidExtension = ['pdf', 'jpg', 'jpeg', 'png'].includes(
        metadata.originalFilename.split('.').pop()?.toLowerCase() || ''
      );
      
      const allChecksPassed = hasContent && notTooLarge && hasValidExtension;

      return {
        type: 'basic_file',
        passed: allChecksPassed,
        score: allChecksPassed ? 100 : 0,
        details: {
          actualSize,
          maxSize,
          minSize,
          hasContent,
          notTooLarge,
          hasValidExtension,
          filename: metadata.originalFilename,
          declaredSize: metadata.fileSize
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: 'basic_file',
        passed: false,
        score: 0,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get validation service health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'unhealthy';
    details: {
      simplified: boolean;
      maxFileSize: number;
      supportedFormats: string[];
    };
  } {
    return {
      status: 'healthy',
      details: {
        simplified: true,
        maxFileSize: 50 * 1024 * 1024,
        supportedFormats: ['pdf', 'jpg', 'jpeg', 'png']
      }
    };
  }
}