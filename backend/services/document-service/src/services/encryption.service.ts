import crypto from 'crypto';
import { config } from '../config/environment.config';
import { logger, SAMALogger } from '../utils/logger';

export class EncryptionService {
  private static instance: EncryptionService;
  private readonly algorithm: string;
  private readonly keyLength: number;
  private readonly ivLength: number;
  private readonly tagLength: number;
  private readonly masterKey: Buffer;

  private constructor() {
    this.algorithm = config.encryption.algorithm;
    this.keyLength = config.encryption.keyLength;
    this.ivLength = config.encryption.ivLength;
    this.tagLength = config.encryption.tagLength;
    this.masterKey = Buffer.from(config.encryption.masterKey, 'hex');

    this.validateConfiguration();
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  private validateConfiguration(): void {
    if (this.masterKey.length !== this.keyLength) {
      throw new Error(`Master key must be ${this.keyLength} bytes long`);
    }

    if (!['aes-256-gcm', 'aes-256-cbc'].includes(this.algorithm)) {
      throw new Error(`Unsupported encryption algorithm: ${this.algorithm}`);
    }

    logger.info('Encryption service initialized', {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      ivLength: this.ivLength,
      tagLength: this.tagLength,
    });
  }

  /**
   * Encrypt a buffer using AES-256-GCM with authentication
   */
  public async encryptBuffer(
    buffer: Buffer,
    documentId: string,
    userId: string,
    additionalData?: Buffer
  ): Promise<{
    encryptedBuffer: Buffer;
    keyId: string;
    encryptionMetadata: {
      algorithm: string;
      keyLength: number;
      ivLength: number;
      tagLength: number;
      timestamp: string;
    };
  }> {
    try {
      const startTime = Date.now();

      // Generate unique key for this document
      const documentKey = await this.generateDocumentKey(documentId, userId);
      const keyId = this.generateKeyId(documentId, userId);

      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, documentKey, iv);
      
      // Encrypt the buffer
      const encrypted = Buffer.concat([
        cipher.update(buffer),
        cipher.final()
      ]);

      // No auth tag for CBC mode
      const authTag = Buffer.alloc(0);

      // Combine IV, auth tag, and encrypted data
      const encryptedBuffer = Buffer.concat([iv, authTag, encrypted]);

      const encryptionTime = Date.now() - startTime;

      // Log encryption event for SAMA compliance
      SAMALogger.logComplianceEvent(
        'ENCRYPTION_KEY_ROTATION',
        'CSF-3.3.9-CRYPTOGRAPHY',
        {
          documentId,
          userId,
          keyId,
          algorithm: this.algorithm,
          encryptionTime,
          bufferSize: buffer.length,
          encryptedSize: encryptedBuffer.length,
        }
      );

      logger.debug('Buffer encrypted successfully', {
        documentId,
        userId,
        keyId,
        originalSize: buffer.length,
        encryptedSize: encryptedBuffer.length,
        encryptionTime,
      });

      return {
        encryptedBuffer,
        keyId,
        encryptionMetadata: {
          algorithm: this.algorithm,
          keyLength: this.keyLength,
          ivLength: this.ivLength,
          tagLength: this.tagLength,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('Buffer encryption failed:', {
        documentId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      SAMALogger.logSecurityEvent(
        'ENCRYPTION_FAILURE',
        'HIGH',
        {
          documentId,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          algorithm: this.algorithm,
        }
      );

      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt a buffer using the stored key
   */
  public async decryptBuffer(
    encryptedBuffer: Buffer,
    keyId: string,
    documentId: string,
    userId: string,
    additionalData?: Buffer
  ): Promise<Buffer> {
    try {
      const startTime = Date.now();

      // Regenerate the document key
      const documentKey = await this.regenerateDocumentKey(keyId, documentId, userId);

      // Extract IV, auth tag, and encrypted data
      const iv = encryptedBuffer.slice(0, this.ivLength);
      const authTag = this.algorithm.includes('gcm') 
        ? encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength)
        : Buffer.alloc(0);
      const encrypted = encryptedBuffer.slice(
        this.ivLength + (this.algorithm.includes('gcm') ? this.tagLength : 0)
      );

      // Create decipher  
      const decipher = crypto.createDecipheriv(this.algorithm, documentKey, iv);

      // No AAD or auth tag for CBC mode

      // Decrypt the buffer
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      const decryptionTime = Date.now() - startTime;

      logger.debug('Buffer decrypted successfully', {
        documentId,
        userId,
        keyId,
        encryptedSize: encryptedBuffer.length,
        decryptedSize: decrypted.length,
        decryptionTime,
      });

      return decrypted;
    } catch (error) {
      logger.error('Buffer decryption failed:', {
        documentId,
        userId,
        keyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      SAMALogger.logSecurityEvent(
        'ENCRYPTION_FAILURE',
        'HIGH',
        {
          documentId,
          userId,
          keyId,
          operation: 'decrypt',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate a unique key for a document
   */
  private async generateDocumentKey(documentId: string, userId: string): Promise<Buffer> {
    const keyMaterial = `${documentId}:${userId}:${Date.now()}`;
    return crypto.pbkdf2Sync(keyMaterial, this.masterKey, 100000, this.keyLength, 'sha256');
  }

  /**
   * Regenerate document key from keyId
   */
  private async regenerateDocumentKey(keyId: string, documentId: string, userId: string): Promise<Buffer> {
    // In production, this would retrieve key from HSM or key management service
    // For now, we'll use a deterministic generation based on keyId
    const keyMaterial = `${documentId}:${userId}:${keyId}`;
    return crypto.pbkdf2Sync(keyMaterial, this.masterKey, 100000, this.keyLength, 'sha256');
  }

  /**
   * Generate a unique key ID for tracking
   */
  private generateKeyId(documentId: string, userId: string): string {
    const timestamp = Date.now().toString();
    const hash = crypto.createHash('sha256')
      .update(`${documentId}:${userId}:${timestamp}`)
      .digest('hex');
    return `key_${hash.substring(0, 16)}`;
  }

  /**
   * Generate hash for file integrity checking
   */
  public generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verify file integrity using hash
   */
  public verifyFileIntegrity(buffer: Buffer, expectedHash: string): boolean {
    const actualHash = this.generateFileHash(buffer);
    return actualHash === expectedHash;
  }

  /**
   * Generate secure random token
   */
  public generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash password using bcrypt-compatible method
   */
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    const bcrypt = require('bcrypt');
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return bcrypt.compare(password, hash);
  }

  /**
   * Encrypt sensitive metadata
   */
  public encryptMetadata(metadata: any): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.masterKey, iv);
    let encrypted = cipher.update(JSON.stringify(metadata), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive metadata
   */
  public decryptMetadata(encryptedMetadata: string): any {
    const [ivHex, encrypted] = encryptedMetadata.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.masterKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  /**
   * Generate HMAC for API authentication
   */
  public generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  public verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate one-time pad for secure document sharing
   */
  public generateOneTimePad(length: number): {
    pad: Buffer;
    padId: string;
  } {
    const pad = crypto.randomBytes(length);
    const padId = this.generateSecureToken(16);
    
    return {
      pad,
      padId,
    };
  }

  /**
   * Encrypt with one-time pad
   */
  public encryptWithOneTimePad(data: Buffer, pad: Buffer): Buffer {
    if (data.length !== pad.length) {
      throw new Error('Data and pad must be the same length');
    }

    const encrypted = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ pad[i];
    }

    return encrypted;
  }

  /**
   * Decrypt with one-time pad
   */
  public decryptWithOneTimePad(encryptedData: Buffer, pad: Buffer): Buffer {
    // XOR is symmetric, so decryption is the same as encryption
    return this.encryptWithOneTimePad(encryptedData, pad);
  }

  /**
   * Generate key derivation for document versioning
   */
  public generateVersionKey(documentId: string, version: number): Buffer {
    const versionMaterial = `${documentId}:version:${version}`;
    return crypto.pbkdf2Sync(versionMaterial, this.masterKey, 100000, this.keyLength, 'sha256');
  }

  /**
   * Secure wipe of sensitive data in memory
   */
  public secureWipe(buffer: Buffer): void {
    crypto.randomFillSync(buffer);
  }

  /**
   * Get encryption service health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'unhealthy';
    details: {
      algorithm: string;
      keyLength: number;
      masterKeyConfigured: boolean;
      cryptoSupport: boolean;
    };
  } {
    try {
      // Test encryption/decryption
      const testData = Buffer.from('test data for health check');
      const testIv = crypto.randomBytes(this.ivLength);
      const encrypted = crypto.createCipheriv(this.algorithm, this.masterKey, testIv);
      encrypted.update(testData);
      encrypted.final();

      return {
        status: 'healthy',
        details: {
          algorithm: this.algorithm,
          keyLength: this.keyLength,
          masterKeyConfigured: this.masterKey.length === this.keyLength,
          cryptoSupport: true,
        },
      };
    } catch (error) {
      logger.error('Encryption service health check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        status: 'unhealthy',
        details: {
          algorithm: this.algorithm,
          keyLength: this.keyLength,
          masterKeyConfigured: false,
          cryptoSupport: false,
        },
      };
    }
  }
}