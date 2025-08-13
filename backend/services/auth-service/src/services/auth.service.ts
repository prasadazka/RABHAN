import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import axios from 'axios';
import { 
  User, 
  Contractor,
  UserRole, 
  UserStatus, 
  AuthProvider,
  RegisterRequest,
  ContractorRegisterRequest,
  LoginRequest,
  AuthTokens,
  UserSession,
  ContractorSession
} from '../types/auth.types';
import { DatabaseConfig } from '../config/database.config';
import { RedisConfig } from '../config/redis.config';
import { PasswordUtils } from '../utils/password.utils';
import { JWTUtils } from '../utils/jwt.utils';
import { ValidationUtils } from '../utils/validation.utils';
import { logger, SAMALogger } from '../utils/logger';
import { config } from '../config/environment.config';
import { createMockRedis } from '../utils/mock-redis';

export class AuthService {
  private pool: Pool;
  private redis: any;

  constructor() {
    this.pool = DatabaseConfig.getInstance().getPool();
    this.redis = RedisConfig.getInstance().getClient() || createMockRedis();
  }

  async registerUser(data: RegisterRequest): Promise<AuthTokens> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const passwordValidation = PasswordUtils.validate(data.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
      }
      
      const passwordHash = await PasswordUtils.hash(data.password);
      const normalizedPhone = data.phone ? ValidationUtils.normalizeSaudiPhone(data.phone) : null;
      let phoneVerified = false;
      if (normalizedPhone) {
        const PhoneVerificationService = require('./phone-verification.service').PhoneVerificationService;
        const phoneVerificationService = new PhoneVerificationService();
        phoneVerified = await phoneVerificationService.isPhoneVerified(normalizedPhone);
        
        if (!phoneVerified && config.env === 'production') {
          throw new Error('Phone verification required before registration');
        }
      }
      
      // Insert into users table
      const createUserQuery = `
        INSERT INTO users (
          first_name, last_name, email, password_hash, phone, 
          provider, national_id, status, user_type, role,
          email_verified, phone_verified
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const userResult = await client.query(createUserQuery, [
        data.first_name,
        data.last_name,
        data.email.toLowerCase(),
        passwordHash,
        normalizedPhone,
        'EMAIL',
        data.national_id,
        'PENDING',
        data.user_type || 'HOMEOWNER',
        UserRole.USER,
        false,
        phoneVerified
      ]);
      
      const user = userResult.rows[0];
      
      const sessionId = uuidv4();
      const { accessToken, refreshToken, expiresIn } = JWTUtils.generateTokenPair(
        user.id,
        user.email,
        UserRole.USER,
        sessionId
      );
      
      await client.query(
        `INSERT INTO user_sessions (id, user_id, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [sessionId, user.id, refreshToken, new Date(Date.now() + expiresIn * 1000)]
      );
      
      await client.query('COMMIT');
      
      SAMALogger.logAuthEvent('USER_REGISTERED', user.id, {
        email: user.email,
        role: user.role
      });
      
      logger.info(`✅ User registered successfully: ${user.email}`);
      
