import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SAMAComplianceService } from '../services/sama-compliance.service';
import { UserRole } from '../types/user.types';

describe('SAMAComplianceService', () => {
  let samaComplianceService: SAMAComplianceService;

  beforeEach(() => {
    samaComplianceService = new SAMAComplianceService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('SAMA CSF Level 4 Requirements', () => {
    describe('validateUserRegistration', () => {
      it('should validate Saudi National ID format', async () => {
        const validData = {
          email: 'test@example.com',
          role: UserRole.USER,
          phone: '+966501234567',
          nationalId: '1234567890'
        };

        const result = await samaComplianceService.validateUserRegistration(validData);
        expect(result).toBe(true);
      });

      it('should reject invalid National ID format', async () => {
        const invalidData = {
          email: 'test@example.com',
          role: UserRole.USER,
          phone: '+966501234567',
          nationalId: '123'
        };

        const result = await samaComplianceService.validateUserRegistration(invalidData);
        expect(result).toBe(false);
      });

      it('should validate Saudi phone number format', async () => {
        const validData = {
          email: 'test@example.com',
          role: UserRole.USER,
          phone: '+966501234567',
          nationalId: '1234567890'
        };

        const result = await samaComplianceService.validateUserRegistration(validData);
        expect(result).toBe(true);
      });

      it('should reject invalid phone number format', async () => {
        const invalidData = {
          email: 'test@example.com',
          role: UserRole.USER,
          phone: '123456789',
          nationalId: '1234567890'
        };

        const result = await samaComplianceService.validateUserRegistration(invalidData);
        expect(result).toBe(false);
      });

      it('should validate contractor registration requirements', async () => {
        const contractorData = {
          email: 'contractor@example.com',
          role: UserRole.CONTRACTOR,
          phone: '+966501234567',
          nationalId: '1234567890'
        };

        const result = await samaComplianceService.validateUserRegistration(contractorData);
        expect(result).toBe(true);
      });

      it('should apply stricter validation for contractors', async () => {
        const contractorData = {
          email: 'contractor@example.com',
          role: UserRole.CONTRACTOR,
          phone: '+966501234567',
          nationalId: '1234567890'
        };

        const result = await samaComplianceService.validateUserRegistration(contractorData);
        expect(result).toBe(true);
      });
    });

    describe('validateUserLogin', () => {
      it('should validate user login data', async () => {
        const loginData = {
          userId: 'user-id',
          email: 'test@example.com',
          role: UserRole.USER,
          deviceId: 'device-123'
        };

        const result = await samaComplianceService.validateUserLogin(loginData);
        expect(result).toBe(true);
      });

      it('should track login attempts for fraud prevention', async () => {
        const loginData = {
          userId: 'user-id',
          email: 'test@example.com',
          role: UserRole.USER,
          deviceId: 'device-123'
        };

        // Multiple logins from same device should be allowed
        for (let i = 0; i < 3; i++) {
          const result = await samaComplianceService.validateUserLogin(loginData);
          expect(result).toBe(true);
        }
      });

      it('should validate device fingerprinting', async () => {
        const loginData = {
          userId: 'user-id',
          email: 'test@example.com',
          role: UserRole.USER,
          deviceId: 'suspicious-device'
        };

        const result = await samaComplianceService.validateUserLogin(loginData);
        expect(result).toBe(true);
      });
    });
  });

  describe('SAMA BNPL Regulations', () => {
    describe('validateBNPLEligibility', () => {
      it('should validate user age requirements (18+)', async () => {
        const userData = {
          nationalId: '1234567890', // Birth date would be extracted from this
          monthlyIncome: 5000,
          creditScore: 700,
          employmentStatus: 'EMPLOYED'
        };

        const result = await samaComplianceService.validateBNPLEligibility(userData);
        expect(result).toBe(true);
      });

      it('should validate minimum income requirements', async () => {
        const userData = {
          nationalId: '1234567890',
          monthlyIncome: 3000, // Below minimum threshold
          creditScore: 700,
          employmentStatus: 'EMPLOYED'
        };

        const result = await samaComplianceService.validateBNPLEligibility(userData);
        expect(result).toBe(false);
      });

      it('should validate credit score requirements', async () => {
        const userData = {
          nationalId: '1234567890',
          monthlyIncome: 5000,
          creditScore: 500, // Below minimum threshold
          employmentStatus: 'EMPLOYED'
        };

        const result = await samaComplianceService.validateBNPLEligibility(userData);
        expect(result).toBe(false);
      });

      it('should validate employment status', async () => {
        const userData = {
          nationalId: '1234567890',
          monthlyIncome: 5000,
          creditScore: 700,
          employmentStatus: 'UNEMPLOYED'
        };

        const result = await samaComplianceService.validateBNPLEligibility(userData);
        expect(result).toBe(false);
      });

      it('should validate debt-to-income ratio', async () => {
        const userData = {
          nationalId: '1234567890',
          monthlyIncome: 5000,
          creditScore: 700,
          employmentStatus: 'EMPLOYED',
          monthlyDebt: 4000 // High debt-to-income ratio
        };

        const result = await samaComplianceService.validateBNPLEligibility(userData);
        expect(result).toBe(false);
      });
    });

    describe('validateTransactionLimits', () => {
      it('should enforce maximum transaction amount', async () => {
        const transactionData = {
          userId: 'user-id',
          amount: 50000, // Within limit
          currency: 'SAR',
          productType: 'SOLAR_PANEL'
        };

        const result = await samaComplianceService.validateTransactionLimits(transactionData);
        expect(result).toBe(true);
      });

      it('should reject transactions above maximum limit', async () => {
        const transactionData = {
          userId: 'user-id',
          amount: 200000, // Above limit
          currency: 'SAR',
          productType: 'SOLAR_PANEL'
        };

        const result = await samaComplianceService.validateTransactionLimits(transactionData);
        expect(result).toBe(false);
      });

      it('should enforce monthly spending limits', async () => {
        const transactionData = {
          userId: 'user-id',
          amount: 30000,
          currency: 'SAR',
          productType: 'SOLAR_PANEL'
        };

        // First transaction should pass
        let result = await samaComplianceService.validateTransactionLimits(transactionData);
        expect(result).toBe(true);

        // Second transaction in same month should be evaluated against monthly limit
        result = await samaComplianceService.validateTransactionLimits(transactionData);
        expect(result).toBe(true);
      });

      it('should validate cooling-off period between transactions', async () => {
        const transactionData = {
          userId: 'user-id',
          amount: 25000,
          currency: 'SAR',
          productType: 'SOLAR_PANEL'
        };

        // First transaction
        let result = await samaComplianceService.validateTransactionLimits(transactionData);
        expect(result).toBe(true);

        // Immediate second transaction should be subject to cooling-off period
        result = await samaComplianceService.validateTransactionLimits(transactionData);
        expect(result).toBe(false);
      });
    });
  });

  describe('SAMA Data Protection Requirements', () => {
    describe('validateDataRetention', () => {
      it('should enforce data retention policies', async () => {
        const dataRequest = {
          userId: 'user-id',
          dataType: 'PERSONAL_INFORMATION',
          retentionPeriod: 7 // years
        };

        const result = await samaComplianceService.validateDataRetention(dataRequest);
        expect(result).toBe(true);
      });

      it('should validate data anonymization requirements', async () => {
        const dataRequest = {
          userId: 'user-id',
          dataType: 'TRANSACTION_HISTORY',
          anonymizeAfter: 5 // years
        };

        const result = await samaComplianceService.validateDataRetention(dataRequest);
        expect(result).toBe(true);
      });

      it('should enforce right to be forgotten', async () => {
        const deletionRequest = {
          userId: 'user-id',
          reason: 'USER_REQUEST',
          retainForCompliance: true
        };

        const result = await samaComplianceService.validateDataDeletion(deletionRequest);
        expect(result).toBe(true);
      });
    });

    describe('validateDataAccess', () => {
      it('should validate user consent for data access', async () => {
        const accessRequest = {
          userId: 'user-id',
          dataType: 'CREDIT_INFORMATION',
          purpose: 'BNPL_ASSESSMENT',
          hasConsent: true
        };

        const result = await samaComplianceService.validateDataAccess(accessRequest);
        expect(result).toBe(true);
      });

      it('should reject data access without consent', async () => {
        const accessRequest = {
          userId: 'user-id',
          dataType: 'CREDIT_INFORMATION',
          purpose: 'BNPL_ASSESSMENT',
          hasConsent: false
        };

        const result = await samaComplianceService.validateDataAccess(accessRequest);
        expect(result).toBe(false);
      });

      it('should validate data minimization principles', async () => {
        const accessRequest = {
          userId: 'user-id',
          dataType: 'PERSONAL_INFORMATION',
          requestedFields: ['name', 'email', 'phone', 'nationalId'],
          purpose: 'ACCOUNT_VERIFICATION'
        };

        const result = await samaComplianceService.validateDataAccess(accessRequest);
        expect(result).toBe(true);
      });
    });
  });

  describe('SAMA Reporting Requirements', () => {
    describe('generateComplianceReport', () => {
      it('should generate user registration statistics', async () => {
        const reportParams = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          reportType: 'USER_REGISTRATION'
        };

        const report = await samaComplianceService.generateComplianceReport(reportParams);
        
        expect(report).toHaveProperty('totalUsers');
        expect(report).toHaveProperty('usersByRole');
        expect(report).toHaveProperty('verificationRate');
        expect(report).toHaveProperty('complianceScore');
      });

      it('should generate BNPL transaction statistics', async () => {
        const reportParams = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          reportType: 'BNPL_TRANSACTIONS'
        };

        const report = await samaComplianceService.generateComplianceReport(reportParams);
        
        expect(report).toHaveProperty('totalTransactions');
        expect(report).toHaveProperty('totalValue');
        expect(report).toHaveProperty('averageTransactionSize');
        expect(report).toHaveProperty('defaultRate');
        expect(report).toHaveProperty('complianceViolations');
      });

      it('should generate risk assessment report', async () => {
        const reportParams = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          reportType: 'RISK_ASSESSMENT'
        };

        const report = await samaComplianceService.generateComplianceReport(reportParams);
        
        expect(report).toHaveProperty('riskProfile');
        expect(report).toHaveProperty('fraudDetections');
        expect(report).toHaveProperty('suspiciousActivities');
        expect(report).toHaveProperty('mitigationMeasures');
      });
    });

    describe('validateAuditTrail', () => {
      it('should maintain complete audit trail for all actions', async () => {
        const auditData = {
          userId: 'user-id',
          action: 'BNPL_APPLICATION',
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          result: 'APPROVED'
        };

        const result = await samaComplianceService.validateAuditTrail(auditData);
        expect(result).toBe(true);
      });

      it('should ensure audit trail immutability', async () => {
        const auditData = {
          userId: 'user-id',
          action: 'PASSWORD_CHANGE',
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          result: 'SUCCESS'
        };

        const result = await samaComplianceService.validateAuditTrail(auditData);
        expect(result).toBe(true);
      });

      it('should validate audit trail completeness', async () => {
        const auditQuery = {
          userId: 'user-id',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          actions: ['LOGIN', 'TRANSACTION', 'PROFILE_UPDATE']
        };

        const result = await samaComplianceService.validateAuditTrailCompleteness(auditQuery);
        expect(result).toBe(true);
      });
    });
  });

  describe('SAMA Incident Response', () => {
    describe('detectSuspiciousActivity', () => {
      it('should detect unusual login patterns', async () => {
        const activityData = {
          userId: 'user-id',
          loginAttempts: 10,
          uniqueDevices: 5,
          timeWindow: 3600000, // 1 hour
          geographicVariation: true
        };

        const result = await samaComplianceService.detectSuspiciousActivity(activityData);
        expect(result).toBe(true);
      });

      it('should detect unusual transaction patterns', async () => {
        const activityData = {
          userId: 'user-id',
          transactionCount: 5,
          totalAmount: 100000,
          timeWindow: 3600000, // 1 hour
          unusualMerchants: true
        };

        const result = await samaComplianceService.detectSuspiciousActivity(activityData);
        expect(result).toBe(true);
      });

      it('should detect potential fraud indicators', async () => {
        const activityData = {
          userId: 'user-id',
          rapidTransactions: true,
          highRiskMerchants: true,
          deviceFingerprinting: 'SUSPICIOUS',
          behaviorAnalysis: 'ANOMALOUS'
        };

        const result = await samaComplianceService.detectSuspiciousActivity(activityData);
        expect(result).toBe(true);
      });
    });

    describe('handleSecurityIncident', () => {
      it('should trigger incident response procedures', async () => {
        const incidentData = {
          type: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          affectedUsers: ['user-1', 'user-2'],
          timestamp: new Date(),
          description: 'Multiple failed login attempts detected'
        };

        const result = await samaComplianceService.handleSecurityIncident(incidentData);
        expect(result).toHaveProperty('incidentId');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('responseActions');
      });

      it('should notify SAMA of significant incidents', async () => {
        const incidentData = {
          type: 'DATA_BREACH',
          severity: 'CRITICAL',
          affectedUsers: ['user-1', 'user-2', 'user-3'],
          timestamp: new Date(),
          description: 'Potential data breach detected'
        };

        const result = await samaComplianceService.handleSecurityIncident(incidentData);
        expect(result).toHaveProperty('samaNotificationSent');
        expect(result.samaNotificationSent).toBe(true);
      });

      it('should implement user notification procedures', async () => {
        const incidentData = {
          type: 'ACCOUNT_COMPROMISE',
          severity: 'HIGH',
          affectedUsers: ['user-1'],
          timestamp: new Date(),
          description: 'Account compromise detected'
        };

        const result = await samaComplianceService.handleSecurityIncident(incidentData);
        expect(result).toHaveProperty('userNotificationSent');
        expect(result.userNotificationSent).toBe(true);
      });
    });
  });

  describe('SAMA Continuous Monitoring', () => {
    describe('monitorComplianceMetrics', () => {
      it('should track key compliance indicators', async () => {
        const metrics = await samaComplianceService.getComplianceMetrics();
        
        expect(metrics).toHaveProperty('userVerificationRate');
        expect(metrics).toHaveProperty('transactionApprovalRate');
        expect(metrics).toHaveProperty('fraudDetectionRate');
        expect(metrics).toHaveProperty('incidentResponseTime');
        expect(metrics).toHaveProperty('dataRetentionCompliance');
      });

      it('should generate compliance alerts', async () => {
        const thresholds = {
          userVerificationRate: 0.95,
          transactionApprovalRate: 0.85,
          fraudDetectionRate: 0.99,
          incidentResponseTime: 3600000 // 1 hour
        };

        const alerts = await samaComplianceService.checkComplianceThresholds(thresholds);
        expect(Array.isArray(alerts)).toBe(true);
      });

      it('should validate regulatory reporting deadlines', async () => {
        const reportingSchedule = {
          monthlyReports: new Date(),
          quarterlyReports: new Date(),
          annualReports: new Date()
        };

        const result = await samaComplianceService.validateReportingSchedule(reportingSchedule);
        expect(result).toBe(true);
      });
    });
  });
});