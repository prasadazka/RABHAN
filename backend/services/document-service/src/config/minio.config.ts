import { Client as MinioClient, BucketItem } from 'minio';
import { config } from './environment.config';
import { logger } from '../utils/logger';

export class MinioConfig {
  private static instance: MinioConfig;
  private client: MinioClient;
  private isConnected: boolean = false;

  private constructor() {
    this.client = new MinioClient({
      endPoint: config.minio.endpoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
      region: config.minio.region,
    });

    this.setupEventHandlers();
  }

  public static getInstance(): MinioConfig {
    if (!MinioConfig.instance) {
      MinioConfig.instance = new MinioConfig();
    }
    return MinioConfig.instance;
  }

  private setupEventHandlers(): void {
    // MinIO client doesn't have built-in event handlers like Redis
    // We'll handle connection status through health checks
  }

  public getClient(): MinioClient {
    return this.client;
  }

  public async connect(): Promise<void> {
    try {
      // Test connection by listing buckets
      await this.client.listBuckets();
      
      // Ensure our main bucket exists
      await this.ensureBucketExists(config.minio.bucketName);
      
      this.isConnected = true;
      logger.info('MinIO connected successfully', {
        endpoint: config.minio.endpoint,
        bucket: config.minio.bucketName,
        region: config.minio.region,
      });
    } catch (error) {
      logger.error('MinIO connection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: config.minio.endpoint,
      });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    // MinIO client doesn't have a disconnect method
    // We'll just mark as disconnected
    this.isConnected = false;
    logger.info('MinIO disconnected');
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      connected: boolean;
      responseTime: number;
      bucketExists: boolean;
      bucketPolicy?: any;
    };
  }> {
    const startTime = Date.now();
    
    try {
      // Test connection by listing buckets
      const buckets = await this.client.listBuckets();
      const bucketExists = buckets.some(bucket => bucket.name === config.minio.bucketName);
      
      let bucketPolicy = null;
      if (bucketExists) {
        try {
          bucketPolicy = await this.client.getBucketPolicy(config.minio.bucketName);
        } catch (error) {
          // Bucket policy might not exist, which is fine
        }
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          responseTime,
          bucketExists,
          bucketPolicy,
        },
      };
    } catch (error) {
      logger.error('MinIO health check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          responseTime: Date.now() - startTime,
          bucketExists: false,
        },
      };
    }
  }

  public async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      const bucketExists = await this.client.bucketExists(bucketName);
      
      if (!bucketExists) {
        await this.client.makeBucket(bucketName, config.minio.region);
        logger.info(`MinIO bucket created: ${bucketName}`);
        
        // Set bucket policy for secure access
        await this.setBucketPolicy(bucketName);
      }
    } catch (error) {
      logger.error(`Failed to ensure bucket exists: ${bucketName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async setBucketPolicy(bucketName: string): Promise<void> {
    try {
      // Private bucket policy - only authenticated users can access
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Deny',
            Principal: '*',
            Action: 's3:*',
            Resource: [
              `arn:aws:s3:::${bucketName}`,
              `arn:aws:s3:::${bucketName}/*`,
            ],
          },
        ],
      };
      
      await this.client.setBucketPolicy(bucketName, JSON.stringify(policy));
      logger.info(`MinIO bucket policy set: ${bucketName}`);
    } catch (error) {
      logger.error(`Failed to set bucket policy: ${bucketName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async uploadFile(
    bucketName: string,
    objectName: string,
    fileBuffer: Buffer,
    metadata: any = {}
  ): Promise<{
    etag: string;
    size: number;
    uploadTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      await this.client.putObject(
        bucketName,
        objectName,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': metadata.contentType || 'application/octet-stream',
          'X-Document-ID': metadata.documentId,
          'X-User-ID': metadata.userId,
          'X-Upload-Date': new Date().toISOString(),
          'X-Encryption-Status': 'encrypted',
          ...metadata,
        }
      );
      
      const uploadTime = Date.now() - startTime;
      
      // Get object info to retrieve etag
      const objectInfo = await this.client.statObject(bucketName, objectName);
      const etag = objectInfo.etag;
      
      logger.info('File uploaded to MinIO', {
        bucketName,
        objectName,
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
      logger.error('MinIO file upload failed:', {
        bucketName,
        objectName,
        size: fileBuffer.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async downloadFile(
    bucketName: string,
    objectName: string
  ): Promise<Buffer> {
    try {
      const chunks: Buffer[] = [];
      const stream = await this.client.getObject(bucketName, objectName);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        stream.on('end', () => {
          const fileBuffer = Buffer.concat(chunks);
          logger.debug('File downloaded from MinIO', {
            bucketName,
            objectName,
            size: fileBuffer.length,
          });
          resolve(fileBuffer);
        });
        
        stream.on('error', (error: Error) => {
          logger.error('MinIO file download failed:', {
            bucketName,
            objectName,
            error: error.message,
          });
          reject(error);
        });
      });
    } catch (error) {
      logger.error('MinIO file download failed:', {
        bucketName,
        objectName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async deleteFile(
    bucketName: string,
    objectName: string
  ): Promise<void> {
    try {
      await this.client.removeObject(bucketName, objectName);
      logger.info('File deleted from MinIO', {
        bucketName,
        objectName,
      });
    } catch (error) {
      logger.error('MinIO file deletion failed:', {
        bucketName,
        objectName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async fileExists(
    bucketName: string,
    objectName: string
  ): Promise<boolean> {
    try {
      await this.client.statObject(bucketName, objectName);
      return true;
    } catch (error) {
      return false;
    }
  }

  public async getFileInfo(
    bucketName: string,
    objectName: string
  ): Promise<{
    size: number;
    lastModified: Date;
    etag: string;
    contentType: string;
    metadata: any;
  }> {
    try {
      const stats = await this.client.statObject(bucketName, objectName);
      
      return {
        size: stats.size,
        lastModified: stats.lastModified,
        etag: stats.etag,
        contentType: stats.metaData?.['content-type'] || 'application/octet-stream',
        metadata: stats.metaData || {},
      };
    } catch (error) {
      logger.error('MinIO file info retrieval failed:', {
        bucketName,
        objectName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async listFiles(
    bucketName: string,
    prefix: string = '',
    maxKeys: number = 1000
  ): Promise<{
    files: Array<{
      name: string;
      size: number;
      lastModified: Date;
      etag: string;
    }>;
    isTruncated: boolean;
  }> {
    try {
      const files: Array<{
        name: string;
        size: number;
        lastModified: Date;
        etag: string;
      }> = [];
      
      const stream = this.client.listObjects(bucketName, prefix, true);
      
      return new Promise((resolve, reject) => {
        let count = 0;
        
        stream.on('data', (obj: BucketItem) => {
          if (count >= maxKeys) {
            stream.destroy();
            resolve({
              files,
              isTruncated: true,
            });
            return;
          }
          
          files.push({
            name: obj.name!,
            size: obj.size!,
            lastModified: obj.lastModified!,
            etag: obj.etag!,
          });
          
          count++;
        });
        
        stream.on('end', () => {
          resolve({
            files,
            isTruncated: false,
          });
        });
        
        stream.on('error', (error: Error) => {
          logger.error('MinIO list files failed:', {
            bucketName,
            prefix,
            error: error.message,
          });
          reject(error);
        });
      });
    } catch (error) {
      logger.error('MinIO list files failed:', {
        bucketName,
        prefix,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async createBackup(
    bucketName: string,
    objectName: string,
    backupBucket: string
  ): Promise<void> {
    try {
      const backupObjectName = `backups/${new Date().toISOString().split('T')[0]}/${objectName}`;
      
      await this.client.copyObject(
        backupBucket,
        backupObjectName,
        `${bucketName}/${objectName}`,
        null // conditions
      );
      
      logger.info('Backup created in MinIO', {
        sourceObject: `${bucketName}/${objectName}`,
        backupObject: `${backupBucket}/${backupObjectName}`,
      });
    } catch (error) {
      logger.error('MinIO backup creation failed:', {
        bucketName,
        objectName,
        backupBucket,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public generateStoragePath(
    documentId: string,
    userId: string,
    category: string,
    fileExtension: string
  ): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `documents/${year}/${month}/${day}/${category}/${userId}/${documentId}.${fileExtension}.encrypted`;
  }

  public generateThumbnailPath(
    documentId: string,
    size: 'small' | 'medium' | 'large' = 'medium'
  ): string {
    return `thumbnails/${documentId}/${size}.jpg`;
  }

  public generateTempPath(
    sessionId: string,
    filename: string
  ): string {
    return `temp/uploads/${sessionId}/${filename}`;
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
}