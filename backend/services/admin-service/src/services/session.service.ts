/**
 * RABHAN Admin Session Service
 * Saudi Arabia's Solar BNPL Platform - Admin Session Management
 * 
 * Features:
 * - Zero-trust session management
 * - Session validation and cleanup
 * - SAMA compliance tracking
 * - Performance optimized for Saudi scale
 */

import { AdminSession, CreateSessionRequest } from '../types/admin.types';
import { DatabaseService } from '../config/database.config';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class SessionService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Create new admin session
   */
  async createSession(sessionData: CreateSessionRequest): Promise<AdminSession> {
    try {
      const result = await this.db.query(
        `INSERT INTO admin_sessions (
          id, admin_id, token_hash, refresh_token_hash, ip_address, 
          user_agent, expires_at, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          sessionData.id,
          sessionData.admin_id,
          sessionData.token_hash,
          sessionData.refresh_token_hash,
          sessionData.ip_address,
          sessionData.user_agent,
          sessionData.expires_at,
          sessionData.is_active
        ]
      );

      logger.info('Admin session created', {
        sessionId: sessionData.id,
        adminId: sessionData.admin_id,
        ipAddress: sessionData.ip_address
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating admin session', error as Error, {
        sessionId: sessionData.id,
        adminId: sessionData.admin_id
      });
      throw error;
    }
  }

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<AdminSession | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM admin_sessions 
         WHERE id = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding session by ID', error as Error, { sessionId: id });
      throw error;
    }
  }

  /**
   * Find active sessions by admin ID
   */
  async findByAdminId(adminId: string): Promise<AdminSession[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM admin_sessions 
         WHERE admin_id = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC`,
        [adminId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error finding sessions by admin ID', error as Error, { adminId });
      throw error;
    }
  }

  /**
   * Validate session and token
   */
  async validateSession(sessionId: string, tokenHash: string): Promise<AdminSession | null> {
    try {
      const result = await this.db.query(
        `SELECT s.*, u.email, u.role, u.is_active as admin_active
         FROM admin_sessions s
         JOIN admin_users u ON s.admin_id = u.id
         WHERE s.id = $1 
           AND s.token_hash = $2
           AND s.is_active = true 
           AND s.expires_at > CURRENT_TIMESTAMP
           AND u.is_active = true
           AND (u.is_locked = false OR u.locked_until < CURRENT_TIMESTAMP)`,
        [sessionId, tokenHash]
      );

      if (result.rows.length > 0) {
        // Update last activity
        await this.updateLastActivity(sessionId);
        return result.rows[0];
      }

      return null;
    } catch (error) {
      logger.error('Error validating session', error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * Update session last activity
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE admin_sessions 
         SET last_activity_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [sessionId]
      );
    } catch (error) {
      logger.error('Error updating session activity', error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * Terminate specific session
   */
  async terminateSession(sessionId: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE admin_sessions 
         SET is_active = false,
             terminated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [sessionId]
      );

      logger.info('Admin session terminated', { sessionId });
    } catch (error) {
      logger.error('Error terminating session', error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * Terminate all sessions for admin
   */
  async terminateAllSessions(adminId: string, exceptSessionId?: string): Promise<number> {
    try {
      let query = `UPDATE admin_sessions 
                   SET is_active = false,
                       terminated_at = CURRENT_TIMESTAMP
                   WHERE admin_id = $1 AND is_active = true`;
      const params = [adminId];

      if (exceptSessionId) {
        query += ` AND id != $2`;
        params.push(exceptSessionId);
      }

      const result = await this.db.query(query, params);

      logger.info('Admin sessions terminated', {
        adminId,
        terminatedCount: result.rowCount,
        exceptSessionId
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error terminating all sessions', error as Error, { adminId });
      throw error;
    }
  }

  /**
   * Refresh session with new token
   */
  async refreshSession(sessionId: string, newTokenHash: string, newRefreshTokenHash: string): Promise<AdminSession | null> {
    try {
      const result = await this.db.query(
        `UPDATE admin_sessions 
         SET token_hash = $2,
             refresh_token_hash = $3,
             expires_at = CURRENT_TIMESTAMP + INTERVAL '8 hours',
             last_activity_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND is_active = true
         RETURNING *`,
        [sessionId, newTokenHash, newRefreshTokenHash]
      );

      if (result.rows.length > 0) {
        logger.info('Admin session refreshed', { sessionId });
        return result.rows[0];
      }

      return null;
    } catch (error) {
      logger.error('Error refreshing session', error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.db.query(
        `UPDATE admin_sessions 
         SET is_active = false,
             terminated_at = CURRENT_TIMESTAMP
         WHERE (expires_at < CURRENT_TIMESTAMP OR last_activity_at < CURRENT_TIMESTAMP - INTERVAL '24 hours')
           AND is_active = true`
      );

      const cleanedCount = result.rowCount || 0;
      if (cleanedCount > 0) {
        logger.info('Expired sessions cleaned up', { cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up expired sessions', error as Error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    total_sessions: number;
    active_sessions: number;
    expired_sessions: number;
    sessions_last_24h: number;
    sessions_by_admin: Record<string, number>;
  }> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(*) FILTER (WHERE is_active = true AND expires_at > CURRENT_TIMESTAMP) as active_sessions,
          COUNT(*) FILTER (WHERE expires_at <= CURRENT_TIMESTAMP) as expired_sessions,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') as sessions_last_24h
        FROM admin_sessions
      `);

      const sessionsByAdmin = await this.db.query(`
        SELECT u.email, COUNT(s.id) as session_count
        FROM admin_sessions s
        JOIN admin_users u ON s.admin_id = u.id
        WHERE s.is_active = true AND s.expires_at > CURRENT_TIMESTAMP
        GROUP BY u.email
        ORDER BY session_count DESC
      `);

      const sessionsByAdminMap: Record<string, number> = {};
      sessionsByAdmin.rows.forEach(row => {
        sessionsByAdminMap[row.email] = parseInt(row.session_count);
      });

      return {
        ...result.rows[0],
        sessions_by_admin: sessionsByAdminMap
      };
    } catch (error) {
      logger.error('Error getting session stats', error as Error);
      throw error;
    }
  }

  /**
   * Get admin session history
   */
  async getSessionHistory(adminId: string, limit: number = 50): Promise<AdminSession[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM admin_sessions 
         WHERE admin_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [adminId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting session history', error as Error, { adminId });
      throw error;
    }
  }

  /**
   * Check for suspicious session activity
   */
  async checkSuspiciousActivity(adminId: string): Promise<{
    multiple_ips: boolean;
    rapid_login_attempts: boolean;
    unusual_user_agents: boolean;
    details: Record<string, any>;
  }> {
    try {
      // Check for multiple IPs in last hour
      const ipCheck = await this.db.query(
        `SELECT COUNT(DISTINCT ip_address) as unique_ips
         FROM admin_sessions 
         WHERE admin_id = $1 
           AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
        [adminId]
      );

      // Check for rapid login attempts
      const rapidCheck = await this.db.query(
        `SELECT COUNT(*) as login_count
         FROM admin_sessions 
         WHERE admin_id = $1 
           AND created_at >= CURRENT_TIMESTAMP - INTERVAL '5 minutes'`,
        [adminId]
      );

      // Check for unusual user agents
      const userAgentCheck = await this.db.query(
        `SELECT COUNT(DISTINCT user_agent) as unique_agents
         FROM admin_sessions 
         WHERE admin_id = $1 
           AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
        [adminId]
      );

      const uniqueIps = parseInt(ipCheck.rows[0].unique_ips);
      const loginCount = parseInt(rapidCheck.rows[0].login_count);
      const uniqueAgents = parseInt(userAgentCheck.rows[0].unique_agents);

      return {
        multiple_ips: uniqueIps > 2,
        rapid_login_attempts: loginCount > 3,
        unusual_user_agents: uniqueAgents > 2,
        details: {
          unique_ips: uniqueIps,
          login_count: loginCount,
          unique_agents: uniqueAgents
        }
      };
    } catch (error) {
      logger.error('Error checking suspicious activity', error as Error, { adminId });
      throw error;
    }
  }
}