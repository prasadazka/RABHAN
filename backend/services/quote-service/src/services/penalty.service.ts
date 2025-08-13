import { database } from '../config/database.config';
import { logger, auditLogger, performanceLogger } from '../utils/logger';
import { NotFoundError, BusinessRuleError, ConflictError, handleDatabaseError } from '../middleware/error.middleware';
import { walletService } from './wallet.service';

export interface PenaltyRule {
  id: string;
  penalty_type: 'late_installation' | 'quality_issue' | 'communication_failure' | 'documentation_issue' | 'custom';
  description: string;
  amount_calculation: 'fixed' | 'percentage' | 'daily';
  amount_value: number;
  maximum_amount?: number;
  grace_period_hours?: number;
  is_active: boolean;
  severity_level: 'minor' | 'moderate' | 'major' | 'critical';
}

export interface PenaltyInstance {
  id: string;
  contractor_id: string;
  quote_id: string;
  penalty_rule_id: string;
  penalty_type: string;
  description: string;
  amount: number;
  status: 'pending' | 'applied' | 'disputed' | 'waived' | 'reversed';
  applied_at?: Date;
  applied_by?: string;
  dispute_reason?: string;
  resolution_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PenaltyApplication {
  contractor_id: string;
  quote_id: string;
  penalty_type: 'late_installation' | 'quality_issue' | 'communication_failure' | 'documentation_issue' | 'custom';
  description: string;
  custom_amount?: number;
  evidence?: any;
  applied_by: string;
}

export interface SLAViolation {
  quote_id: string;
  contractor_id: string;
  violation_type: string;
  violation_date: Date;
  days_overdue?: number;
  severity_level: string;
  auto_detected: boolean;
}

export class PenaltyService {
  
