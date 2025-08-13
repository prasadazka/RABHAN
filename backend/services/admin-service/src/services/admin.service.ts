/**
 * RABHAN Admin Service
 * Saudi Arabia's Solar BNPL Platform - Admin Management Service
 * 
 * Features:
 * - Admin user management
 * - SAMA compliance operations
 * - Zero-trust security
 * - Performance optimized for Saudi scale
 */

import { AdminUser, CreateAdminRequest, UpdateAdminRequest } from '../types/admin.types';
import { DatabaseService } from '../config/database.config';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class AdminService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Find admin by email
   */
  async findByEmail(email: string): Promise<AdminUser | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM admin_users 
         WHERE email = $1 AND is_active = true`,
        [email]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding admin by email', error as Error, { email });
      throw error;
    }
  }

  /**
   * Find admin by ID
   */
  async findById(id: string): Promise<AdminUser | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM admin_users WHERE id = $1`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding admin by ID', error as Error, { adminId: id });
      throw error;
    }
  }

  /**
   * Create new admin user
   */
  async createAdmin(adminData: CreateAdminRequest): Promise<AdminUser> {
    try {
      const id = uuidv4();
      const result = await this.db.query(
        `INSERT INTO admin_users (
          id, email, password_hash, first_name, last_name, 
          first_name_ar, last_name_ar, role, saudi_national_id,
          phone_number, preferred_language, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          id,
          adminData.email,
          adminData.password_hash,
          adminData.first_name,
          adminData.last_name,
          adminData.first_name_ar,
          adminData.last_name_ar,
          adminData.role || 'ADMIN',
          adminData.saudi_national_id,
          adminData.phone_number,
          adminData.preferred_language || 'en',
          adminData.created_by
        ]
      );

      logger.info('Admin user created', {
        adminId: id,
        email: adminData.email,
        role: adminData.role,
        createdBy: adminData.created_by
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating admin user', error as Error, { email: adminData.email });
      throw error;
    }
  }

  /**
   * Update admin user
   */
  async updateAdmin(id: string, adminData: UpdateAdminRequest): Promise<AdminUser | null> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (adminData.first_name !== undefined) {
        fields.push(`first_name = $${paramIndex++}`);
        values.push(adminData.first_name);
      }
      if (adminData.last_name !== undefined) {
        fields.push(`last_name = $${paramIndex++}`);
        values.push(adminData.last_name);
      }
      if (adminData.first_name_ar !== undefined) {
        fields.push(`first_name_ar = $${paramIndex++}`);
        values.push(adminData.first_name_ar);
      }
      if (adminData.last_name_ar !== undefined) {
        fields.push(`last_name_ar = $${paramIndex++}`);
        values.push(adminData.last_name_ar);
      }
      if (adminData.phone_number !== undefined) {
        fields.push(`phone_number = $${paramIndex++}`);
        values.push(adminData.phone_number);
      }
      if (adminData.preferred_language !== undefined) {
        fields.push(`preferred_language = $${paramIndex++}`);
        values.push(adminData.preferred_language);
      }
      if (adminData.is_active !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(adminData.is_active);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await this.db.query(
        `UPDATE admin_users 
         SET ${fields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating admin user', error as Error, { adminId: id });
      throw error;
    }
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedLogins(id: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE admin_users 
         SET failed_login_attempts = failed_login_attempts + 1,
             is_locked = CASE 
               WHEN failed_login_attempts + 1 >= 5 THEN true 
               ELSE is_locked 
             END,
             locked_until = CASE 
               WHEN failed_login_attempts + 1 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
               ELSE locked_until 
             END
         WHERE id = $1`,
        [id]
      );
    } catch (error) {
      logger.error('Error incrementing failed logins', error as Error, { adminId: id });
      throw error;
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLogins(id: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE admin_users 
         SET failed_login_attempts = 0,
             is_locked = false,
             locked_until = NULL
         WHERE id = $1`,
        [id]
      );
    } catch (error) {
      logger.error('Error resetting failed logins', error as Error, { adminId: id });
      throw error;
    }
  }

  /**
   * Update last login timestamp and IP
   */
  async updateLastLogin(id: string, ipAddress: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE admin_users 
         SET last_login_at = CURRENT_TIMESTAMP,
             last_login_ip = $2
         WHERE id = $1`,
        [id, ipAddress]
      );
    } catch (error) {
      logger.error('Error updating last login', error as Error, { adminId: id });
      throw error;
    }
  }

  /**
   * Enable MFA for admin
   */
  async enableMFA(id: string, secret: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE admin_users 
         SET mfa_enabled = true,
             mfa_secret = $2,
             mfa_enabled_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, secret]
      );

      logger.info('MFA enabled for admin', { adminId: id });
    } catch (error) {
      logger.error('Error enabling MFA', error as Error, { adminId: id });
      throw error;
    }
  }

  /**
   * Disable MFA for admin
   */
  async disableMFA(id: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE admin_users 
         SET mfa_enabled = false,
             mfa_secret = NULL,
             mfa_enabled_at = NULL
         WHERE id = $1`,
        [id]
      );

      logger.info('MFA disabled for admin', { adminId: id });
    } catch (error) {
      logger.error('Error disabling MFA', error as Error, { adminId: id });
      throw error;
    }
  }

  /**
   * Change admin password
   */
  async changePassword(id: string, passwordHash: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE admin_users 
         SET password_hash = $2,
             password_changed_at = CURRENT_TIMESTAMP,
             must_change_password = false
         WHERE id = $1`,
        [id, passwordHash]
      );

      logger.info('Password changed for admin', { adminId: id });
    } catch (error) {
      logger.error('Error changing password', error as Error, { adminId: id });
      throw error;
    }
  }

  /**
   * Get all admins with pagination
   */
  async getAllAdmins(page: number = 1, limit: number = 50): Promise<{
    admins: AdminUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await this.db.query(
        'SELECT COUNT(*) FROM admin_users WHERE is_active = true'
      );
      const total = parseInt(countResult.rows[0].count);

      // Get admins
      const result = await this.db.query(
        `SELECT id, email, first_name, last_name, first_name_ar, last_name_ar,
                role, is_active, mfa_enabled, last_login_at, created_at, updated_at
         FROM admin_users 
         WHERE is_active = true
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return {
        admins: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting all admins', error as Error);
      throw error;
    }
  }

  /**
   * Deactivate admin (soft delete)
   */
  async deactivateAdmin(id: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE admin_users 
         SET is_active = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );

      logger.info('Admin deactivated', { adminId: id });
    } catch (error) {
      logger.error('Error deactivating admin', error as Error, { adminId: id });
      throw error;
    }
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(): Promise<{
    total_admins: number;
    active_admins: number;
    locked_admins: number;
    mfa_enabled: number;
    by_role: Record<string, number>;
  }> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_admins,
          COUNT(*) FILTER (WHERE is_active = true) as active_admins,
          COUNT(*) FILTER (WHERE is_locked = true) as locked_admins,
          COUNT(*) FILTER (WHERE mfa_enabled = true) as mfa_enabled,
          json_object_agg(role, role_count) FILTER (WHERE role IS NOT NULL) as by_role
        FROM admin_users
        LEFT JOIN (
          SELECT role, COUNT(*) as role_count
          FROM admin_users
          WHERE is_active = true
          GROUP BY role
        ) role_counts USING (role)
      `);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting admin stats', error as Error);
      throw error;
    }
  }
}