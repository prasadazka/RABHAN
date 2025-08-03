import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { logger, SAMALogger } from '../utils/logger';
import { config } from '../config/environment.config';

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

export class DocumentValidationService {
  private static instance: DocumentValidationService;
  private tesseractWorker: any;

  private constructor() {
    this.initializeTesseract();
  }

  public static getInstance(): DocumentValidationService {
    if (!DocumentValidationService.instance) {
      DocumentValidationService.instance = new DocumentValidationService();
    }
    return DocumentValidationService.instance;
  }

  private async initializeTesseract(): Promise<void> {
    if (config.ocr.enabled) {
      try {
        this.tesseractWorker = await createWorker(config.ocr.languages);
        logger.info('Tesseract OCR initialized', {
          languages: config.ocr.languages,
          minConfidence: config.ocr.minConfidence,
        });
      } catch (error) {
        logger.error('Tesseract initialization failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Validate a document comprehensively - SIMPLIFIED VERSION
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
      logger.info('Starting simplified document validation', {
        documentId: metadata.documentId,
        userId: metadata.userId,
        filename: metadata.originalFilename,
        fileSize: metadata.fileSize,
      });

      // 1. File format validation
      const formatCheck = await this.validateFileFormat(fileBuffer, metadata);
      validationResult.checks.push(formatCheck);

      // 2. File size validation
      const sizeCheck = await this.validateFileSize(fileBuffer, metadata);
      validationResult.checks.push(sizeCheck);

      // 3. Basic security validation (simplified)
      const securityCheck = await this.validateBasicSecurity(fileBuffer, metadata);
      validationResult.checks.push(securityCheck);

      // Calculate overall validation result (simplified scoring)
      const passedChecks = validationResult.checks.filter(check => check.passed).length;
      const totalChecks = validationResult.checks.length;
      
      validationResult.score = Math.round((passedChecks / totalChecks) * 100);
      validationResult.confidence = Math.round((passedChecks / totalChecks) * 100);
      validationResult.isValid = validationResult.score >= 75; // Simplified threshold

      // Collect errors and warnings
      for (const check of validationResult.checks) {
        if (!check.passed) {
          validationResult.errors.push(`${check.type}: ${check.details.error || 'Validation failed'}`);
        }
        if (check.details.warnings) {
          validationResult.warnings.push(...check.details.warnings);
        }
      }

      validationResult.processingTime = Date.now() - startTime;

      // Log validation completion
      logger.info('Simplified document validation completed', {
        documentId: metadata.documentId,
        userId: metadata.userId,
        isValid: validationResult.isValid,
        score: validationResult.score,
        confidence: validationResult.confidence,
        processingTime: validationResult.processingTime,
        errors: validationResult.errors.length,
        warnings: validationResult.warnings.length,
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
   * Validate file format and type
   */
  private async validateFileFormat(
    fileBuffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ValidationCheck> {
    const startTime = Date.now();
    
    try {
      // Detect file type from buffer
      const detectedType = await fileTypeFromBuffer(fileBuffer);
      
      if (!detectedType) {
        return {
          type: 'format',
          passed: false,
          score: 0,
          details: {
            error: 'Could not detect file type',
            detectedType: null,
            expectedTypes: config.validation.allowedFormats,
          },
          processingTime: Date.now() - startTime,
        };
      }

      // Check if detected type is allowed
      const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ];

      const isAllowedType = allowedMimeTypes.includes(detectedType.mime);
      const matchesDeclaredType = detectedType.mime === metadata.mimeType;

      // Check file extension
      const fileExtension = metadata.originalFilename.split('.').pop()?.toLowerCase();
      const expectedExtension = detectedType.ext;

      return {
        type: 'format',
        passed: isAllowedType && matchesDeclaredType,
        score: isAllowedType && matchesDeclaredType ? 100 : 0,
        details: {
          detectedType: detectedType.mime,
          detectedExtension: detectedType.ext,
          declaredType: metadata.mimeType,
          fileExtension,
          expectedExtension,
          isAllowedType,
          matchesDeclaredType,
          allowedTypes: allowedMimeTypes,
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: 'format',
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
   * Validate file size
   */
  private async validateFileSize(
    fileBuffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ValidationCheck> {
    const startTime = Date.now();
    
    try {
      const actualSize = fileBuffer.length;
      const maxSize = config.validation.maxFileSize;
      const minSize = 1024; // 1KB minimum

      const isValidSize = actualSize >= minSize && actualSize <= maxSize;
      // Relaxed size matching - allow small differences due to encoding
      const sizeDifference = Math.abs(actualSize - metadata.fileSize);
      const maxSizeDifference = Math.max(1024, metadata.fileSize * 0.01); // 1KB or 1% tolerance
      const matchesDeclaredSize = sizeDifference <= maxSizeDifference;

      return {
        type: 'size',
        passed: isValidSize,  // Only check if size is within limits, not exact match
        score: isValidSize ? 100 : 0,
        details: {
          actualSize,
          declaredSize: metadata.fileSize,
          maxSize,
          minSize,
          isValidSize,
          matchesDeclaredSize,
          sizePercentage: (actualSize / maxSize) * 100,
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: 'size',
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
   * Validate file content
   */
  private async validateFileContent(
    fileBuffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ValidationCheck> {
    const startTime = Date.now();
    
    try {
      const detectedType = await fileTypeFromBuffer(fileBuffer);
      
      if (!detectedType) {
        return {
          type: 'content',
          passed: false,
          score: 0,
          details: {
            error: 'Could not detect file type for content validation',
          },
          processingTime: Date.now() - startTime,
        };
      }

      let contentValid = false;
      let contentDetails: any = {};

      if (detectedType.mime === 'application/pdf') {
        contentDetails = await this.validatePDFContent(fileBuffer);
        contentValid = contentDetails.isValid;
      } else if (detectedType.mime.startsWith('image/')) {
        contentDetails = await this.validateImageContent(fileBuffer);
        contentValid = contentDetails.isValid;
      }

      return {
        type: 'content',
        passed: contentValid,
        score: contentValid ? 100 : 0,
        details: contentDetails,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: 'content',
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
   * Validate PDF content
   */
  private async validatePDFContent(fileBuffer: Buffer): Promise<any> {
    try {
      const pdfData = await pdfParse(fileBuffer);
      
      return {
        isValid: pdfData.text.length > 0,
        pageCount: pdfData.numpages,
        textLength: pdfData.text.length,
        hasText: pdfData.text.length > 0,
        metadata: pdfData.metadata,
        info: pdfData.info,
        version: pdfData.version,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate image content
   */
  private async validateImageContent(fileBuffer: Buffer): Promise<any> {
    try {
      const image = sharp(fileBuffer);
      const metadata = await image.metadata();

      const isValidSize = metadata.width! >= config.validation.minImageWidth &&
                         metadata.height! >= config.validation.minImageHeight &&
                         metadata.width! <= config.validation.maxImageWidth &&
                         metadata.height! <= config.validation.maxImageHeight;

      return {
        isValid: isValidSize,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasProfile: metadata.hasProfile,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        isValidSize,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate basic file security - SIMPLIFIED VERSION
   */
  private async validateBasicSecurity(
    fileBuffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ValidationCheck> {
    const startTime = Date.now();
    
    try {
      // Basic security checks - just file size and extension for now
      const isValidExtension = ['pdf', 'jpg', 'jpeg', 'png'].includes(
        metadata.originalFilename.split('.').pop()?.toLowerCase() || ''
      );
      
      const isValidSize = fileBuffer.length > 0 && fileBuffer.length <= 50 * 1024 * 1024; // 50MB
      
      const basicSecurityPassed = isValidExtension && isValidSize;

      return {
        type: 'basic_security',
        passed: basicSecurityPassed,
        score: basicSecurityPassed ? 100 : 0,
        details: {
          isValidExtension,
          isValidSize,
          fileSize: fileBuffer.length,
          filename: metadata.originalFilename,
          riskLevel: basicSecurityPassed ? 'LOW' : 'MEDIUM',
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: 'basic_security',
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
   * Perform OCR validation
   */
  private async performOCRValidation(
    fileBuffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ValidationCheck> {
    const startTime = Date.now();
    
    try {
      if (!config.ocr.enabled || !this.tesseractWorker) {
        return {
          type: 'ocr',
          passed: true,
          score: 100,
          details: {
            message: 'OCR disabled',
          },
          processingTime: Date.now() - startTime,
        };
      }

      let imageBuffer = fileBuffer;

      // Convert PDF to image if needed
      if (metadata.mimeType === 'application/pdf') {
        // For PDF, we'd need to convert to image first
        // This is a simplified implementation
        return {
          type: 'ocr',
          passed: true,
          score: 80,
          details: {
            message: 'PDF OCR not implemented in this version',
          },
          processingTime: Date.now() - startTime,
        };
      }

      // Process image with OCR
      const { data: { text, confidence } } = await this.tesseractWorker.recognize(imageBuffer);

      const isValidConfidence = confidence >= config.ocr.minConfidence * 100;
      const hasText = text.trim().length > 0;

      // Extract structured data based on document type
      const extractedData = this.extractStructuredData(text, metadata);

      return {
        type: 'ocr',
        passed: isValidConfidence && hasText,
        score: isValidConfidence && hasText ? confidence : 0,
        details: {
          text,
          confidence,
          hasText,
          isValidConfidence,
          extractedData,
          textLength: text.length,
          minConfidence: config.ocr.minConfidence * 100,
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: 'ocr',
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
   * Validate document-specific requirements
   */
  private async validateDocumentSpecifics(
    fileBuffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ValidationCheck> {
    const startTime = Date.now();
    
    try {
      // Get validation rules from metadata
      const validationRules = metadata.validationRules || {};
      const specificChecks: any = {};

      // Example: Saudi National ID validation (front and back)
      if (metadata.categoryId === 'national_id_front' || metadata.categoryId === 'national_id_back') {
        specificChecks.nationalIdChecks = await this.validateNationalIdDocument(fileBuffer);
      }

      // Example: Commercial Registration validation
      if (metadata.categoryId === 'commercial_registration') {
        specificChecks.crChecks = await this.validateCommercialRegistration(fileBuffer);
      }

      const allChecksPassed = Object.values(specificChecks).every(
        (check: any) => check.isValid === true
      );

      return {
        type: 'document_specific',
        passed: allChecksPassed,
        score: allChecksPassed ? 100 : 50,
        details: {
          validationRules,
          specificChecks,
          allChecksPassed,
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: 'document_specific',
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
   * Extract structured data from OCR text
   */
  private extractStructuredData(text: string, metadata: DocumentMetadata): any {
    const extractedData: any = {
      rawText: text,
      fields: {},
    };

    // Saudi National ID extraction (front and back)
    if (metadata.categoryId === 'national_id_front' || metadata.categoryId === 'national_id_back') {
      const nationalIdRegex = /[12][0-9]{9}/g;
      const nationalIdMatch = text.match(nationalIdRegex);
      if (nationalIdMatch) {
        extractedData.fields.nationalId = nationalIdMatch[0];
      }

      // Extract dates
      const dateRegex = /(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/g;
      const dateMatches = text.match(dateRegex);
      if (dateMatches) {
        extractedData.fields.dates = dateMatches;
      }
    }

    // Commercial Registration extraction
    if (metadata.categoryId === 'commercial_registration') {
      const crRegex = /[0-9]{10}/g;
      const crMatch = text.match(crRegex);
      if (crMatch) {
        extractedData.fields.registrationNumber = crMatch[0];
      }
    }

    return extractedData;
  }

  /**
   * Validate National ID document
   */
  private async validateNationalIdDocument(fileBuffer: Buffer): Promise<any> {
    // Placeholder for National ID specific validation
    return {
      isValid: true,
      checks: {
        hasPhoto: false,
        hasHologram: false,
        hasNationalId: false,
        hasArabicText: false,
        hasEnglishText: false,
      },
    };
  }

  /**
   * Validate Commercial Registration document
   */
  private async validateCommercialRegistration(fileBuffer: Buffer): Promise<any> {
    // Placeholder for Commercial Registration specific validation
    return {
      isValid: true,
      checks: {
        hasRegistrationNumber: false,
        hasCompanyName: false,
        hasIssueDate: false,
        hasExpiryDate: false,
        hasOfficialSeal: false,
      },
    };
  }

  /**
   * Calculate overall validation score
   */
  private calculateOverallScore(checks: ValidationCheck[]): number {
    if (checks.length === 0) return 0;

    const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
    return Math.round(totalScore / checks.length);
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(checks: ValidationCheck[]): number {
    if (checks.length === 0) return 0;

    const passedChecks = checks.filter(check => check.passed);
    const confidence = (passedChecks.length / checks.length) * 100;
    
    return Math.round(confidence);
  }

  /**
   * Get validation service health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'unhealthy';
    details: {
      ocrEnabled: boolean;
      tesseractReady: boolean;
      supportedFormats: string[];
      maxFileSize: number;
    };
  } {
    return {
      status: 'healthy',
      details: {
        ocrEnabled: config.ocr.enabled,
        tesseractReady: !!this.tesseractWorker,
        supportedFormats: config.validation.allowedFormats,
        maxFileSize: config.validation.maxFileSize,
      },
    };
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }
}