  /**
   * Get penalty rules configuration
   */
  async getPenaltyRules(): Promise<PenaltyRule[]> {
    const timer = performanceLogger.startTimer('get_penalty_rules');
    
    try {
      const query = `
        SELECT * FROM penalty_rules 
        WHERE is_active = true 
        ORDER BY penalty_type, severity_level
      `;
      
      const result = await database.query(query);
      const rules = result.rows.map(row => this.formatPenaltyRule(row));
      
      logger.debug('Penalty rules retrieved', {
        count: rules.length
      });
      
      return rules;
      
    } catch (error) {
      logger.error('Failed to get penalty rules', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end();
    }
  }
  
  /**
   * Apply penalty to contractor
   */
  async applyPenalty(penaltyApplication: PenaltyApplication): Promise<PenaltyInstance> {
    const timer = performanceLogger.startTimer('apply_penalty');
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      const { contractor_id, quote_id, penalty_type, description, custom_amount, applied_by } = penaltyApplication;
      
      // Verify quote and contractor exist
      const quoteQuery = `
        SELECT cq.*, qr.user_id
        FROM contractor_quotes cq
        JOIN quote_requests qr ON cq.request_id = qr.id
        WHERE cq.id = $1 AND cq.contractor_id = $2
      `;
      
      const quoteResult = await client.query(quoteQuery, [quote_id, contractor_id]);
      
      if (quoteResult.rows.length === 0) {
        throw new NotFoundError('Quote not found or not associated with contractor');
      }
      
      const quote = quoteResult.rows[0];
      
      // Get penalty rule
      const ruleQuery = `
        SELECT * FROM penalty_rules 
        WHERE penalty_type = $1 AND is_active = true 
        ORDER BY severity_level DESC 
        LIMIT 1
      `;
      
      const ruleResult = await client.query(ruleQuery, [penalty_type]);
      
      if (ruleResult.rows.length === 0) {
        throw new BusinessRuleError(`No active penalty rule found for type: ${penalty_type}`, 'NO_PENALTY_RULE');
      }
      
      const rule = ruleResult.rows[0];
      
      // Calculate penalty amount
      let penaltyAmount = custom_amount || this.calculatePenaltyAmount(rule, quote);
      
      // Check for existing penalties for the same violation
      const existingPenaltyQuery = `
        SELECT id FROM penalty_instances 
        WHERE contractor_id = $1 AND quote_id = $2 AND penalty_type = $3 
        AND status NOT IN ('reversed', 'waived')
      `;
      
      const existingResult = await client.query(existingPenaltyQuery, [
        contractor_id, quote_id, penalty_type
      ]);
      
      if (existingResult.rows.length > 0) {
        throw new ConflictError(`Penalty already exists for this quote and violation type`);
      }
      
      // Create penalty instance
      const createPenaltyQuery = `
        INSERT INTO penalty_instances (
          contractor_id, quote_id, penalty_rule_id, penalty_type,
          description, amount, status, applied_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
        RETURNING *
      `;
      
      const penaltyResult = await client.query(createPenaltyQuery, [
        contractor_id, quote_id, rule.id, penalty_type,
        description, penaltyAmount, applied_by
      ]);
      
      const penalty = penaltyResult.rows[0];
      
      // Apply penalty to contractor wallet
      try {
        await walletService.processPenalty(
          contractor_id,
          penaltyAmount,
          description,
          penalty.id
        );
        
        // Update penalty status to applied
        await client.query(`
          UPDATE penalty_instances 
          SET status = 'applied', applied_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [penalty.id]);
        
        penalty.status = 'applied';
        penalty.applied_at = new Date();
        
      } catch (walletError) {
        // If wallet penalty fails, mark penalty as pending
        logger.warn('Wallet penalty application failed, keeping penalty as pending', {
          penalty_id: penalty.id,
          contractor_id,
          error: walletError instanceof Error ? walletError.message : 'Unknown error'
        });
      }
      
      await client.query('COMMIT');
      
      // Audit log
      auditLogger.financial('PENALTY_APPLIED', {
        penalty_id: penalty.id,
        contractor_id: contractor_id,
        quote_id: quote_id,
        penalty_type: penalty_type,
        penalty_amount: penaltyAmount,
        applied_by: applied_by,
        quote_base_price: parseFloat(quote.base_price),
        user_id: quote.user_id
      });
      
      logger.info('Penalty applied successfully', {
        penalty_id: penalty.id,
        contractor_id,
        penalty_type,
        amount: penaltyAmount
      });
      
      return this.formatPenaltyInstance(penalty);
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error instanceof NotFoundError || error instanceof BusinessRuleError || error instanceof ConflictError) {
        throw error;
      }
      
      logger.error('Failed to apply penalty', {
        contractor_id: penaltyApplication.contractor_id,
        quote_id: penaltyApplication.quote_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      client.release();
      timer.end({ contractor_id: penaltyApplication.contractor_id });
    }
  }
  
  /**
   * Get contractor penalties
   */
  async getContractorPenalties(
    contractorId: string,
    filters: {
      status?: string;
      penalty_type?: string;
      start_date?: Date;
      end_date?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ penalties: PenaltyInstance[]; total: number; page: number; limit: number }> {
    const timer = performanceLogger.startTimer('get_contractor_penalties');
    
    try {
      const { page = 1, limit = 20 } = filters;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE pi.contractor_id = $1';
      const queryParams: any[] = [contractorId];
      let paramIndex = 2;
      
      if (filters.status) {
        whereClause += ` AND pi.status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }
      
      if (filters.penalty_type) {
        whereClause += ` AND pi.penalty_type = $${paramIndex}`;
        queryParams.push(filters.penalty_type);
        paramIndex++;
      }
      
      if (filters.start_date) {
        whereClause += ` AND pi.created_at >= $${paramIndex}`;
        queryParams.push(filters.start_date);
        paramIndex++;
      }
      
      if (filters.end_date) {
        whereClause += ` AND pi.created_at <= $${paramIndex}`;
        queryParams.push(filters.end_date);
        paramIndex++;
      }
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM penalty_instances pi ${whereClause}`;
      const countResult = await database.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      // Get penalties
      const penaltiesQuery = `
        SELECT 
          pi.*,
          pr.description as rule_description,
          pr.severity_level,
          cq.base_price as quote_base_price
        FROM penalty_instances pi
        JOIN penalty_rules pr ON pi.penalty_rule_id = pr.id
        LEFT JOIN contractor_quotes cq ON pi.quote_id = cq.id
        ${whereClause}
        ORDER BY pi.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const penaltiesResult = await database.query(penaltiesQuery, queryParams);
      
      const penalties = penaltiesResult.rows.map(row => this.formatPenaltyInstance(row));
      
      logger.debug('Contractor penalties retrieved', {
        contractor_id: contractorId,
        count: penalties.length,
        total,
        page
      });
      
      return { penalties, total, page, limit };
      
    } catch (error) {
      logger.error('Failed to get contractor penalties', {
        contractor_id: contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ contractor_id: contractorId });
    }
  }
  
  /**
   * Dispute penalty
   */
  async disputePenalty(
    penaltyId: string,
    contractorId: string,
    disputeReason: string
  ): Promise<PenaltyInstance> {
    const timer = performanceLogger.startTimer('dispute_penalty');
    
    try {
      // Verify penalty exists and belongs to contractor
      const penaltyQuery = `
        SELECT * FROM penalty_instances 
        WHERE id = $1 AND contractor_id = $2
      `;
      
      const penaltyResult = await database.query(penaltyQuery, [penaltyId, contractorId]);
      
      if (penaltyResult.rows.length === 0) {
        throw new NotFoundError('Penalty not found');
      }
      
      const penalty = penaltyResult.rows[0];
      
      if (penalty.status !== 'applied') {
        throw new BusinessRuleError(
          'Only applied penalties can be disputed',
          'INVALID_PENALTY_STATUS',
          { current_status: penalty.status }
        );
      }
      
      // Update penalty to disputed status
      const updateQuery = `
        UPDATE penalty_instances 
        SET status = 'disputed', dispute_reason = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const updatedResult = await database.query(updateQuery, [disputeReason, penaltyId]);
      const updatedPenalty = updatedResult.rows[0];
      
      // Audit log
      auditLogger.financial('PENALTY_DISPUTED', {
        penalty_id: penaltyId,
        contractor_id: contractorId,
        dispute_reason: disputeReason,
        penalty_amount: parseFloat(penalty.amount),
        original_status: penalty.status
      });
      
      logger.info('Penalty disputed', {
        penalty_id: penaltyId,
        contractor_id: contractorId,
        dispute_reason: disputeReason
      });
      
      return this.formatPenaltyInstance(updatedPenalty);
      
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessRuleError) {
        throw error;
      }
      
      logger.error('Failed to dispute penalty', {
        penalty_id: penaltyId,
        contractor_id: contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ penalty_id: penaltyId });
    }
  }
  
  /**
   * Detect SLA violations automatically
   */
  async detectSLAViolations(): Promise<SLAViolation[]> {
    const timer = performanceLogger.startTimer('detect_sla_violations');
    
    try {
      const violations: SLAViolation[] = [];
      
      // Check for late installations
      const lateInstallationsQuery = `
        SELECT 
          cq.id as quote_id,
          cq.contractor_id,
          cq.installation_timeline_days,
          cq.created_at as quote_date,
          CURRENT_DATE - (cq.created_at::date + INTERVAL '1 day' * cq.installation_timeline_days) as days_overdue
        FROM contractor_quotes cq
        WHERE cq.admin_status = 'approved' 
        AND cq.is_selected = true
        AND CURRENT_DATE > (cq.created_at::date + INTERVAL '1 day' * cq.installation_timeline_days)
        AND NOT EXISTS (
          SELECT 1 FROM penalty_instances pi 
          WHERE pi.quote_id = cq.id 
          AND pi.penalty_type = 'late_installation'
          AND pi.status NOT IN ('reversed', 'waived')
        )
      `;
      
      const lateInstallationsResult = await database.query(lateInstallationsQuery);
      
      for (const row of lateInstallationsResult.rows) {
        const daysOverdue = parseInt(row.days_overdue);
        
        violations.push({
          quote_id: row.quote_id,
          contractor_id: row.contractor_id,
          violation_type: 'late_installation',
          violation_date: new Date(),
          days_overdue: daysOverdue,
          severity_level: this.determineSeverityLevel('late_installation', daysOverdue),
          auto_detected: true
        });
      }
      
      logger.info('SLA violations detected', {
        violations_count: violations.length,
        late_installations: violations.filter(v => v.violation_type === 'late_installation').length
      });
      
      return violations;
      
    } catch (error) {
      logger.error('Failed to detect SLA violations', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end();
    }
  }
  
  /**
   * Process automatic penalties for detected violations
   */
  async processAutomaticPenalties(violations: SLAViolation[]): Promise<PenaltyInstance[]> {
    const timer = performanceLogger.startTimer('process_automatic_penalties');
    
    try {
      const appliedPenalties: PenaltyInstance[] = [];
      
      for (const violation of violations) {
        try {
          const penaltyApplication: PenaltyApplication = {
            contractor_id: violation.contractor_id,
            quote_id: violation.quote_id,
            penalty_type: violation.violation_type as any,
            description: this.generateAutomaticPenaltyDescription(violation),
            applied_by: 'SYSTEM_AUTO'
          };
          
          const appliedPenalty = await this.applyPenalty(penaltyApplication);
          appliedPenalties.push(appliedPenalty);
          
        } catch (error) {
          logger.warn('Failed to apply automatic penalty', {
            quote_id: violation.quote_id,
            contractor_id: violation.contractor_id,
            violation_type: violation.violation_type,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      logger.info('Automatic penalties processed', {
        violations_processed: violations.length,
        penalties_applied: appliedPenalties.length
      });
      
      return appliedPenalties;
      
    } catch (error) {
      logger.error('Failed to process automatic penalties', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end();
    }
  }
  
  // Private helper methods
  
  private calculatePenaltyAmount(rule: any, quote: any): number {
    const basePrice = parseFloat(quote.base_price);
    
    switch (rule.amount_calculation) {
      case 'fixed':
        return parseFloat(rule.amount_value);
        
      case 'percentage':
        const percentageAmount = basePrice * (parseFloat(rule.amount_value) / 100);
        return rule.maximum_amount ? Math.min(percentageAmount, parseFloat(rule.maximum_amount)) : percentageAmount;
        
      case 'daily':
        // This would require additional logic to calculate days
        return parseFloat(rule.amount_value);
        
      default:
        return parseFloat(rule.amount_value);
    }
  }
  
  private determineSeverityLevel(violationType: string, daysOverdue?: number): string {
    switch (violationType) {
      case 'late_installation':
        if (!daysOverdue) return 'minor';
        if (daysOverdue <= 3) return 'minor';
        if (daysOverdue <= 7) return 'moderate';
        if (daysOverdue <= 14) return 'major';
        return 'critical';
        
      default:
        return 'moderate';
    }
  }
  
  private generateAutomaticPenaltyDescription(violation: SLAViolation): string {
    switch (violation.violation_type) {
      case 'late_installation':
        return `Installation overdue by ${violation.days_overdue} days. Expected completion exceeded.`;
        
      default:
        return `SLA violation detected: ${violation.violation_type}`;
    }
  }
  
  private formatPenaltyRule(row: any): PenaltyRule {
    return {
      id: row.id,
      penalty_type: row.penalty_type,
      description: row.description,
      amount_calculation: row.amount_calculation,
      amount_value: parseFloat(row.amount_value),
      maximum_amount: row.maximum_amount ? parseFloat(row.maximum_amount) : undefined,
      grace_period_hours: row.grace_period_hours,
      is_active: row.is_active,
      severity_level: row.severity_level
    };
  }
  
  private formatPenaltyInstance(row: any): PenaltyInstance {
    return {
      id: row.id,
      contractor_id: row.contractor_id,
      quote_id: row.quote_id,
      penalty_rule_id: row.penalty_rule_id,
      penalty_type: row.penalty_type,
      description: row.description,
      amount: parseFloat(row.amount),
      status: row.status,
      applied_at: row.applied_at,
      applied_by: row.applied_by,
      dispute_reason: row.dispute_reason,
      resolution_notes: row.resolution_notes,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export const penaltyService = new PenaltyService();