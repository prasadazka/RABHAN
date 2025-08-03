import { Pool } from 'pg';
import { db } from '../config/database';
import {
  UserProfile,
  CreateUserProfileDTO,
  UpdateUserProfileDTO,
  UserDocument,
  UserActivity,
  BNPLEligibility,
  NotFoundError,
  ConflictError
} from '../types';
import { logger, logAudit, logPerformance } from '../utils/logger';

export class UserModel {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  // Create user profile
  async createProfile(data: CreateUserProfileDTO): Promise<UserProfile> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Check if profile already exists
      const existing = await this.pool.query(
        'SELECT id FROM user_profiles WHERE auth_user_id = $1',
        [data.userId]
      );

      if (existing.rows.length > 0) {
        throw new ConflictError('User profile already exists');
      }

      const query = `
        INSERT INTO user_profiles (
          auth_user_id, region, city, district,
          street_address, postal_code, property_type,
          property_ownership, roof_size, gps_latitude, gps_longitude,
          electricity_consumption, electricity_meter_number,
          preferred_language, employment_status, employer_name,
          job_title, monthly_income, years_employed,
          desired_system_size, budget_range
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        ) RETURNING *`;

      const values = [
        data.userId,
        data.region,
        data.city,
        data.district,
        data.streetAddress,
        data.postalCode,
        data.propertyType.toUpperCase(),
        data.propertyOwnership.toUpperCase(),
        data.roofSize,
        data.gpsLatitude,
        data.gpsLongitude,
        data.electricityConsumption,
        data.electricityMeterNumber,
        data.preferredLanguage || 'ar',
        data.employmentStatus || null,
        data.employerName || null,
        data.jobTitle || null,
        data.monthlyIncome || null,
        data.yearsEmployed || null,
        data.desiredSystemSize || null,
        this.transformEnumValue('budget_range', data.budgetRange) || null
      ];

      const result = await this.pool.query(query, values);
      const profile = this.mapRowToProfile(result.rows[0]);

      // Calculate profile completion - commented out as database function doesn't exist
      // await this.updateProfileCompletion(profile.userId);

      // Log audit event
      logAudit('USER_PROFILE_CREATED', {
        userId: data.userId,
        profileId: profile.id
      }, data.userId);

      // Log performance
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logPerformance('createProfile', duration, { userId: data.userId });

