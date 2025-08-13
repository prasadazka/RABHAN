import { Response } from 'express';
import { penaltyService, PenaltyApplication } from '../services/penalty.service';
import { penaltySchedulerService } from '../services/penalty-scheduler.service';
import { logger, auditLogger, performanceLogger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { handleDatabaseError } from '../middleware/error.middleware';
import { database } from '../config/database.config';

export class PenaltyController {
  
  /**
   * Get penalty rules (Admin only)
   */
  async getPenaltyRules(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('get_penalty_rules_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const rules = await penaltyService.getPenaltyRules();
      
      logger.debug('Penalty rules retrieved by admin', {
        admin_id: adminId,
        rules_count: rules.length
      });
      
      res.status(200).json({
        success: true,
        data: rules
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get penalty rules'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Apply penalty to contractor (Admin only)
   */
  async applyPenalty(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('apply_penalty_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const penaltyApplication: PenaltyApplication = {
        contractor_id: req.body.contractor_id,
        quote_id: req.body.quote_id,
        penalty_type: req.body.penalty_type,
        description: req.body.description,
        custom_amount: req.body.custom_amount,
        evidence: req.body.evidence,
        applied_by: adminId
      };
      
      // Validate required fields
      if (!penaltyApplication.contractor_id || !penaltyApplication.quote_id || 
          !penaltyApplication.penalty_type || !penaltyApplication.description) {
        res.status(400).json({
          error: 'Missing required fields: contractor_id, quote_id, penalty_type, description'
        });
        return;
      }
      
      const penalty = await penaltyService.applyPenalty(penaltyApplication);
      
      auditLogger.financial('ADMIN_PENALTY_APPLIED', {
        admin_id: adminId,
        penalty_id: penalty.id,
        contractor_id: penaltyApplication.contractor_id,
        penalty_type: penaltyApplication.penalty_type,
        amount: penalty.amount
      });
      
      logger.info('Penalty applied by admin', {
        admin_id: adminId,
        penalty_id: penalty.id,
        contractor_id: penaltyApplication.contractor_id,
        penalty_type: penaltyApplication.penalty_type
      });
      
      res.status(201).json({
        success: true,
        message: 'Penalty applied successfully',
        data: penalty
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to apply penalty'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Get contractor penalties (Contractor can see own, Admin can see all)
   */
  async getContractorPenalties(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('get_contractor_penalties_controller');
    
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized - User ID required' });
        return;
      }
      
      let contractorId = req.params.contractorId;
      
      // If contractor is requesting, they can only see their own penalties
      if (userRole === 'contractor') {
        contractorId = userId; // Override with their own ID
      } else if (userRole !== 'admin') {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      
      const filters = {
        status: req.query.status as string,
        penalty_type: req.query.penalty_type as string,
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };
      
      const result = await penaltyService.getContractorPenalties(contractorId, filters);
      
      logger.debug('Contractor penalties retrieved', {
        requester_id: userId,
        requester_role: userRole,
        contractor_id: contractorId,
        count: result.penalties.length
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get contractor penalties'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Dispute penalty (Contractor only for their own penalties)
   */
  async disputePenalty(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('dispute_penalty_controller');
    
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized - User ID required' });
        return;
      }
      
      if (userRole !== 'contractor') {
        res.status(403).json({ error: 'Only contractors can dispute penalties' });
        return;
      }
      
      const { penaltyId } = req.params;
      const { dispute_reason } = req.body;
      
      if (!dispute_reason || dispute_reason.length < 10) {
        res.status(400).json({
          error: 'Dispute reason is required and must be at least 10 characters long'
        });
        return;
      }
      
      const disputedPenalty = await penaltyService.disputePenalty(
        penaltyId,
        userId, // contractor_id is the user's ID
        dispute_reason
      );
      
      auditLogger.financial('PENALTY_DISPUTED_BY_CONTRACTOR', {
        contractor_id: userId,
        penalty_id: penaltyId,
        dispute_reason: dispute_reason,
        penalty_amount: disputedPenalty.amount
      });
      
      logger.info('Penalty disputed by contractor', {
        contractor_id: userId,
        penalty_id: penaltyId
      });
      
      res.status(200).json({
        success: true,
        message: 'Penalty disputed successfully. It will be reviewed by admin.',
        data: disputedPenalty
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to dispute penalty'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Resolve penalty dispute (Admin only)
   */
  async resolvePenaltyDispute(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('resolve_penalty_dispute_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId || req.user?.role !== 'admin') {
        res.status(401).json({ error: 'Unauthorized - Admin access required' });
        return;
      }
      
      const { penaltyId } = req.params;
      const { resolution, resolution_notes } = req.body;
      
      if (!resolution || !['uphold', 'waive', 'modify'].includes(resolution)) {
        res.status(400).json({
          error: 'Resolution must be one of: uphold, waive, modify'
        });
        return;
      }
      
      if (!resolution_notes || resolution_notes.length < 10) {
        res.status(400).json({
          error: 'Resolution notes are required and must be at least 10 characters long'
        });
        return;
      }
      
      // Update penalty resolution
      const client = await database.getClient();
      
      try {
        let newStatus = 'applied'; // Default for uphold
        if (resolution === 'waive') newStatus = 'waived';
        if (resolution === 'modify') newStatus = 'applied'; // Modified penalty stays applied
        
        const updateQuery = `
          UPDATE penalty_instances 
          SET status = $1, resolution_notes = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3 AND status = 'disputed'
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, [newStatus, resolution_notes, penaltyId]);
        
        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Disputed penalty not found' });
          return;
        }
        
        const resolvedPenalty = result.rows[0];
        
        // If waiving penalty, reverse the wallet transaction
        if (resolution === 'waive') {
          // This would need integration with wallet service to reverse the transaction
          logger.info('Penalty waived - wallet transaction should be reversed', {
            penalty_id: penaltyId,
            contractor_id: resolvedPenalty.contractor_id
          });
        }
        
        auditLogger.financial('PENALTY_DISPUTE_RESOLVED', {
          admin_id: adminId,
          penalty_id: penaltyId,
          contractor_id: resolvedPenalty.contractor_id,
          resolution: resolution,
          resolution_notes: resolution_notes,
          penalty_amount: parseFloat(resolvedPenalty.amount)
        });
        
        logger.info('Penalty dispute resolved', {
          admin_id: adminId,
          penalty_id: penaltyId,
          resolution: resolution
        });
        
        res.status(200).json({
          success: true,
          message: `Penalty dispute ${resolution === 'uphold' ? 'upheld' : resolution === 'waive' ? 'waived' : 'modified'}`,
          data: {
            id: resolvedPenalty.id,
            status: resolvedPenalty.status,
            resolution: resolution,
            resolution_notes: resolution_notes,
            resolved_by: adminId,
            resolved_at: new Date()
          }
        });
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to resolve penalty dispute'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Detect SLA violations (Admin only)
   */
  async detectSLAViolations(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('detect_sla_violations_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId || req.user?.role !== 'admin') {
        res.status(401).json({ error: 'Unauthorized - Admin access required' });
        return;
      }
      
      const violations = await penaltyService.detectSLAViolations();
      
      auditLogger.security('SLA_VIOLATIONS_DETECTED', {
        admin_id: adminId,
        violations_count: violations.length,
        timestamp: new Date().toISOString()
      });
      
      logger.info('SLA violations detected by admin', {
        admin_id: adminId,
        violations_count: violations.length
      });
      
      res.status(200).json({
        success: true,
        message: `Found ${violations.length} SLA violations`,
        data: {
          violations: violations,
          summary: {
            total_violations: violations.length,
            late_installations: violations.filter(v => v.violation_type === 'late_installation').length,
            auto_detected: violations.filter(v => v.auto_detected).length
          }
        }
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to detect SLA violations'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Process automatic penalties (Admin only)
   */
  async processAutomaticPenalties(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('process_automatic_penalties_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId || req.user?.role !== 'admin') {
        res.status(401).json({ error: 'Unauthorized - Admin access required' });
        return;
      }
      
      // First detect violations
      const violations = await penaltyService.detectSLAViolations();
      
      if (violations.length === 0) {
        res.status(200).json({
          success: true,
          message: 'No SLA violations detected',
          data: {
            violations_detected: 0,
            penalties_applied: 0
          }
        });
        return;
      }
      
      // Process automatic penalties
      const appliedPenalties = await penaltyService.processAutomaticPenalties(violations);
      
      auditLogger.financial('AUTOMATIC_PENALTIES_PROCESSED', {
        admin_id: adminId,
        violations_detected: violations.length,
        penalties_applied: appliedPenalties.length,
        timestamp: new Date().toISOString()
      });
      
      logger.info('Automatic penalties processed', {
        admin_id: adminId,
        violations_detected: violations.length,
        penalties_applied: appliedPenalties.length
      });
      
      res.status(200).json({
        success: true,
        message: `Processed ${violations.length} violations, applied ${appliedPenalties.length} penalties`,
        data: {
          violations_detected: violations.length,
          penalties_applied: appliedPenalties.length,
          violations: violations,
          applied_penalties: appliedPenalties
        }
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to process automatic penalties'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Get penalty statistics (Admin only)
   */
  async getPenaltyStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('get_penalty_statistics_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId || req.user?.role !== 'admin') {
        res.status(401).json({ error: 'Unauthorized - Admin access required' });
        return;
      }
      
      const period = req.query.period as string || 'last_30_days';
      let dateFilter = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
      
      switch (period) {
        case 'last_7_days':
          dateFilter = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'last_90_days':
          dateFilter = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
          break;
        case 'this_year':
          dateFilter = "created_at >= DATE_TRUNC('year', CURRENT_DATE)";
          break;
      }
      
      const statsQuery = `
        SELECT 
          COUNT(*) as total_penalties,
          COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied_penalties,
          COUNT(CASE WHEN status = 'disputed' THEN 1 END) as disputed_penalties,
          COUNT(CASE WHEN status = 'waived' THEN 1 END) as waived_penalties,
          SUM(CASE WHEN status = 'applied' THEN amount ELSE 0 END) as total_penalty_amount,
          COUNT(CASE WHEN penalty_type = 'late_installation' THEN 1 END) as late_installation_penalties,
          COUNT(CASE WHEN penalty_type = 'quality_issue' THEN 1 END) as quality_issue_penalties,
          COUNT(CASE WHEN penalty_type = 'communication_failure' THEN 1 END) as communication_penalties,
          AVG(amount) as average_penalty_amount
        FROM penalty_instances 
        WHERE ${dateFilter}
      `;
      
      const statsResult = await database.query(statsQuery);
      const stats = statsResult.rows[0];
      
      const statistics = {
        period: period,
        overview: {
          total_penalties: parseInt(stats.total_penalties || 0),
          applied_penalties: parseInt(stats.applied_penalties || 0),
          disputed_penalties: parseInt(stats.disputed_penalties || 0),
          waived_penalties: parseInt(stats.waived_penalties || 0),
          total_penalty_amount: parseFloat(stats.total_penalty_amount || 0),
          average_penalty_amount: parseFloat(stats.average_penalty_amount || 0)
        },
        by_type: {
          late_installation: parseInt(stats.late_installation_penalties || 0),
          quality_issue: parseInt(stats.quality_issue_penalties || 0),
          communication_failure: parseInt(stats.communication_penalties || 0)
        },
        rates: {
          dispute_rate: stats.total_penalties > 0 ? 
            (parseInt(stats.disputed_penalties || 0) / parseInt(stats.total_penalties)) * 100 : 0,
          waiver_rate: stats.total_penalties > 0 ? 
            (parseInt(stats.waived_penalties || 0) / parseInt(stats.total_penalties)) * 100 : 0
        }
      };
      
      logger.info('Penalty statistics retrieved', {
        admin_id: adminId,
        period: period,
        total_penalties: statistics.overview.total_penalties
      });
      
      res.status(200).json({
        success: true,
        data: statistics
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get penalty statistics'
      });
    } finally {
      timer.end();
    }
  }

  /**
   * Get penalty scheduler status (Admin only)
   */
  async getSchedulerStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('get_scheduler_status_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId || req.user?.role !== 'admin') {
        res.status(401).json({ error: 'Unauthorized - Admin access required' });
        return;
      }
      
      const status = penaltySchedulerService.getStatus();
      
      logger.debug('Penalty scheduler status retrieved', {
        admin_id: adminId,
        scheduler_status: status.isRunning
      });
      
      res.status(200).json({
        success: true,
        data: status
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get scheduler status'
      });
    } finally {
      timer.end();
    }
  }

  /**
   * Trigger manual penalty check (Admin only)
   */
  async triggerManualPenaltyCheck(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('trigger_manual_penalty_check_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId || req.user?.role !== 'admin') {
        res.status(401).json({ error: 'Unauthorized - Admin access required' });
        return;
      }
      
      const result = await penaltySchedulerService.runManualPenaltyCheck();
      
      auditLogger.financial('MANUAL_PENALTY_CHECK_TRIGGERED', {
        admin_id: adminId,
        violations_detected: result.violationsDetected,
        penalties_applied: result.penaltiesApplied,
        timestamp: new Date().toISOString()
      });
      
      logger.info('Manual penalty check triggered by admin', {
        admin_id: adminId,
        result: result
      });
      
      res.status(200).json({
        success: true,
        message: `Manual penalty check completed. Found ${result.violationsDetected} violations, applied ${result.penaltiesApplied} penalties.`,
        data: result
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to trigger manual penalty check'
      });
    } finally {
      timer.end();
    }
  }
}

export const penaltyController = new PenaltyController();