import { Response } from 'express';
import { adminService, QuoteApprovalData } from '../services/admin.service';
import { logger, auditLogger, performanceLogger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { handleDatabaseError } from '../middleware/error.middleware';

export class AdminController {
  
  /**
   * Get admin dashboard overview
   */
  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('admin_dashboard_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const dashboardData = await adminService.getAdminDashboard();
      
      auditLogger.security('ADMIN_DASHBOARD_ACCESSED', {
        admin_id: adminId,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        data: dashboardData
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get admin dashboard'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Get all quotes (with optional filters for admin dashboard)
   */
  async getAllQuotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('get_all_quotes_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as string,
        search: req.query.search as string,
        sort_by: req.query.sort_by as string || 'created_at',
        sort_order: req.query.sort_order as string || 'desc',
        contractor_id: req.query.contractor_id as string,
        min_amount: req.query.min_amount ? parseFloat(req.query.min_amount as string) : undefined,
        max_amount: req.query.max_amount ? parseFloat(req.query.max_amount as string) : undefined
      };
      
      const result = await adminService.getAllQuotes(filters);
      
      logger.debug('All quotes retrieved by admin', {
        admin_id: adminId,
        count: result.quotes.length,
        page: filters.page,
        status: filters.status
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      logger.error('Error retrieving all quotes for admin', {
        error: error.message,
        stack: error.stack,
        admin_id: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve quotes',
        error: error.message
      });
    } finally {
      timer.end();
    }
  }

  /**
   * Get quotes pending approval
   */
  async getPendingQuotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('get_pending_quotes_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sort_by: req.query.sort_by as string || 'created_at',
        sort_order: req.query.sort_order as string || 'desc',
        contractor_id: req.query.contractor_id as string,
        min_amount: req.query.min_amount ? parseFloat(req.query.min_amount as string) : undefined,
        max_amount: req.query.max_amount ? parseFloat(req.query.max_amount as string) : undefined
      };
      
      const result = await adminService.getPendingQuotes(filters);
      
      logger.debug('Pending quotes retrieved by admin', {
        admin_id: adminId,
        count: result.quotes.length,
        page: filters.page
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get pending quotes'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Approve or reject a quote
   */
  async processQuoteApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('process_quote_approval_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const { quoteId } = req.params;
      const approvalData: QuoteApprovalData = {
        quote_id: quoteId,
        admin_status: req.body.admin_status,
        admin_notes: req.body.admin_notes,
        rejection_reason: req.body.rejection_reason
      };
      
      // Validate required fields
      if (!approvalData.admin_status || !['approved', 'rejected'].includes(approvalData.admin_status)) {
        res.status(400).json({ 
          error: 'Invalid admin_status. Must be "approved" or "rejected"' 
        });
        return;
      }
      
      if (approvalData.admin_status === 'rejected' && !approvalData.rejection_reason) {
        res.status(400).json({ 
          error: 'rejection_reason is required when rejecting a quote' 
        });
        return;
      }
      
      const processedQuote = await adminService.processQuoteApproval(adminId, approvalData);
      
      logger.info('Quote approval processed', {
        admin_id: adminId,
        quote_id: quoteId,
        status: approvalData.admin_status
      });
      
      res.status(200).json({
        success: true,
        message: `Quote ${approvalData.admin_status} successfully`,
        data: processedQuote
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to process quote approval'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Get contractor management data
   */
  async getContractorManagement(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('contractor_management_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const contractorId = req.params.contractorId;
      const contractorData = await adminService.getContractorManagement(contractorId);
      
      logger.debug('Contractor management data accessed', {
        admin_id: adminId,
        contractor_id: contractorId,
        results_count: contractorData.length
      });
      
      res.status(200).json({
        success: true,
        data: contractorData
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get contractor management data'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Approve withdrawal request
   */
  async approveWithdrawal(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('approve_withdrawal_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const { transactionId } = req.params;
      const { admin_notes } = req.body;
      
      if (!transactionId) {
        res.status(400).json({ error: 'Transaction ID is required' });
        return;
      }
      
      const result = await adminService.approveWithdrawal(adminId, transactionId, admin_notes);
      
      logger.info('Withdrawal approved by admin', {
        admin_id: adminId,
        transaction_id: transactionId,
        contractor_id: result.contractor_id,
        amount: result.amount
      });
      
      res.status(200).json({
        success: true,
        message: 'Withdrawal approved successfully',
        data: result
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to approve withdrawal'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Reject withdrawal request
   */
  async rejectWithdrawal(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('reject_withdrawal_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const { transactionId } = req.params;
      const { rejection_reason } = req.body;
      
      if (!transactionId) {
        res.status(400).json({ error: 'Transaction ID is required' });
        return;
      }
      
      if (!rejection_reason) {
        res.status(400).json({ error: 'Rejection reason is required' });
        return;
      }
      
      // This would need to be implemented in admin service
      // For now, we'll create a basic implementation
      const client = await (adminService as any).database?.getClient();
      
      try {
        await client?.query('BEGIN');
        
        // Update transaction status
        const updateQuery = `
          UPDATE wallet_transactions
          SET 
            status = 'rejected',
            processed_at = CURRENT_TIMESTAMP,
            internal_notes = $1
          WHERE id = $2 AND status = 'pending'
          RETURNING *
        `;
        
        const updateResult = await client?.query(updateQuery, [
          `Rejected by admin ${adminId}: ${rejection_reason}`,
          transactionId
        ]);
        
        if (!updateResult || updateResult.rows.length === 0) {
          res.status(404).json({ error: 'Withdrawal request not found or already processed' });
          return;
        }
        
        const transaction = updateResult.rows[0];
        const withdrawalAmount = parseFloat(transaction.amount);
        
        // Return amount to current balance
        await client?.query(`
          UPDATE contractor_wallets
          SET 
            current_balance = current_balance + $1,
            pending_balance = pending_balance - $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [withdrawalAmount, transaction.wallet_id]);
        
        await client?.query('COMMIT');
        
        auditLogger.financial('WITHDRAWAL_REJECTED', {
          admin_id: adminId,
          transaction_id: transactionId,
          withdrawal_amount: withdrawalAmount,
          rejection_reason: rejection_reason
        });
        
        res.status(200).json({
          success: true,
          message: 'Withdrawal rejected successfully',
          data: {
            transaction_id: transactionId,
            status: 'rejected',
            rejection_reason: rejection_reason
          }
        });
        
      } finally {
        client?.release();
      }
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to reject withdrawal'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Get system analytics
   */
  async getSystemAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('system_analytics_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const period = req.query.period as string || 'last_30_days';
      
      const analytics = await adminService.getSystemAnalytics(period);
      
      auditLogger.security('SYSTEM_ANALYTICS_ACCESSED', {
        admin_id: adminId,
        period: period,
        timestamp: new Date().toISOString()
      });
      
      logger.debug('System analytics accessed', {
        admin_id: adminId,
        period: period
      });
      
      res.status(200).json({
        success: true,
        data: analytics
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get system analytics'
      });
    } finally {
      timer.end();
    }
  }
  
  /**
   * Get pending withdrawals for admin review
   */
  async getPendingWithdrawals(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('pending_withdrawals_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      const withdrawalsQuery = `
        SELECT 
          wt.id as transaction_id,
          wt.amount,
          wt.description,
          wt.created_at as requested_at,
          wt.reference_id as withdrawal_id,
          cw.contractor_id,
          cw.current_balance,
          cw.pending_balance,
          cw.payment_methods,
          EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - wt.created_at)) as days_pending
        FROM wallet_transactions wt
        JOIN contractor_wallets cw ON wt.wallet_id = cw.id
        WHERE wt.reference_type = 'withdrawal' AND wt.status = 'pending'
        ORDER BY wt.created_at ASC
        LIMIT $1 OFFSET $2
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total
        FROM wallet_transactions wt
        WHERE wt.reference_type = 'withdrawal' AND wt.status = 'pending'
      `;
      
      // Execute queries in parallel
      const [withdrawalsResult, countResult] = await Promise.all([
        (adminService as any).database?.query(withdrawalsQuery, [limit, offset]),
        (adminService as any).database?.query(countQuery)
      ]);
      
      const withdrawals = withdrawalsResult?.rows.map((row: any) => ({
        transaction_id: row.transaction_id,
        withdrawal_id: row.withdrawal_id,
        contractor_id: row.contractor_id,
        amount: parseFloat(row.amount),
        description: row.description,
        requested_at: row.requested_at,
        days_pending: parseInt(row.days_pending),
        contractor_balance: {
          current: parseFloat(row.current_balance),
          pending: parseFloat(row.pending_balance)
        },
        payment_methods: row.payment_methods || []
      })) || [];
      
      const total = parseInt(countResult?.rows[0]?.total || 0);
      
      logger.debug('Pending withdrawals retrieved', {
        admin_id: adminId,
        count: withdrawals.length,
        total,
        page
      });
      
      res.status(200).json({
        success: true,
        data: {
          withdrawals,
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get pending withdrawals'
      });
    } finally {
      timer.end();
    }
  }

  /**
   * Get detailed quotation with line items for admin review
   */
  async getDetailedQuotation(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('get_detailed_quotation_controller');
    
    try {
      const adminId = req.user?.id;
      const { quotationId } = req.params;
      
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const quotation = await adminService.getDetailedQuotationForReview(quotationId);
      
      auditLogger.security('ADMIN_QUOTATION_VIEWED', {
        admin_id: adminId,
        quotation_id: quotationId,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: 'Detailed quotation retrieved successfully',
        data: {
          quotation,
          line_items_count: quotation.line_items?.length || 0
        }
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get detailed quotation'
      });
    } finally {
      timer.end();
    }
  }

  /**
   * Approve or reject detailed quotation
   */
  async reviewDetailedQuotation(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('review_detailed_quotation_controller');
    
    try {
      const adminId = req.user?.id;
      const { quotationId } = req.params;
      const { admin_status, admin_notes, rejection_reason } = req.body;
      
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const result = await adminService.reviewDetailedQuotation(quotationId, {
        admin_status,
        admin_notes,
        rejection_reason,
        reviewed_by: adminId
      });
      
      auditLogger.security('ADMIN_QUOTATION_REVIEWED', {
        admin_id: adminId,
        quotation_id: quotationId,
        decision: admin_status,
        has_notes: !!admin_notes,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: `Quotation ${admin_status} successfully`,
        data: {
          quotation: result,
          next_steps: admin_status === 'approved' ? 
            ['Quotation is now visible to user', 'User can select this quotation'] :
            ['Contractor will be notified of rejection', 'Contractor can submit revised quotation']
        }
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to review quotation'
      });
    } finally {
      timer.end();
    }
  }

  /**
   * Get individual quote details
   */
  async getQuoteDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('get_quote_details_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const { quoteId } = req.params;
      
      // Get quote details by ID
      const quote = await adminService.getQuoteById(quoteId);
      
      if (!quote) {
        res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
        return;
      }
      
      auditLogger.security('QUOTE_DETAILS_ACCESSED', {
        admin_id: adminId,
        quote_id: quoteId,
        timestamp: new Date().toISOString()
      });
      
      logger.debug('Quote details accessed', {
        admin_id: adminId,
        quote_id: quoteId
      });
      
      res.status(200).json({
        success: true,
        data: {
          quote: quote
        }
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get quote details'
      });
    } finally {
      timer.end();
    }
  }

  /**
   * Get quote assignments (contractor assignments for a quote)
   */
  async getQuoteAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('get_quote_assignments_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const { quoteId } = req.params;
      
      // Get contractor assignments for this quote
      const assignments = await adminService.getQuoteAssignments(quoteId);
      
      auditLogger.security('QUOTE_ASSIGNMENTS_ACCESSED', {
        admin_id: adminId,
        quote_id: quoteId,
        timestamp: new Date().toISOString()
      });
      
      logger.debug('Quote assignments accessed', {
        admin_id: adminId,
        quote_id: quoteId,
        assignment_count: assignments.length
      });
      
      res.status(200).json({
        success: true,
        data: {
          assignments: assignments
        }
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get quote assignments'
      });
    } finally {
      timer.end();
    }
  }

  /**
   * Get available contractors for assignment
   */
  async getAvailableContractors(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('get_available_contractors_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const serviceArea = req.query.service_area as string;
      
      const contractors = await adminService.getAvailableContractors(serviceArea);
      
      logger.debug('Available contractors retrieved', {
        admin_id: adminId,
        service_area: serviceArea,
        count: contractors.length
      });
      
      res.status(200).json({
        success: true,
        data: {
          contractors: contractors
        }
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to get available contractors'
      });
    } finally {
      timer.end();
    }
  }

  /**
   * Assign contractors to a quote
   */
  async assignContractorsToQuote(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('assign_contractors_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const { quoteId } = req.params;
      const { contractor_ids } = req.body;
      
      if (!contractor_ids || !Array.isArray(contractor_ids) || contractor_ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'contractor_ids must be a non-empty array'
        });
        return;
      }
      
      const assignments = await adminService.assignContractorsToQuote(quoteId, contractor_ids, adminId);
      
      auditLogger.security('CONTRACTORS_ASSIGNED', {
        admin_id: adminId,
        quote_id: quoteId,
        contractor_count: contractor_ids.length,
        timestamp: new Date().toISOString()
      });
      
      logger.info('Contractors assigned to quote', {
        admin_id: adminId,
        quote_id: quoteId,
        contractor_ids: contractor_ids,
        assignment_count: assignments.length
      });
      
      res.status(200).json({
        success: true,
        message: `${assignments.length} contractors assigned successfully`,
        data: {
          assignments: assignments
        }
      });
      
    } catch (error) {
      const customError = handleDatabaseError(error);
      res.status(customError.statusCode || 500).json({
        success: false,
        message: customError.message || 'Failed to assign contractors'
      });
    } finally {
      timer.end();
    }
  }

  /**
   * Get all quotes with admin-specific contractor assignment data
   */
  async getAdminQuotesWithAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const timer = performanceLogger.startTimer('get_admin_quotes_with_assignments_controller');
    
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized - Admin ID required' });
        return;
      }
      
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as string,
        search: req.query.search as string,
        sort_by: req.query.sort_by as string || 'created_at',
        sort_order: req.query.sort_order as string || 'desc',
        contractor_id: req.query.contractor_id as string,
        min_amount: req.query.min_amount ? parseFloat(req.query.min_amount as string) : undefined,
        max_amount: req.query.max_amount ? parseFloat(req.query.max_amount as string) : undefined
      };
      
      const result = await adminService.getAdminQuotesWithAssignments(filters);
      
      logger.debug('Admin quotes with assignments retrieved', {
        admin_id: adminId,
        count: result.quotes.length,
        page: filters.page,
        status: filters.status
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      logger.error('Error retrieving admin quotes with assignments', {
        error: error.message,
        stack: error.stack,
        admin_id: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve admin quotes with assignments',
        error: error.message
      });
    } finally {
      timer.end();
    }
  }
}

export const adminController = new AdminController();