      return {
        accessToken,
        refreshToken,
        expiresIn,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: UserRole.USER,
          phone: user.phone,
          national_id: user.national_id,
          user_type: user.user_type,
          status: user.status,
          bnpl_eligible: user.bnpl_eligible || false
        }
      };
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      if (error.code === '23505') {
        if (error.constraint === 'users_email_key') {
          throw new Error('Email already registered');
        }
        if (error.constraint === 'users_phone_key') {
          throw new Error('Phone number already registered');
        }
        if (error.constraint === 'users_national_id_key') {
          throw new Error('National ID already registered');
        }
      }
      
      logger.error('User registration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async register(data: ContractorRegisterRequest): Promise<AuthTokens> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const passwordValidation = PasswordUtils.validate(data.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
      }
      
      const passwordHash = await PasswordUtils.hash(data.password);
      const normalizedPhone = data.phone ? ValidationUtils.normalizeSaudiPhone(data.phone) : null;
      let phoneVerified = false;
      if (normalizedPhone) {
        const PhoneVerificationService = require('./phone-verification.service').PhoneVerificationService;
        const phoneVerificationService = new PhoneVerificationService();
        phoneVerified = await phoneVerificationService.isPhoneVerified(normalizedPhone);
        
        if (!phoneVerified && config.env === 'production') {
          throw new Error('Phone verification required before registration');
        }
      }
      // Create contractor record directly in contractors table
      const createContractorQuery = `
        INSERT INTO contractors (
          first_name, last_name, email, password_hash, phone, 
          provider, national_id, status, business_type, 
          email_verified, phone_verified, company_name,
          cr_number, vat_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const contractorResult = await client.query(createContractorQuery, [
        data.first_name,
        data.last_name,
        data.email.toLowerCase(),
        passwordHash,
        normalizedPhone,
        AuthProvider.EMAIL,
        data.national_id,
        UserStatus.PENDING,
        data.user_type === 'BUSINESS' ? 'llc' : 'individual',
        false,
        phoneVerified,
        data.company_name || 'To be updated',
        data.cr_number || null,
        data.vat_number || null
      ]);
      
      const contractor = contractorResult.rows[0];
      
      const sessionId = uuidv4();
      const { accessToken, refreshToken, expiresIn } = JWTUtils.generateTokenPair(
        contractor.id,
        contractor.email,
        UserRole.CONTRACTOR,
        sessionId
      );
      
      const createSessionQuery = `
        INSERT INTO contractor_sessions (id, contractor_id, refresh_token, expires_at)
        VALUES ($1, $2, $3, $4)
      `;
      
      const expiresAt = new Date(Date.now() + JWTUtils.getExpiresInMs(config.jwt.refreshTokenExpiresIn));
      await client.query(createSessionQuery, [sessionId, contractor.id, refreshToken, expiresAt]);
      
      await client.query('COMMIT');
      
      SAMALogger.logAuthEvent('CONTRACTOR_REGISTRATION', contractor.id, {
        role: UserRole.CONTRACTOR,
        provider: AuthProvider.EMAIL
      });
      
      await this.cacheContractorData(contractor.id, contractor);
      return { 
        accessToken, 
        refreshToken, 
        expiresIn,
        user: {
          id: contractor.id,
          first_name: contractor.first_name,
          last_name: contractor.last_name,
          email: contractor.email,
          role: UserRole.CONTRACTOR,
          phone: contractor.phone,
          national_id: contractor.national_id,
          user_type: contractor.business_type,
          status: contractor.status,
          bnpl_eligible: false
        }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate key value violates unique constraint')) {
          if (error.message.includes('contractors_email_key')) {
            throw new Error('Email already registered');
          }
          if (error.message.includes('contractors_national_id_key')) {
            throw new Error('National ID already registered');
          }
        }
      }
      
      logger.error('Contractor registration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async login(data: LoginRequest): Promise<AuthTokens> {
    const client = await this.pool.connect();
    
    try {
      if (data.email && this.redis) {
        const verifiedKey = `login_verified:${data.email.toLowerCase()}`;
        const isOTPVerified = await this.redis.get(verifiedKey);
        
        // In development mode, optionally allow login with dev credentials without OTP verification
        const isDevelopment = process.env.NODE_ENV === 'development';
        const forceOTPInDev = process.env.FORCE_OTP_IN_DEV === 'true';
        // Get dev credential domains from environment or use defaults
        const devCredentialDomains = process.env.DEV_CREDENTIAL_DOMAINS?.split(',') || ['@example.com', '@business.com'];
        const devCredentialEmails = process.env.DEV_CREDENTIAL_EMAILS?.split(',') || ['admin@rabhan.sa'];
        
        const isDevCredential = isDevelopment && !forceOTPInDev && (
          devCredentialDomains.some(domain => data.email.includes(domain)) ||
          devCredentialEmails.includes(data.email)
        );
        
        if (!isOTPVerified && !isDevCredential) {
          throw new Error('OTP verification required before login');
        }
        
        if (isDevCredential) {
          logger.info(`🧪 Development mode: Bypassing OTP verification for dev credential: ${data.email}`);
        } else if (isDevelopment && forceOTPInDev) {
          logger.info(`🔒 Development mode: OTP verification required (FORCE_OTP_IN_DEV=true)`);
        }
      }
      
      // Require userType to be specified - no auto-detection
      if (!data.userType) {
        throw new Error('User type must be specified (USER or CONTRACTOR)');
      }
      
      // Determine which table to query based on userType
      const isContractor = data.userType === 'CONTRACTOR';
      const tableName = isContractor ? 'contractors' : 'users';
      const sessionTable = isContractor ? 'contractor_sessions' : 'user_sessions';
      const userIdField = isContractor ? 'contractor_id' : 'user_id';
      
      // Get user from the determined table
      let getUserQuery: string;
      let queryParam: string;
      
      if (data.email) {
        getUserQuery = `SELECT * FROM ${tableName} WHERE email = $1`;
        queryParam = data.email.toLowerCase();
      } else if (data.phone) {
        const normalizedPhone = ValidationUtils.normalizeSaudiPhone(data.phone);
        getUserQuery = `SELECT * FROM ${tableName} WHERE phone = $1`;
        queryParam = normalizedPhone;
      } else {
        throw new Error('Either email or phone is required');
      }
      
      const userResult = await client.query(getUserQuery, [queryParam]);
      
      if (userResult.rows.length === 0) {
        const identifier = data.email || data.phone;
        const eventType = isContractor ? 'LOGIN_FAILED_CONTRACTOR_NOT_FOUND' : 'LOGIN_FAILED_USER_NOT_FOUND';
        SAMALogger.logSecurityEvent(eventType, 'LOW', { 
          identifier, 
          loginType: data.email ? 'email' : 'phone',
          userType: data.userType
        });
        throw new Error('Invalid credentials');
      }
      
      const user = userResult.rows[0];
      
      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        SAMALogger.logSecurityEvent('LOGIN_ATTEMPT_LOCKED_ACCOUNT', 'MEDIUM', { userId: user.id, userType: data.userType });
        throw new Error('Account temporarily locked. Please try again later.');
      }
      
      // Verify password
      const isValidPassword = await PasswordUtils.compare(data.password, user.password_hash);
      
      if (!isValidPassword) {
        // Increment login attempts
        await this.incrementLoginAttempts(user.id, data.userType);
        SAMALogger.logSecurityEvent('LOGIN_FAILED_INVALID_PASSWORD', 'MEDIUM', { userId: user.id, userType: data.userType });
        throw new Error('Invalid credentials');
      }
      
      // Check account status
      if (user.status !== 'ACTIVE' && user.status !== 'PENDING') {
        SAMALogger.logSecurityEvent('LOGIN_FAILED_INACTIVE_ACCOUNT', 'MEDIUM', { userId: user.id, status: user.status, userType: data.userType });
        throw new Error('Account is not active');
      }
      
      // Reset login attempts on successful login
      await this.resetLoginAttempts(user.id, data.userType);
      
      // Check if phone needs verification update
      if (user.phone && !user.phone_verified) {
        const PhoneVerificationService = require('./phone-verification.service').PhoneVerificationService;
        const phoneVerificationService = new PhoneVerificationService();
        const isVerified = await phoneVerificationService.isPhoneVerified(user.phone);
        
        if (isVerified) {
          // Update phone verification status
          await client.query(
            `UPDATE ${tableName} SET phone_verified = true, phone_verified_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [user.id]
          );
          user.phone_verified = true;
        }
      }
      
      // Create session
      const sessionId = uuidv4();
      const userRole = isContractor ? UserRole.CONTRACTOR : UserRole.USER;
      const { accessToken, refreshToken, expiresIn } = JWTUtils.generateTokenPair(
        user.id,
        user.email,
        userRole,
        sessionId
      );
      
      const createSessionQuery = `
        INSERT INTO ${sessionTable} (id, ${userIdField}, refresh_token, device_id, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      await client.query(createSessionQuery, [sessionId, user.id, refreshToken, data.deviceId, expiresAt]);
      
      // Update last login
      await client.query(`UPDATE ${tableName} SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
      
      // Log for SAMA compliance
      const eventType = isContractor ? 'CONTRACTOR_LOGIN' : 'USER_LOGIN';
      SAMALogger.logAuthEvent(eventType, user.id, {
        deviceId: data.deviceId,
        provider: 'EMAIL',
        userType: data.userType
      });
      
      // Clean up login verification state for email-based login
      if (data.email && this.redis) {
        const verifiedKey = `login_verified:${data.email.toLowerCase()}`;
        await this.redis.del(verifiedKey);
      }
      
      return {
        accessToken,
        refreshToken,
        expiresIn,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: userRole,
          phone: user.phone,
          national_id: user.national_id,
          user_type: user.user_type || user.business_type,
          status: user.status,
          bnpl_eligible: user.bnpl_eligible || false
        }
      };
      
    } finally {
      client.release();
    }
  }


  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const client = await this.pool.connect();
    
    try {
      // Verify refresh token
      const payload = JWTUtils.verifyRefreshToken(refreshToken);
      
      // Determine table and field names based on role
      const isContractor = payload.role === UserRole.CONTRACTOR;
      const sessionTable = isContractor ? 'contractor_sessions' : 'user_sessions';
      const userTable = isContractor ? 'contractors' : 'users';
      const userIdField = isContractor ? 'contractor_id' : 'user_id';
      
      // Get session from appropriate table
      const getSessionQuery = `
        SELECT s.*, u.email, u.status
        FROM ${sessionTable} s
        JOIN ${userTable} u ON u.id = s.${userIdField}
        WHERE s.refresh_token = $1 AND s.expires_at > CURRENT_TIMESTAMP
      `;
      
      const sessionResult = await client.query(getSessionQuery, [refreshToken]);
      
      if (sessionResult.rows.length === 0) {
        SAMALogger.logSecurityEvent('REFRESH_TOKEN_INVALID', 'MEDIUM', { sessionId: payload.sessionId });
        throw new Error('Invalid refresh token');
      }
      
      const session = sessionResult.rows[0];
      
      // Check user status
      if (session.status !== UserStatus.ACTIVE && session.status !== UserStatus.PENDING) {
        throw new Error('User account is not active');
      }
      
      // Generate new tokens
      const newSessionId = uuidv4();
      const newTokens = JWTUtils.generateTokenPair(
        session[userIdField],
        session.email,
        payload.role,
        newSessionId
      );
      
      // Update session
      await client.query('BEGIN');
      
      // Delete old session
      await client.query(`DELETE FROM ${sessionTable} WHERE id = $1`, [session.id]);
      
      // Create new session
      const createSessionQuery = `
        INSERT INTO ${sessionTable} (id, ${userIdField}, refresh_token, device_id, user_agent, ip_address, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      const expiresAt = new Date(Date.now() + JWTUtils.getExpiresInMs(config.jwt.refreshTokenExpiresIn));
      await client.query(createSessionQuery, [
        newSessionId,
        session[userIdField],
        newTokens.refreshToken,
        session.device_id,
        session.user_agent,
        session.ip_address,
        expiresAt
      ]);
      
      await client.query('COMMIT');
      
      // Log for SAMA compliance
      const eventType = isContractor ? 'CONTRACTOR_TOKEN_REFRESH' : 'USER_TOKEN_REFRESH';
      SAMALogger.logAuthEvent(eventType, session[userIdField], { sessionId: newSessionId });
      
      return newTokens;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async logout(contractorId: string, sessionId: string): Promise<void> {
    try {
      // Delete session
      await this.pool.query('DELETE FROM contractor_sessions WHERE id = $1 AND contractor_id = $2', [sessionId, contractorId]);
      
      // Clear cache
      await this.clearContractorCache(contractorId);
      
      // Log for SAMA compliance
      SAMALogger.logAuthEvent('CONTRACTOR_LOGOUT', contractorId, { sessionId });
      
    } catch (error) {
      logger.error('Contractor logout failed:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      
      if (result.rows.length === 0) return null;
      
      return result.rows[0];
    } catch (error) {
      logger.error('Get user by ID error:', error);
      throw error;
    }
  }

  async getContractorById(contractorId: string): Promise<Contractor | null> {
    // Try cache first
    const cached = await this.getCachedContractorData(contractorId);
    if (cached) return cached;
    
    // Get from database
    const result = await this.pool.query('SELECT * FROM contractors WHERE id = $1', [contractorId]);
    
    if (result.rows.length === 0) return null;
    
    const contractor = result.rows[0];
    
    // Cache for next time
    await this.cacheContractorData(contractorId, contractor);
    
    return contractor;
  }
  
  async getUserByIdAndRole(userId: string, role: UserRole): Promise<User | Contractor | null> {
    try {
      // Convert role to string for reliable comparison
      const roleString = String(role);
      
      if (roleString === 'USER') {
        return await this.getUserById(userId);
      } else if (roleString === 'CONTRACTOR') {
        const contractor = await this.getContractorById(userId);
        if (contractor) {
          // Add role field to contractor data since contractors table doesn't have role column
          return {
            ...contractor,
            role: UserRole.CONTRACTOR
          };
        }
        return contractor;
      } else {
        throw new Error(`Unsupported role: ${role}`);
      }
    } catch (error) {
      logger.error('Get user by ID and role error:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, updateData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }): Promise<void> {
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Add fields to update
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        return; // Nothing to update
      }

      // Add userId as the last parameter
      values.push(userId);
      
      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
      `;

      await this.pool.query(query, values);

      logger.info('User profile updated successfully', { userId, fields: Object.keys(updateData) });

    } catch (error) {
      logger.error('Failed to update user profile', error);
      throw error;
    }
  }

  async updateContractorProfile(contractorId: string, updateData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company_name?: string;
    cr_number?: string;
    vat_number?: string;
    business_type?: string;
  }): Promise<void> {
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Add fields to update
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        return; // Nothing to update
      }

      // Add contractorId as the last parameter
      values.push(contractorId);
      
      const query = `
        UPDATE contractors 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
      `;

      await this.pool.query(query, values);

      // Clear contractor cache so it gets refreshed next time
      await this.clearContractorCache(contractorId);

      logger.info('Contractor profile updated successfully', { contractorId, fields: Object.keys(updateData) });

    } catch (error) {
      logger.error('Failed to update contractor profile', error);
      throw error;
    }
  }
  
  async updateProfileByRole(userId: string, role: UserRole, updateData: any): Promise<void> {
    try {
      if (role === UserRole.USER) {
        const { company_name, cr_number, vat_number, ...userUpdateData } = updateData;
        await this.updateUserProfile(userId, userUpdateData);
      } else if (role === UserRole.CONTRACTOR) {
        await this.updateContractorProfile(userId, updateData);
      } else {
        throw new Error(`Unsupported role: ${role}`);
      }
    } catch (error) {
      logger.error('Failed to update profile by role', error);
      throw error;
    }
  }

  private async incrementLoginAttempts(userId: string, userType?: 'USER' | 'CONTRACTOR'): Promise<void> {
    const isContractor = userType === 'CONTRACTOR';
    const tableName = isContractor ? 'contractors' : 'users';
    const userIdField = isContractor ? 'contractorId' : 'userId';
    
    const result = await this.pool.query(
      `UPDATE ${tableName} SET login_attempts = login_attempts + 1 WHERE id = $1 RETURNING login_attempts`,
      [userId]
    );
    
    const attempts = result.rows[0].login_attempts;
    
    if (attempts >= config.security.maxLoginAttempts) {
      const lockedUntil = new Date(Date.now() + config.security.accountLockDurationMs);
      await this.pool.query(
        `UPDATE ${tableName} SET locked_until = $1 WHERE id = $2`,
        [lockedUntil, userId]
      );
      
      SAMALogger.logSecurityEvent('ACCOUNT_LOCKED_MAX_ATTEMPTS', 'HIGH', { [userIdField]: userId, attempts });
    }
  }

  private async resetLoginAttempts(userId: string, userType?: 'USER' | 'CONTRACTOR'): Promise<void> {
    const isContractor = userType === 'CONTRACTOR';
    const tableName = isContractor ? 'contractors' : 'users';
    
    await this.pool.query(
      `UPDATE ${tableName} SET login_attempts = 0, locked_until = NULL WHERE id = $1`,
      [userId]
    );
  }

  private async cacheContractorData(contractorId: string, contractorData: any): Promise<void> {
    if (!this.redis) {
      // Redis disabled in development mode
      return;
    }
    const key = `contractor:${contractorId}`;
    await this.redis.setex(key, 3600, JSON.stringify(contractorData));
  }

  private async getCachedContractorData(contractorId: string): Promise<any> {
    if (!this.redis) {
      // Redis disabled in development mode
      return null;
    }
    const key = `contractor:${contractorId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async clearContractorCache(contractorId: string): Promise<void> {
    if (!this.redis) {
      // Redis disabled in development mode
      return;
    }
    const key = `contractor:${contractorId}`;
    await this.redis.del(key);
  }

  // Phone number masking utility
  private maskPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove country code for masking
    let localPhone = phone;
    if (phone.startsWith('+966')) {
      localPhone = phone.substring(4); // Remove +966
    } else if (phone.startsWith('+91')) {
      localPhone = phone.substring(3); // Remove +91
    } else if (phone.startsWith('+1')) {
      localPhone = phone.substring(2); // Remove +1
    }
    
    // Mask middle digits, show first 2 and last 4
    if (localPhone.length >= 6) {
      const first = localPhone.substring(0, 2);
      const last = localPhone.substring(localPhone.length - 4);
      const masked = '*'.repeat(localPhone.length - 6);
      return phone.substring(0, phone.length - localPhone.length) + first + masked + last;
    }
    
    return phone; // Return as is if too short
  }

  // Email-based login flow methods
  async lookupUserByEmail(email: string): Promise<{ phone: string; maskedPhone: string; userType: 'USER' | 'CONTRACTOR' } | null> {
    try {
      const emailLower = email.toLowerCase();
      
      // Check users table first
      const getUserQuery = 'SELECT phone FROM users WHERE email = $1 AND phone IS NOT NULL';
      const userResult = await this.pool.query(getUserQuery, [emailLower]);
      
      if (userResult.rows.length > 0) {
        const phone = userResult.rows[0].phone;
        return {
          phone,
          maskedPhone: this.maskPhoneNumber(phone),
          userType: 'USER'
        };
      }
      
      // Check contractors table
      const getContractorQuery = 'SELECT phone FROM contractors WHERE email = $1 AND phone IS NOT NULL';
      const contractorResult = await this.pool.query(getContractorQuery, [emailLower]);
      
      if (contractorResult.rows.length > 0) {
        const phone = contractorResult.rows[0].phone;
        return {
          phone,
          maskedPhone: this.maskPhoneNumber(phone),
          userType: 'CONTRACTOR'
        };
      }
      
      return null;
    } catch (error) {
      logger.error('User email lookup error:', error);
      throw error;
    }
  }

  async lookupUserByEmailAndType(email: string, userType?: 'USER' | 'CONTRACTOR'): Promise<{ phone: string; maskedPhone: string; userType: 'USER' | 'CONTRACTOR' } | null> {
    try {
      const emailLower = email.toLowerCase();
      
      // If userType is specified, check only that table
      if (userType === 'CONTRACTOR') {
        const getContractorQuery = 'SELECT phone FROM contractors WHERE email = $1 AND phone IS NOT NULL';
        const contractorResult = await this.pool.query(getContractorQuery, [emailLower]);
        
        if (contractorResult.rows.length > 0) {
          const phone = contractorResult.rows[0].phone;
          return {
            phone,
            maskedPhone: this.maskPhoneNumber(phone),
            userType: 'CONTRACTOR'
          };
        }
        return null;
      } else if (userType === 'USER') {
        const getUserQuery = 'SELECT phone FROM users WHERE email = $1 AND phone IS NOT NULL';
        const userResult = await this.pool.query(getUserQuery, [emailLower]);
        
        if (userResult.rows.length > 0) {
          const phone = userResult.rows[0].phone;
          return {
            phone,
            maskedPhone: this.maskPhoneNumber(phone),
            userType: 'USER'
          };
        }
        return null;
      }
      
      // If no userType specified, fall back to original logic
      return this.lookupUserByEmail(email);
    } catch (error) {
      logger.error('User email lookup by type error:', error);
      throw error;
    }
  }
  
  // Legacy method for backward compatibility
  async lookupContractorByEmail(email: string): Promise<{ phone: string; maskedPhone: string } | null> {
    try {
      const getContractorQuery = 'SELECT phone FROM contractors WHERE email = $1 AND phone IS NOT NULL';
      const result = await this.pool.query(getContractorQuery, [email.toLowerCase()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const phone = result.rows[0].phone;
      return {
        phone,
        maskedPhone: this.maskPhoneNumber(phone)
      };
    } catch (error) {
      logger.error('Contractor email lookup error:', error);
      throw error;
    }
  }

  async sendLoginOTPByEmail(email: string): Promise<{ maskedPhone: string } | null> {
    try {
      // Get user's phone number from either table
      const userLookup = await this.lookupUserByEmail(email);
      if (!userLookup) {
        return null; // User not found or no phone
      }

      // Send OTP to the user's registered phone
      const PhoneVerificationService = require('./phone-verification.service').PhoneVerificationService;
      const phoneVerificationService = new PhoneVerificationService();
      
      await phoneVerificationService.sendOTP(userLookup.phone);
      
      // Store email-OTP mapping in Redis for verification
      if (this.redis) {
        const emailOtpKey = `login_email_otp:${email.toLowerCase()}`;
        await this.redis.setex(emailOtpKey, 300, userLookup.phone); // 5 minutes
      }
      
      const eventType = userLookup.userType === 'USER' ? 'USER_LOGIN_OTP_SENT_VIA_EMAIL' : 'CONTRACTOR_LOGIN_OTP_SENT_VIA_EMAIL';
      SAMALogger.logAuthEvent(eventType, undefined, {
        email,
        maskedPhone: userLookup.maskedPhone,
        userType: userLookup.userType
      });
      
      return { maskedPhone: userLookup.maskedPhone };
    } catch (error) {
      logger.error('Send login OTP by email error:', error);
      throw error;
    }
  }

  async sendLoginOTPByEmailAndType(email: string, userType?: 'USER' | 'CONTRACTOR'): Promise<{ maskedPhone: string } | null> {
    try {
      // Get user's phone number from specific table based on userType
      const userLookup = await this.lookupUserByEmailAndType(email, userType);
      if (!userLookup) {
        return null; // User not found or no phone
      }

      // Send OTP to the user's registered phone
      const PhoneVerificationService = require('./phone-verification.service').PhoneVerificationService;
      const phoneVerificationService = new PhoneVerificationService();
      
      await phoneVerificationService.sendOTP(userLookup.phone);
      
      // Store email-OTP mapping in Redis for verification
      if (this.redis) {
        const emailUserTypeKey = `login_email_otp:${email.toLowerCase()}:${userType || 'AUTO'}`;
        await this.redis.setex(emailUserTypeKey, 300, userLookup.phone); // 5 minutes
      }
      
      const eventType = userLookup.userType === 'USER' ? 'USER_LOGIN_OTP_SENT_VIA_EMAIL' : 'CONTRACTOR_LOGIN_OTP_SENT_VIA_EMAIL';
      SAMALogger.logAuthEvent(eventType, undefined, {
        email,
        maskedPhone: userLookup.maskedPhone,
        userType: userLookup.userType
      });
      
      return { maskedPhone: userLookup.maskedPhone };
    } catch (error) {
      logger.error('Send login OTP by email error:', error);
      throw error;
    }
  }

  async verifyLoginOTP(email: string, otp: string): Promise<boolean> {
    try {
      // Get phone number from Redis mapping
      let phoneNumber: string;
      
      if (this.redis) {
        const emailOtpKey = `login_email_otp:${email.toLowerCase()}`;
        phoneNumber = await this.redis.get(emailOtpKey);
        
        if (!phoneNumber) {
          throw new Error('OTP verification session expired');
        }
      } else {
        // Fallback: lookup phone directly
        const userLookup = await this.lookupUserByEmail(email);
        if (!userLookup) {
          throw new Error('User not found');
        }
        phoneNumber = userLookup.phone;
      }

      // Verify OTP using phone verification service
      const PhoneVerificationService = require('./phone-verification.service').PhoneVerificationService;
      const phoneVerificationService = new PhoneVerificationService();
      
      const isValid = await phoneVerificationService.verifyOTP(phoneNumber, otp);
      
      if (isValid && this.redis) {
        // Store verified state for login
        const verifiedKey = `login_verified:${email.toLowerCase()}`;
        await this.redis.setex(verifiedKey, 600, 'true'); // 10 minutes to complete login
        
        // Clean up email-OTP mapping
        const emailOtpKey = `login_email_otp:${email.toLowerCase()}`;
        await this.redis.del(emailOtpKey);
      }
      
      return isValid;
    } catch (error) {
      logger.error('Verify login OTP error:', error);
      throw error;
    }
  }

  async verifyLoginOTPWithType(email: string, otp: string, userType?: 'USER' | 'CONTRACTOR'): Promise<boolean> {
    try {
      // Get phone number from Redis mapping with userType
      let phoneNumber: string;
      
      if (this.redis) {
        const emailUserTypeKey = `login_email_otp:${email.toLowerCase()}:${userType || 'AUTO'}`;
        phoneNumber = await this.redis.get(emailUserTypeKey);
        
        if (!phoneNumber) {
          // Fallback to old key format for backward compatibility
          const emailOtpKey = `login_email_otp:${email.toLowerCase()}`;
          phoneNumber = await this.redis.get(emailOtpKey);
          
          if (!phoneNumber) {
            throw new Error('OTP verification session expired');
          }
        }
      } else {
        // Fallback: lookup phone directly with userType
        const userLookup = await this.lookupUserByEmailAndType(email, userType);
        if (!userLookup) {
          throw new Error('User not found');
        }
        phoneNumber = userLookup.phone;
      }

      // Verify OTP using phone verification service
      const PhoneVerificationService = require('./phone-verification.service').PhoneVerificationService;
      const phoneVerificationService = new PhoneVerificationService();
      
      const isValid = await phoneVerificationService.verifyOTP(phoneNumber, otp);
      
      if (isValid && this.redis) {
        // Store verified state for login
        const verifiedKey = `login_verified:${email.toLowerCase()}`;
        await this.redis.setex(verifiedKey, 600, 'true'); // 10 minutes to complete login
        
        // Clean up email-OTP mapping (both new and old format)
        const emailUserTypeKey = `login_email_otp:${email.toLowerCase()}:${userType || 'AUTO'}`;
        const emailOtpKey = `login_email_otp:${email.toLowerCase()}`;
        await this.redis.del(emailUserTypeKey);
        await this.redis.del(emailOtpKey);
      }
      
      return isValid;
    } catch (error) {
      logger.error('Verify login OTP with type error:', error);
      throw error;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Get contractor by email
      const getContractorQuery = 'SELECT id, email FROM contractors WHERE email = $1';
      const contractorResult = await client.query(getContractorQuery, [email.toLowerCase()]);
      
      if (contractorResult.rows.length === 0) {
        // Don't reveal if email exists or not for security
        SAMALogger.logSecurityEvent('PASSWORD_RESET_REQUEST_UNKNOWN_EMAIL', 'LOW', { email });
        return;
      }
      
      const contractor = contractorResult.rows[0];
      
      // Generate reset token
      const resetToken = PasswordUtils.generateSecureToken(32);
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiry
      
      // Store reset token
      const insertTokenQuery = `
        INSERT INTO password_reset_tokens (contractor_id, token, expires_at)
        VALUES ($1, $2, $3)
      `;
      
      await client.query(insertTokenQuery, [contractor.id, resetToken, expiresAt]);
      
      // Log for SAMA compliance
      SAMALogger.logAuthEvent('CONTRACTOR_PASSWORD_RESET_REQUESTED', contractor.id, {
        email: contractor.email,
        tokenExpiry: expiresAt.toISOString()
      });
      
      // In a real implementation, you would send email here
      // For now, we'll just log the token (remove in production)
      logger.info(`Contractor password reset token for ${email}: ${resetToken}`);
      
    } catch (error) {
      logger.error('Contractor password reset request failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate new password
      const passwordValidation = PasswordUtils.validate(newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
      }
      
      // Get reset token
      const getTokenQuery = `
        SELECT rt.*, c.email
        FROM password_reset_tokens rt
        JOIN contractors c ON c.id = rt.contractor_id
        WHERE rt.token = $1 AND rt.expires_at > CURRENT_TIMESTAMP AND rt.used = FALSE
      `;
      
      const tokenResult = await client.query(getTokenQuery, [token]);
      
      if (tokenResult.rows.length === 0) {
        SAMALogger.logSecurityEvent('INVALID_PASSWORD_RESET_TOKEN', 'MEDIUM', { token });
        throw new Error('Invalid or expired reset token');
      }
      
      const resetData = tokenResult.rows[0];
      
      // Hash new password
      const passwordHash = await PasswordUtils.hash(newPassword);
      
      // Update contractor password
      await client.query(
        'UPDATE contractors SET password_hash = $1, login_attempts = 0, locked_until = NULL WHERE id = $2',
        [passwordHash, resetData.contractor_id]
      );
      
      // Mark token as used
      await client.query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
        [resetData.id]
      );
      
      // Invalidate all contractor sessions
      await client.query('DELETE FROM contractor_sessions WHERE contractor_id = $1', [resetData.contractor_id]);
      
      await client.query('COMMIT');
      
      // Clear contractor cache
      await this.clearContractorCache(resetData.contractor_id);
      
      // Log for SAMA compliance
      SAMALogger.logAuthEvent('CONTRACTOR_PASSWORD_RESET_COMPLETED', resetData.contractor_id, {
        email: resetData.email,
        tokenId: resetData.id
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async changePassword(contractorId: string, oldPassword: string, newPassword: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Get contractor
      const getContractorQuery = 'SELECT password_hash FROM contractors WHERE id = $1';
      const contractorResult = await client.query(getContractorQuery, [contractorId]);
      
      if (contractorResult.rows.length === 0) {
        throw new Error('Contractor not found');
      }
      
      const contractor = contractorResult.rows[0];
      
      // Verify old password
      const isValidOldPassword = await PasswordUtils.compare(oldPassword, contractor.password_hash);
      if (!isValidOldPassword) {
        SAMALogger.logSecurityEvent('PASSWORD_CHANGE_INVALID_OLD_PASSWORD', 'MEDIUM', { contractorId });
        throw new Error('Invalid old password');
      }
      
      // Validate new password
      const passwordValidation = PasswordUtils.validate(newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
      }
      
      // Hash new password
      const passwordHash = await PasswordUtils.hash(newPassword);
      
      // Update password
      await client.query(
        'UPDATE contractors SET password_hash = $1 WHERE id = $2',
        [passwordHash, contractorId]
      );
      
      // Log for SAMA compliance
      SAMALogger.logAuthEvent('CONTRACTOR_PASSWORD_CHANGED', contractorId, {
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Contractor password change failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

}