      return profile;
    } catch (error) {
      logger.error('Failed to create user profile', error);
      throw error;
    }
  }

  // Get user profile by userId
  async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    const startTime = process.hrtime.bigint();

    try {
      const query = 'SELECT * FROM user_profiles WHERE auth_user_id = $1';
      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const profile = this.mapRowToProfile(result.rows[0]);

      // Log performance
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logPerformance('getProfileByUserId', duration, { userId });

      return profile;
    } catch (error) {
      logger.error('Failed to get user profile', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId: string, data: UpdateUserProfileDTO): Promise<UserProfile> {
    const startTime = process.hrtime.bigint();

    try {
      // Get existing profile for audit
      const existing = await this.getProfileByUserId(userId);
      if (!existing) {
        throw new NotFoundError('User profile not found');
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = this.camelToSnake(key);
          const transformedValue = this.transformEnumValue(dbField, value);
          
          // Log solar field processing
          if (key === 'desiredSystemSize' || key === 'budgetRange') {
            console.log(`🌞 Processing solar field: ${key} = ${value}`);
            console.log(`  → DB field: ${dbField}`);
            console.log(`  → Transformed value: ${transformedValue}`);
          }
          
          updateFields.push(`${dbField} = $${paramCount}`);
          values.push(transformedValue);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        return existing;
      }

      values.push(userId);
      const query = `
        UPDATE user_profiles 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE auth_user_id = $${paramCount}
        RETURNING *`;


      const result = await this.pool.query(query, values);
      const profile = this.mapRowToProfile(result.rows[0]);

      // Update profile completion
      await this.updateProfileCompletion(userId);

      // Log audit event with changes
      logAudit('USER_PROFILE_UPDATED', {
        userId,
        changes: data,
        oldValues: existing,
        newValues: profile
      }, userId);

      // Log performance
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logPerformance('updateProfile', duration, { userId });

      return profile;
    } catch (error) {
      logger.error('Failed to update user profile', error);
      throw error;
    }
  }

  // Calculate and update profile completion
  async updateProfileCompletion(userId: string): Promise<number> {
    try {
      const query = `
        UPDATE user_profiles 
        SET profile_completion_percentage = calculate_profile_completion($1),
            profile_completed = (calculate_profile_completion($1) >= 80)
        WHERE auth_user_id = $1
        RETURNING profile_completion_percentage`;

      const result = await this.pool.query(query, [userId]);
      return result.rows[0]?.profile_completion_percentage || 0;
    } catch (error) {
      logger.error('Failed to update profile completion', error);
      throw error;
    }
  }

  // Check BNPL eligibility
  async checkBNPLEligibility(userId: string): Promise<BNPLEligibility> {
    const startTime = process.hrtime.bigint();

    try {
      const query = 'SELECT * FROM check_user_bnpl_eligibility($1)';
      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      const eligibility = result.rows[0];

      // Update profile with eligibility
      await this.pool.query(`
        UPDATE user_profiles 
        SET bnpl_eligible = $1, 
            bnpl_max_amount = $2, 
            bnpl_risk_score = $3
        WHERE auth_user_id = $4`,
        [eligibility.eligible, eligibility.max_amount, eligibility.risk_score, userId]
      );

      // Log audit event
      logAudit('BNPL_ELIGIBILITY_CHECKED', {
        userId,
        eligible: eligibility.eligible,
        maxAmount: eligibility.max_amount,
        riskScore: eligibility.risk_score
      }, userId);

      // Log performance
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      logPerformance('checkBNPLEligibility', duration, { userId });

      return {
        eligible: eligibility.eligible,
        maxAmount: parseFloat(eligibility.max_amount),
        riskScore: parseFloat(eligibility.risk_score),
        reason: eligibility.reason
      };
    } catch (error) {
      logger.error('Failed to check BNPL eligibility', error);
      throw error;
    }
  }

  // Get user documents
  async getUserDocuments(userId: string): Promise<UserDocument[]> {
    try {
      const query = `
        SELECT * FROM user_documents 
        WHERE auth_user_id = $1 
        ORDER BY created_at DESC`;

      const result = await this.pool.query(query, [userId]);
      return result.rows.map(this.mapRowToDocument);
    } catch (error) {
      logger.error('Failed to get user documents', error);
      throw error;
    }
  }

  // Update document status
  async updateDocumentStatus(
    userId: string, 
    documentType: string, 
    status: string,
    rejectionReason?: string
  ): Promise<UserDocument> {
    try {
      const query = `
        UPDATE user_documents 
        SET verification_status = $1,
            rejection_reason = $2,
            verified_at = CASE WHEN $1 = 'verified' THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE auth_user_id = $3 AND document_type = $4
        RETURNING *`;

      const result = await this.pool.query(query, [
        status,
        rejectionReason || null,
        userId,
        documentType
      ]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Document not found');
      }

      const document = this.mapRowToDocument(result.rows[0]);

      // Log audit event
      logAudit('DOCUMENT_STATUS_UPDATED', {
        userId,
        documentType,
        status,
        rejectionReason
      }, userId);

      return document;
    } catch (error) {
      logger.error('Failed to update document status', error);
      throw error;
    }
  }

  // Update user verification status
  async updateVerificationStatus(
    userId: string, 
    status: 'not_verified' | 'pending' | 'verified' | 'rejected'
  ): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    try {
      const query = `
        UPDATE user_profiles 
        SET verification_status = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE auth_user_id = $2`;

      const result = await this.pool.query(query, [status, userId]);

      if (result.rowCount === 0) {
        throw new NotFoundError('User profile not found');
      }

      // Log audit event
      await logAudit('user_verification_status_updated', {
        userId,
        newStatus: status
      });

      // Log performance metrics
      logPerformance('updateVerificationStatus', startTime, {
        userId,
        status
      });

      logger.info('User verification status updated', {
        userId,
        newStatus: status
      });

    } catch (error) {
      logger.error('Failed to update verification status', {
        userId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Log user activity
  async logActivity(
    userId: string,
    activityType: string,
    activityData?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO user_activities 
        (user_id, activity_type, activity_data, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)`;

      await this.pool.query(query, [
        userId,
        activityType,
        activityData ? JSON.stringify(activityData) : null,
        ipAddress,
        userAgent
      ]);
    } catch (error) {
      logger.error('Failed to log user activity', error);
      // Don't throw - activity logging should not break the flow
    }
  }

  // Helper methods
  private mapRowToProfile(row: any): UserProfile {
    return {
      id: row.id,
      userId: row.auth_user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      region: row.region,
      city: row.city,
      district: row.district,
      streetAddress: row.street_address,
      landmark: row.landmark,
      postalCode: row.postal_code,
      propertyType: row.property_type,
      propertyOwnership: row.property_ownership,
      roofSize: parseFloat(row.roof_size),
      gpsLatitude: parseFloat(row.gps_latitude),
      gpsLongitude: parseFloat(row.gps_longitude),
      electricityConsumption: row.electricity_consumption,
      electricityMeterNumber: row.electricity_meter_number,
      preferredLanguage: row.preferred_language,
      emailNotifications: row.email_notifications,
      smsNotifications: row.sms_notifications,
      marketingConsent: row.marketing_consent,
      // Employment Information (gracefully handle missing columns)
      employmentStatus: row.employment_status || undefined,
      employerName: row.employer_name || undefined,
      jobTitle: row.job_title || undefined,
      monthlyIncome: row.monthly_income || undefined,
      yearsEmployed: row.years_employed || undefined,
      // Solar System Preferences (gracefully handle missing columns)
      desiredSystemSize: row.desired_system_size ? parseFloat(row.desired_system_size) : undefined,
      budgetRange: row.budget_range || undefined,
      profileCompleted: row.profile_completed,
      profileCompletionPercentage: row.profile_completion_percentage,
      bnplEligible: row.bnpl_eligible,
      bnplMaxAmount: parseFloat(row.bnpl_max_amount || 0),
      bnplRiskScore: row.bnpl_risk_score ? parseFloat(row.bnpl_risk_score) : undefined,
      verificationStatus: row.verification_status || 'not_verified',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToDocument(row: any): UserDocument {
    return {
      id: row.id,
      userId: row.auth_user_id,
      documentType: row.document_type,
      uploadStatus: row.upload_status,
      verificationStatus: row.verification_status,
      uploadedAt: row.uploaded_at,
      verifiedAt: row.verified_at,
      rejectionReason: row.rejection_reason,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private transformEnumValue(field: string, value: any): any {
    if (typeof value !== 'string') return value;
    
    // Transform budget range enum values
    if (field === 'budget_range') {
      const budgetRangeMap: Record<string, string> = {
        'under_10k': 'UNDER_10K',
        '10k_25k': '10K_25K',
        '25k_50k': '25K_50K',
        '50k_100k': '50K_100K',
        'over_100k': '100K_PLUS'
      };
      return budgetRangeMap[value] || value;
    }
    
    // Transform property type enum values (frontend might send lowercase)
    if (field === 'property_type') {
      return value.toUpperCase();
    }
    
    // Transform property ownership enum values (frontend might send lowercase)
    if (field === 'property_ownership') {
      const ownershipMap: Record<string, string> = {
        'owned': 'OWNED',
        'rented': 'RENTED',
        'leased': 'LEASED',
        'family_owned': 'FAMILY_OWNED'
      };
      return ownershipMap[value] || value.toUpperCase();
    }
    
    return value;
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}