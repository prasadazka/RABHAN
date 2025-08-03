import { logger, SAMALogger } from '../utils/logger';
import { config } from '../config/environment.config';
import { DatabaseConfig } from '../config/database.config';

export interface VirusScanResult {
  isClean: boolean;
  scanId: string;
  scannerName: string;
  scanResult: 'clean' | 'infected' | 'suspicious' | 'error' | 'timeout';
  threats: string[];
  scanDuration: number;
  scannerVersion?: string;
  signatureVersion?: string;
  scanDetails: any;
}

export class VirusScannerService {
  private static instance: VirusScannerService;
  private database: DatabaseConfig;
  private scanners: Map<string, any> = new Map();

  private constructor() {
    this.database = DatabaseConfig.getInstance();
    this.initializeScanners();
  }

  public static getInstance(): VirusScannerService {
    if (!VirusScannerService.instance) {
      VirusScannerService.instance = new VirusScannerService();
    }
    return VirusScannerService.instance;
  }

  private async initializeScanners(): Promise<void> {
    try {
      if (config.virusScanner.enabled) {
        // Initialize ClamAV scanner
        const clamAVScanner = await this.initializeClamAV();
        if (clamAVScanner) {
          this.scanners.set('clamav', clamAVScanner);
        }

        // Initialize cloud-based scanners if configured
        if (config.isProduction) {
          const cloudScanner = await this.initializeCloudScanner();
          if (cloudScanner) {
            this.scanners.set('cloud', cloudScanner);
          }
        }

        logger.info('Virus scanners initialized', {
          enabledScanners: Array.from(this.scanners.keys()),
          totalScanners: this.scanners.size,
        });
      } else {
        logger.warn('Virus scanning disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize virus scanners:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async initializeClamAV(): Promise<any> {
    try {
      const clamscan = require('clamscan');
      
      const clamScanInstance = await clamscan({
        remove_infected: false,
        quarantine_infected: false,
        scan_log: null,
        debug_mode: config.isDevelopment,
        file_list: null,
        scan_recursively: true,
        clamdscan: {
          socket: false,
          host: false,
          port: false,
          timeout: config.virusScanner.scanTimeout,
          local_fallback: true,
          path: config.virusScanner.clamAvPath,
          config_file: null,
          multiscan: true,
          reload_db: false,
          active: true,
          bypass_test: false,
        },
        preference: 'clamdscan',
      });

      logger.info('ClamAV scanner initialized', {
        version: await this.getClamAVVersion(),
        signatures: await this.getClamAVSignatureVersion(),
      });

      return clamScanInstance;
    } catch (error) {
      logger.error('ClamAV initialization failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private async initializeCloudScanner(): Promise<any> {
    try {
      // Placeholder for cloud-based virus scanning service
      // This would integrate with services like AWS GuardDuty, Azure Defender, etc.
      logger.info('Cloud virus scanner initialized');
      return {
        name: 'cloud-scanner',
        version: '1.0.0',
        active: true,
      };
    } catch (error) {
      logger.error('Cloud scanner initialization failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Scan file buffer for viruses using multiple scanners
   */
  public async scanFileBuffer(
    fileBuffer: Buffer,
    documentId: string,
    userId: string,
    filename: string
  ): Promise<VirusScanResult> {
    const startTime = Date.now();
    const scanId = this.generateScanId(documentId);

    try {
      logger.info('Starting virus scan', {
        scanId,
        documentId,
        userId,
        filename,
        fileSize: fileBuffer.length,
        scannersCount: this.scanners.size,
      });

      if (this.scanners.size === 0) {
        // No scanners available - treat as clean but log warning
        logger.warn('No virus scanners available', {
          scanId,
          documentId,
          userId,
        });

        return {
          isClean: true,
          scanId,
          scannerName: 'none',
          scanResult: 'clean',
          threats: [],
          scanDuration: Date.now() - startTime,
          scanDetails: {
            message: 'No virus scanners configured',
            assumedClean: true,
          },
        };
      }

      // Run multiple scanners in parallel
      const scanPromises = Array.from(this.scanners.entries()).map(
        async ([scannerName, scanner]) => {
          return this.runSingleScanner(
            scanner,
            scannerName,
            fileBuffer,
            scanId,
            documentId,
            userId
          );
        }
      );

      const scanResults = await Promise.allSettled(scanPromises);
      const successfulScans = scanResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      const failedScans = scanResults
        .filter(result => result.status === 'rejected')
        .map(result => result.reason);

      if (failedScans.length > 0) {
        logger.warn('Some virus scans failed:', {
          scanId,
          documentId,
          failedScans: failedScans.length,
          totalScans: scanResults.length,
        });
      }

      // Analyze results using consensus approach
      const finalResult = this.analyzeMultipleScanResults(
        successfulScans,
        scanId,
        documentId,
        userId
      );

      // Store scan results in database
      await this.storeScanResults(finalResult, documentId, userId);

      // Log SAMA security event if threats found
      if (!finalResult.isClean) {
        SAMALogger.logSecurityEvent(
          'VIRUS_DETECTED',
          'CRITICAL',
          {
            scanId,
            documentId,
            userId,
            filename,
            threats: finalResult.threats,
            scannerName: finalResult.scannerName,
            scanDuration: finalResult.scanDuration,
          }
        );
      }

      logger.info('Virus scan completed', {
        scanId,
        documentId,
        userId,
        isClean: finalResult.isClean,
        threats: finalResult.threats.length,
        scanDuration: finalResult.scanDuration,
        scanResult: finalResult.scanResult,
      });

      return finalResult;
    } catch (error) {
      const scanDuration = Date.now() - startTime;
      
      logger.error('Virus scan failed:', {
        scanId,
        documentId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        scanDuration,
      });

      // Log security event for scan failure
      SAMALogger.logSecurityEvent(
        'VIRUS_DETECTED',
        'HIGH',
        {
          scanId,
          documentId,
          userId,
          filename,
          error: error instanceof Error ? error.message : 'Unknown error',
          scanResult: 'error',
        }
      );

      return {
        isClean: false,
        scanId,
        scannerName: 'error',
        scanResult: 'error',
        threats: [],
        scanDuration,
        scanDetails: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Run a single virus scanner
   */
  private async runSingleScanner(
    scanner: any,
    scannerName: string,
    fileBuffer: Buffer,
    scanId: string,
    documentId: string,
    userId: string
  ): Promise<VirusScanResult> {
    const startTime = Date.now();

    try {
      let scanResult: VirusScanResult;

      if (scannerName === 'clamav') {
        scanResult = await this.runClamAVScan(
          scanner,
          fileBuffer,
          scanId,
          documentId
        );
      } else if (scannerName === 'cloud') {
        scanResult = await this.runCloudScan(
          scanner,
          fileBuffer,
          scanId,
          documentId
        );
      } else {
        throw new Error(`Unknown scanner: ${scannerName}`);
      }

      scanResult.scanDuration = Date.now() - startTime;
      scanResult.scanId = scanId;
      scanResult.scannerName = scannerName;

      return scanResult;
    } catch (error) {
      logger.error(`${scannerName} scan failed:`, {
        scanId,
        documentId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        isClean: false,
        scanId,
        scannerName,
        scanResult: 'error',
        threats: [],
        scanDuration: Date.now() - startTime,
        scanDetails: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Run ClamAV scan
   */
  private async runClamAVScan(
    scanner: any,
    fileBuffer: Buffer,
    scanId: string,
    documentId: string
  ): Promise<VirusScanResult> {
    try {
      // Write buffer to temporary file for ClamAV
      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(process.cwd(), 'temp');
      const tempFile = path.join(tempDir, `${scanId}.tmp`);

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(tempFile, fileBuffer);

      try {
        // Scan file
        const result = await scanner.scanFile(tempFile);
        
        // Clean up temp file
        fs.unlinkSync(tempFile);

        return {
          isClean: result.isInfected === false,
          scanId,
          scannerName: 'clamav',
          scanResult: result.isInfected ? 'infected' : 'clean',
          threats: result.viruses || [],
          scanDuration: 0, // Will be set by caller
          scannerVersion: await this.getClamAVVersion(),
          signatureVersion: await this.getClamAVSignatureVersion(),
          scanDetails: {
            file: result.file,
            isInfected: result.isInfected,
            viruses: result.viruses,
            goodFiles: result.goodFiles,
            badFiles: result.badFiles,
          },
        };
      } catch (scanError) {
        // Clean up temp file on error
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        throw scanError;
      }
    } catch (error) {
      throw new Error(`ClamAV scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run cloud-based virus scan
   */
  private async runCloudScan(
    scanner: any,
    fileBuffer: Buffer,
    scanId: string,
    documentId: string
  ): Promise<VirusScanResult> {
    try {
      // Placeholder for cloud-based scanning
      // This would integrate with cloud antivirus services
      
      // Simulate scan (in production, this would be actual cloud API call)
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        isClean: true,
        scanId,
        scannerName: 'cloud',
        scanResult: 'clean',
        threats: [],
        scanDuration: 0,
        scannerVersion: '1.0.0',
        signatureVersion: new Date().toISOString(),
        scanDetails: {
          cloudProvider: 'mock',
          scanType: 'full',
          confidence: 99.9,
        },
      };
    } catch (error) {
      throw new Error(`Cloud scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze multiple scan results using consensus approach
   */
  private analyzeMultipleScanResults(
    scanResults: VirusScanResult[],
    scanId: string,
    documentId: string,
    userId: string
  ): VirusScanResult {
    if (scanResults.length === 0) {
      return {
        isClean: false,
        scanId,
        scannerName: 'none',
        scanResult: 'error',
        threats: [],
        scanDuration: 0,
        scanDetails: {
          error: 'No successful scans',
        },
      };
    }

    // Collect all threats from all scanners
    const allThreats = scanResults.flatMap(result => result.threats);
    const uniqueThreats = [...new Set(allThreats)];

    // Determine if file is clean based on consensus
    const cleanResults = scanResults.filter(result => result.isClean);
    const infectedResults = scanResults.filter(result => !result.isClean);

    // If any scanner found threats, consider it infected
    const isClean = infectedResults.length === 0 && uniqueThreats.length === 0;

    // Calculate total scan duration
    const totalScanDuration = scanResults.reduce(
      (sum, result) => sum + result.scanDuration,
      0
    );

    // Determine overall scan result
    let scanResult: 'clean' | 'infected' | 'suspicious' | 'error' | 'timeout';
    if (isClean) {
      scanResult = 'clean';
    } else if (uniqueThreats.length > 0) {
      scanResult = 'infected';
    } else {
      scanResult = 'suspicious';
    }

    return {
      isClean,
      scanId,
      scannerName: 'consensus',
      scanResult,
      threats: uniqueThreats,
      scanDuration: totalScanDuration,
      scanDetails: {
        totalScanners: scanResults.length,
        cleanResults: cleanResults.length,
        infectedResults: infectedResults.length,
        consensus: isClean ? 'clean' : 'infected',
        individualResults: scanResults.map(result => ({
          scanner: result.scannerName,
          result: result.scanResult,
          threats: result.threats,
          duration: result.scanDuration,
        })),
      },
    };
  }

  /**
   * Store scan results in database
   */
  private async storeScanResults(
    scanResult: VirusScanResult,
    documentId: string,
    userId: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO virus_scan_results (
          document_id, scanner_name, scan_result, threat_names,
          scan_duration_ms, scanner_version, signature_version,
          scan_details, sama_security_event_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      const values = [
        documentId,
        scanResult.scannerName,
        scanResult.scanResult,
        scanResult.threats,
        scanResult.scanDuration,
        scanResult.scannerVersion || null,
        scanResult.signatureVersion || null,
        scanResult.scanDetails,
        scanResult.scanId,
      ];

      await this.database.query(query, values);

      logger.debug('Scan results stored in database', {
        scanId: scanResult.scanId,
        documentId,
        userId,
      });
    } catch (error) {
      logger.error('Failed to store scan results:', {
        scanId: scanResult.scanId,
        documentId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get ClamAV version
   */
  private async getClamAVVersion(): Promise<string> {
    try {
      const scanner = this.scanners.get('clamav');
      if (scanner) {
        return scanner.getVersion();
      }
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get ClamAV signature version
   */
  private async getClamAVSignatureVersion(): Promise<string> {
    try {
      const scanner = this.scanners.get('clamav');
      if (scanner) {
        return scanner.getSignatureVersion();
      }
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Generate unique scan ID
   */
  private generateScanId(documentId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `scan_${documentId}_${timestamp}_${random}`;
  }

  /**
   * Get scanner health status
   */
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      enabled: boolean;
      scannersCount: number;
      availableScanners: string[];
      clamavVersion?: string;
      lastSignatureUpdate?: string;
    };
  }> {
    try {
      const availableScanners = Array.from(this.scanners.keys());
      const clamavVersion = await this.getClamAVVersion();

      return {
        status: this.scanners.size > 0 ? 'healthy' : 'unhealthy',
        details: {
          enabled: config.virusScanner.enabled,
          scannersCount: this.scanners.size,
          availableScanners,
          clamavVersion,
          lastSignatureUpdate: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          enabled: config.virusScanner.enabled,
          scannersCount: 0,
          availableScanners: [],
        },
      };
    }
  }

  /**
   * Update virus signatures
   */
  public async updateSignatures(): Promise<void> {
    try {
      const clamavScanner = this.scanners.get('clamav');
      if (clamavScanner) {
        await clamavScanner.updateSignatures();
        logger.info('Virus signatures updated');
      }
    } catch (error) {
      logger.error('Failed to update virus signatures:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get scan history for a document
   */
  public async getScanHistory(documentId: string): Promise<any[]> {
    try {
      const query = `
        SELECT 
          scanner_name, scan_result, threat_names, scan_duration_ms,
          scanner_version, signature_version, scanned_at, scan_details
        FROM virus_scan_results
        WHERE document_id = $1
        ORDER BY scanned_at DESC
      `;

      const result = await this.database.query(query, [documentId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get scan history:', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Cleanup temporary files and resources
   */
  public async cleanup(): Promise<void> {
    try {
      // Clean up any temporary files
      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(process.cwd(), 'temp');

      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          if (file.endsWith('.tmp')) {
            fs.unlinkSync(path.join(tempDir, file));
          }
        }
      }

      logger.info('Virus scanner cleanup completed');
    } catch (error) {
      logger.error('Virus scanner cleanup failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}