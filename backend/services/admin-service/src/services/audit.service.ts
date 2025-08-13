/**
 * RABHAN Audit Service
 * Saudi Arabia's Solar BNPL Platform - SAMA Compliance Audit Service
 * 
 * Features:
 * - SAMA compliance audit logging
 * - Security event tracking
 * - Real-time risk assessment
 * - Performance monitoring
 */

import { SAMAAuditLog, SecurityEventData, RiskLevel } from '../types/admin.types';
import { DatabaseService } from '../config/database.config';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Log security event for SAMA compliance
   */
  async logSecurityEvent(eventData: SecurityEventData): Promise<SAMAAuditLog> {
    try {
      const id = uuidv4();
      const correlationId = uuidv4();
      
      const result = await this.db.query(
        `INSERT INTO sama_audit_logs (
          id, admin_id, event_type, event_action, event_data,
          ip_address, user_agent, risk_level, correlation_id,
          created_at, processing_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10)
        RETURNING *`,
        [
          id,
          eventData.admin_id,
          eventData.event_type,
          eventData.event_action,
          JSON.stringify(eventData.event_data || {}),
          eventData.ip_address,
          eventData.user_agent,
          eventData.risk_level || 'LOW',
          correlationId,
          eventData.processing_time_ms || 0
        ]
      );

      const auditLog = result.rows[0];

      // Log high-risk events immediately
      if (eventData.risk_level === 'HIGH' || eventData.risk_level === 'CRITICAL') {
        logger.security('High-risk security event logged', {
          auditId: id,
          eventType: eventData.event_type,
          eventAction: eventData.event_action,
          adminId: eventData.admin_id,
          riskLevel: eventData.risk_level,
          ipAddress: eventData.ip_address
        });
      }

      return auditLog;
    } catch (error) {
      logger.error('Error logging security event', error as Error, eventData);
      throw error;
    }
  }

  /**
   * Log admin activity for performance monitoring
   */
  async logAdminActivity(
    adminId: string,
    activity: string,
    details: Record<string, any>,
    processingTimeMs?: number
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO admin_activity_metrics (
          admin_id, metric_date, metric_hour, total_actions,
          avg_response_time, accuracy_score, productivity_score,
          activity_details, created_at
        ) VALUES ($1, CURRENT_DATE, EXTRACT(HOUR FROM CURRENT_TIMESTAMP), 1, $2, 100, 100, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (admin_id, metric_date, metric_hour)
        DO UPDATE SET
          total_actions = admin_activity_metrics.total_actions + 1,
          avg_response_time = (admin_activity_metrics.avg_response_time + COALESCE($2, 0)) / 2,
          activity_details = admin_activity_metrics.activity_details || $3,
          updated_at = CURRENT_TIMESTAMP`,
        [adminId, processingTimeMs || 0, JSON.stringify({ [activity]: details })]
      );
    } catch (error) {
      logger.error('Error logging admin activity', error as Error, {
        adminId,
        activity,
        processingTimeMs
      });
      // Don't throw error for activity logging to avoid disrupting main flow
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters: {
    admin_id?: string;
    event_type?: string;
    risk_level?: RiskLevel;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: SAMAAuditLog[];
    total: number;
  }> {
    try {
      let whereConditions = ['1=1'];
      let params: any[] = [];
      let paramIndex = 1;

      if (filters.admin_id) {
        whereConditions.push(`admin_id = $${paramIndex++}`);
        params.push(filters.admin_id);
      }

      if (filters.event_type) {
        whereConditions.push(`event_type = $${paramIndex++}`);
        params.push(filters.event_type);
      }

      if (filters.risk_level) {
        whereConditions.push(`risk_level = $${paramIndex++}`);
        params.push(filters.risk_level);
      }

      if (filters.start_date) {
        whereConditions.push(`created_at >= $${paramIndex++}`);
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        whereConditions.push(`created_at <= $${paramIndex++}`);
        params.push(filters.end_date);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await this.db.query(
        `SELECT COUNT(*) FROM sama_audit_logs WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Get logs
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      params.push(limit, offset);
      const logsResult = await this.db.query(
        `SELECT * FROM sama_audit_logs 
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        params
      );

      return {
        logs: logsResult.rows,
        total
      };
    } catch (error) {
      logger.error('Error getting audit logs', error as Error, filters);
      throw error;
    }
  }

  /**
   * Get security dashboard data
   */
  async getSecurityDashboard(): Promise<{
    total_events_today: number;
    high_risk_events_today: number;
    failed_logins_today: number;
    active_admins_today: number;
    risk_distribution: Record<string, number>;
    recent_events: SAMAAuditLog[];
  }> {
    try {
      const dashboardResult = await this.db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as total_events_today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AND risk_level IN ('HIGH', 'CRITICAL')) as high_risk_events_today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AND event_type = 'LOGIN_FAILED') as failed_logins_today,
          COUNT(DISTINCT admin_id) FILTER (WHERE created_at >= CURRENT_DATE) as active_admins_today
        FROM sama_audit_logs
      `);

      const riskDistResult = await this.db.query(`
        SELECT risk_level, COUNT(*) as count
        FROM sama_audit_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY risk_level
      `);

      const recentEventsResult = await this.db.query(`
        SELECT s.*, u.email as admin_email
        FROM sama_audit_logs s
        LEFT JOIN admin_users u ON s.admin_id = u.id
        WHERE s.created_at >= CURRENT_DATE - INTERVAL '1 hour'
        ORDER BY s.created_at DESC
        LIMIT 10
      `);

      const riskDistribution: Record<string, number> = {};
      riskDistResult.rows.forEach(row => {
        riskDistribution[row.risk_level] = parseInt(row.count);
      });

      return {
        ...dashboardResult.rows[0],
        risk_distribution: riskDistribution,
        recent_events: recentEventsResult.rows
      };
    } catch (error) {
      logger.error('Error getting security dashboard', error as Error);
      throw error;
    }
  }

  /**
   * Generate SAMA compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    period: { start: Date; end: Date };
    summary: {
      total_events: number;
      security_events: number;
      admin_activities: number;
      high_risk_events: number;
      compliance_score: number;
    };
    event_breakdown: Record<string, number>;
    risk_analysis: Record<string, number>;
    admin_activity_summary: Record<string, number>;
    recommendations: string[];
  }> {
    try {
      // Summary statistics
      const summaryResult = await this.db.query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE event_type LIKE '%LOGIN%' OR event_type LIKE '%SECURITY%') as security_events,
          COUNT(*) FILTER (WHERE risk_level IN ('HIGH', 'CRITICAL')) as high_risk_events
        FROM sama_audit_logs
        WHERE created_at BETWEEN $1 AND $2
      `, [startDate, endDate]);

      // Event breakdown
      const eventBreakdownResult = await this.db.query(`
        SELECT event_type, COUNT(*) as count
        FROM sama_audit_logs
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY event_type
        ORDER BY count DESC
      `, [startDate, endDate]);

      // Risk analysis
      const riskAnalysisResult = await this.db.query(`
        SELECT risk_level, COUNT(*) as count
        FROM sama_audit_logs
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY risk_level
      `, [startDate, endDate]);

      // Admin activity
      const activityResult = await this.db.query(`
        SELECT u.email, COUNT(s.id) as activity_count
        FROM sama_audit_logs s
        LEFT JOIN admin_users u ON s.admin_id = u.id
        WHERE s.created_at BETWEEN $1 AND $2
        GROUP BY u.email
        ORDER BY activity_count DESC
      `, [startDate, endDate]);

      const summary = summaryResult.rows[0];
      const eventBreakdown: Record<string, number> = {};
      const riskAnalysis: Record<string, number> = {};
      const adminActivitySummary: Record<string, number> = {};

      eventBreakdownResult.rows.forEach(row => {
        eventBreakdown[row.event_type] = parseInt(row.count);
      });

      riskAnalysisResult.rows.forEach(row => {
        riskAnalysis[row.risk_level] = parseInt(row.count);
      });

      activityResult.rows.forEach(row => {
        adminActivitySummary[row.email || 'Unknown'] = parseInt(row.activity_count);
      });

      // Calculate compliance score (simplified)
      const totalEvents = parseInt(summary.total_events);
      const highRiskEvents = parseInt(summary.high_risk_events);
      const complianceScore = totalEvents > 0 ? Math.max(0, 100 - (highRiskEvents / totalEvents * 100)) : 100;

      // Generate recommendations
      const recommendations: string[] = [];
      if (highRiskEvents > totalEvents * 0.1) {
        recommendations.push('High number of high-risk events detected. Review security policies.');
      }
      if (riskAnalysis['CRITICAL'] > 0) {
        recommendations.push('Critical security events require immediate attention.');
      }
      if (complianceScore < 90) {
        recommendations.push('Compliance score below 90%. Implement additional security measures.');
      }

      return {
        period: { start: startDate, end: endDate },
        summary: {
          ...summary,
          admin_activities: Object.values(adminActivitySummary).reduce((a, b) => a + b, 0),
          compliance_score: Math.round(complianceScore)
        },
        event_breakdown: eventBreakdown,
        risk_analysis: riskAnalysis,
        admin_activity_summary: adminActivitySummary,
        recommendations
      };
    } catch (error) {
      logger.error('Error generating compliance report', error as Error, { startDate, endDate });
      throw error;
    }
  }

  /**
   * Check for suspicious patterns
   */
  async detectSuspiciousPatterns(): Promise<{
    patterns: Array<{
      type: string;
      description: string;
      severity: RiskLevel;
      data: Record<string, any>;
    }>;
  }> {
    try {
      const patterns = [];

      // Check for multiple failed logins from same IP
      const failedLoginsResult = await this.db.query(`
        SELECT ip_address, COUNT(*) as failed_count
        FROM sama_audit_logs
        WHERE event_type = 'LOGIN_FAILED' 
          AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
        GROUP BY ip_address
        HAVING COUNT(*) >= 5
      `);

      failedLoginsResult.rows.forEach(row => {
        patterns.push({
          type: 'MULTIPLE_FAILED_LOGINS',
          description: `Multiple failed login attempts from IP ${row.ip_address}`,
          severity: 'HIGH' as RiskLevel,
          data: { ip_address: row.ip_address, failed_count: row.failed_count }
        });
      });

      // Check for unusual activity patterns
      const unusualActivityResult = await this.db.query(`
        SELECT admin_id, COUNT(*) as activity_count
        FROM sama_audit_logs
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
        GROUP BY admin_id
        HAVING COUNT(*) > 100
      `);

      unusualActivityResult.rows.forEach(row => {
        patterns.push({
          type: 'UNUSUAL_ACTIVITY_VOLUME',
          description: `Unusually high activity from admin ${row.admin_id}`,
          severity: 'MEDIUM' as RiskLevel,
          data: { admin_id: row.admin_id, activity_count: row.activity_count }
        });
      });

      return { patterns };
    } catch (error) {
      logger.error('Error detecting suspicious patterns', error as Error);
      throw error;
    }
  }

  /**
   * Archive old audit logs (SAMA requires 7 years retention)
   */
  async archiveOldLogs(beforeDate: Date): Promise<number> {
    try {
      // In a real implementation, this would move logs to archive storage
      // For now, we'll just mark them as archived
      const result = await this.db.query(`
        UPDATE sama_audit_logs 
        SET event_data = event_data || '{"archived": true}'
        WHERE created_at < $1
          AND NOT (event_data->>'archived')::boolean
      `, [beforeDate]);

      const archivedCount = result.rowCount || 0;
      logger.info('Audit logs archived', { archivedCount, beforeDate });

      return archivedCount;
    } catch (error) {
      logger.error('Error archiving audit logs', error as Error, { beforeDate });
      throw error;
    }
  }
}