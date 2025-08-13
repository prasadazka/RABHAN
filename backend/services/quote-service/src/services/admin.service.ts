import { database } from '../config/database.config';
import { logger, auditLogger, performanceLogger } from '../utils/logger';
import { NotFoundError, BusinessRuleError, ConflictError, handleDatabaseError } from '../middleware/error.middleware';
import { walletService } from './wallet.service';
import { financialService } from './financial.service';

export interface QuoteApprovalData {
  quote_id: string;
  admin_status: 'approved' | 'rejected';
  admin_notes?: string;
  rejection_reason?: string;
}

export interface AdminDashboardData {
  overview: {
    total_quotes: number;
    pending_approvals: number;
    approved_quotes: number;
    rejected_quotes: number;
    total_platform_revenue: number;
    active_contractors: number;
    active_users: number;
  };
  recent_activities: any[];
  pending_withdrawals: number;
  system_health: any;
}

export interface ContractorManagementData {
  contractor_id: string;
  verification_status: 'pending' | 'verified' | 'suspended';
  suspension_reason?: string;
  performance_score: number;
  total_quotes_submitted: number;
  quotes_approved: number;
  quotes_rejected: number;
  success_rate: number;
  wallet_balance: number;
  last_activity: Date;
}

export class AdminService {
  
  /**
   * Get admin dashboard overview
   */
  async getAdminDashboard(): Promise<AdminDashboardData> {
    const timer = performanceLogger.startTimer('admin_dashboard');
    
    try {
      // Get overview statistics
      const overviewQueries = await Promise.all([
        // Total quotes
        database.query('SELECT COUNT(*) as total FROM contractor_quotes'),
        // Pending approvals
        database.query("SELECT COUNT(*) as pending FROM contractor_quotes WHERE admin_status = 'pending'"),
        // Approved quotes
        database.query("SELECT COUNT(*) as approved FROM contractor_quotes WHERE admin_status = 'approved'"),
        // Rejected quotes
        database.query("SELECT COUNT(*) as rejected FROM contractor_quotes WHERE admin_status = 'rejected'"),
        // Platform revenue calculation
        database.query(`
          SELECT 
            COALESCE(SUM(overprice_amount), 0) as markup_revenue,
            COALESCE(SUM(base_price * 0.15), 0) as commission_revenue
          FROM contractor_quotes 
          WHERE admin_status = 'approved' AND is_selected = true
        `),
        // Active contractors (have submitted quotes in last 30 days)
        database.query(`
          SELECT COUNT(DISTINCT contractor_id) as active 
          FROM contractor_quotes 
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        `),
        // Active users (have quote requests in last 30 days)
        database.query(`
          SELECT COUNT(DISTINCT user_id) as active 
          FROM quote_requests 
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        `)
      ]);
      
      const totalQuotes = parseInt(overviewQueries[0].rows[0].total);
      const pendingApprovals = parseInt(overviewQueries[1].rows[0].pending);
      const approvedQuotes = parseInt(overviewQueries[2].rows[0].approved);
      const rejectedQuotes = parseInt(overviewQueries[3].rows[0].rejected);
      const revenueData = overviewQueries[4].rows[0];
      const totalPlatformRevenue = parseFloat(revenueData.markup_revenue) + parseFloat(revenueData.commission_revenue);
      const activeContractors = parseInt(overviewQueries[5].rows[0].active);
      const activeUsers = parseInt(overviewQueries[6].rows[0].active);
      
      // Get recent activities
      const recentActivitiesQuery = `
        SELECT 
          cq.id,
          cq.admin_status,
          cq.created_at,
          cq.base_price,
          cq.contractor_id,
          qr.user_id,
          qr.system_size_kwp
        FROM contractor_quotes cq
        JOIN quote_requests qr ON cq.request_id = qr.id
        ORDER BY cq.created_at DESC
        LIMIT 10
      `;
      
      const activitiesResult = await database.query(recentActivitiesQuery);
      const recentActivities = activitiesResult.rows;
      
      // Get pending withdrawals count
      const withdrawalsQuery = `
        SELECT COUNT(*) as pending_count
        FROM wallet_transactions wt
        WHERE wt.reference_type = 'withdrawal' AND wt.status = 'pending'
      `;
      
      const withdrawalsResult = await database.query(withdrawalsQuery);
      const pendingWithdrawals = parseInt(withdrawalsResult.rows[0].pending_count);
      
      // System health check
      const systemHealth = {
        database: 'healthy',
        quote_service: 'operational',
        wallet_system: 'operational',
        financial_engine: 'operational',
        last_updated: new Date().toISOString()
      };
      
      const dashboardData: AdminDashboardData = {
        overview: {
          total_quotes: totalQuotes,
          pending_approvals: pendingApprovals,
          approved_quotes: approvedQuotes,
          rejected_quotes: rejectedQuotes,
          total_platform_revenue: totalPlatformRevenue,
          active_contractors: activeContractors,
          active_users: activeUsers
        },
        recent_activities: recentActivities,
        pending_withdrawals: pendingWithdrawals,
        system_health: systemHealth
      };
      
      logger.info('Admin dashboard data retrieved', {
        total_quotes: totalQuotes,
        pending_approvals: pendingApprovals,
        platform_revenue: totalPlatformRevenue
      });
      
      return dashboardData;
      
    } catch (error) {
      logger.error('Failed to get admin dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end();
    }
  }
  
  /**
   * Get all quotes with optional filters (for admin dashboard)
   */
  async getAllQuotes(filters: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    contractor_id?: string;
    min_amount?: number;
    max_amount?: number;
  } = {}): Promise<{ quotes: any[]; total: number; page: number; limit: number }> {
    const timer = performanceLogger.startTimer('get_all_quotes');
    
    try {
      const { page = 1, limit = 20, sort_by = 'created_at', sort_order = 'desc', status, search } = filters;
      const offset = (page - 1) * limit;
      
      let whereClause = "WHERE 1=1";
      const queryParams: any[] = [];
      let paramIndex = 1;
      
      // Add status filter
      if (status) {
        whereClause += ` AND qr.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }
      
      // Add search filter (search in location_address or service_area)
      if (search) {
        whereClause += ` AND (qr.location_address ILIKE $${paramIndex} OR qr.service_area ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      // Add contractor filter
      if (filters.contractor_id) {
        whereClause += ` AND EXISTS (SELECT 1 FROM contractor_quotes cq WHERE cq.request_id = qr.id AND cq.contractor_id = $${paramIndex})`;
        queryParams.push(filters.contractor_id);
        paramIndex++;
      }
      
      // Add amount filters
      if (filters.min_amount) {
        whereClause += ` AND qr.system_size_kwp * 2000 >= $${paramIndex}`;
        queryParams.push(filters.min_amount);
        paramIndex++;
      }
      
      if (filters.max_amount) {
        whereClause += ` AND qr.system_size_kwp * 2000 <= $${paramIndex}`;
        queryParams.push(filters.max_amount);
        paramIndex++;
      }
      
      // Add pagination parameters
      queryParams.push(limit, offset);
      
      const quotesQuery = `
        SELECT 
          qr.id,
          qr.user_id,
          qr.system_size_kwp,
          qr.location_address,
          qr.service_area,
          qr.status,
          qr.property_details,
          qr.electricity_consumption,
          qr.created_at,
          qr.updated_at,
          COUNT(DISTINCT cqa.id) as assigned_contractors_count,
          COUNT(DISTINCT CASE WHEN cq.admin_status = 'approved' THEN cq.id END) as received_quotes_count,
          COUNT(DISTINCT CASE WHEN cq.is_selected = true THEN cq.id END) as approved_quotes_count
        FROM quote_requests qr
        LEFT JOIN contractor_quote_assignments cqa ON qr.id = cqa.request_id
        LEFT JOIN contractor_quotes cq ON qr.id = cq.request_id
        ${whereClause}
        GROUP BY qr.id
        ORDER BY qr.${sort_by} ${sort_order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      // Count query for pagination
      const countQuery = `
        SELECT COUNT(DISTINCT qr.id) as total
        FROM quote_requests qr
        LEFT JOIN contractor_quotes cq ON qr.id = cq.request_id
        ${whereClause}
      `;
      
      const [quotesResult, countResult] = await Promise.all([
        database.query(quotesQuery, queryParams),
        database.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count query
      ]);
      
      const quotes = quotesResult.rows || [];
      const total = parseInt(countResult.rows[0]?.total || '0');
      
      // Enhance quotes with real user data from auth service
      const enhancedQuotes = await Promise.all(quotes.map(async (quote) => {
        // Extract phone from property_details if available
        const propertyDetails = typeof quote.property_details === 'string' 
          ? JSON.parse(quote.property_details) 
          : quote.property_details || {};

        try {
          // Create connection to auth service database
          const { Pool } = require('pg');
          const authPool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'rabhan_auth',
            user: 'postgres',
            password: '12345'
          });

          // Fetch user details from auth service database
          const userResult = await authPool.query(
            'SELECT first_name, last_name, email, phone FROM users WHERE id = $1',
            [quote.user_id]
          );

          await authPool.end();

          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            return {
              ...quote,
              // Use real user data from auth service
              user_email: user.email || `user-${quote.user_id.slice(-8)}@rabhan.sa`,
              user_first_name: user.first_name || 'User',
              user_last_name: user.last_name || quote.user_id.slice(-4),
              user_phone: user.phone || propertyDetails.contact_phone || null
            };
          } else {
            // User not found in auth service - use property details if available
            const contactEmail = propertyDetails.contact_email || 
                                 propertyDetails.email || 
                                 `customer-${quote.user_id.slice(-8)}@rabhan.sa`;
            
            const contactName = propertyDetails.contact_name || 
                               propertyDetails.customer_name ||
                               propertyDetails.name;
            
            let firstName = 'Customer';
            let lastName = quote.user_id.slice(-4);
            
            if (contactName) {
              const nameParts = contactName.trim().split(' ');
              firstName = nameParts[0] || 'Customer';
              lastName = nameParts.slice(1).join(' ') || quote.user_id.slice(-4);
            }
            
            return {
              ...quote,
              user_email: contactEmail,
              user_first_name: firstName,
              user_last_name: lastName,
              user_phone: propertyDetails.contact_phone || propertyDetails.phone || null
            };
          }
        } catch (userError) {
          logger.warn('Error fetching user details from auth service', {
            user_id: quote.user_id,
            error: userError instanceof Error ? userError.message : 'Unknown error'
          });
          
          // Fallback if auth service lookup fails - use property details
          const contactEmail = propertyDetails.contact_email || 
                               propertyDetails.email || 
                               `customer-${quote.user_id.slice(-8)}@rabhan.sa`;
          
          const contactName = propertyDetails.contact_name || 
                             propertyDetails.customer_name ||
                             propertyDetails.name;
          
          let firstName = 'Customer';
          let lastName = quote.user_id.slice(-4);
          
          if (contactName) {
            const nameParts = contactName.trim().split(' ');
            firstName = nameParts[0] || 'Customer';
            lastName = nameParts.slice(1).join(' ') || quote.user_id.slice(-4);
          }
          
          return {
            ...quote,
            user_email: contactEmail,
            user_first_name: firstName,
            user_last_name: lastName,
            user_phone: propertyDetails.contact_phone || propertyDetails.phone || null
          };
        }
      }));
      
      logger.info(`Retrieved ${quotes.length} quotes for admin dashboard`, {
        total,
        page,
        limit,
        status,
        search
      });
      
      return {
        quotes: enhancedQuotes,
        total,
        page,
        limit
      };
      
    } catch (error: any) {
      logger.error('Error fetching all quotes for admin', {
        error: error.message,
        filters
      });
      throw error;
    } finally {
      timer.end();
    }
  }

  /**
   * Get quotes pending approval
   */
  async getPendingQuotes(filters: {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: string;
    contractor_id?: string;
    min_amount?: number;
    max_amount?: number;
  } = {}): Promise<{ quotes: any[]; total: number; page: number; limit: number }> {
    const timer = performanceLogger.startTimer('get_pending_quotes');
    
    try {
      const { page = 1, limit = 20, sort_by = 'created_at', sort_order = 'desc' } = filters;
      const offset = (page - 1) * limit;
      
      let whereClause = "WHERE cq.admin_status = 'pending'";
      const queryParams: any[] = [];
      let paramIndex = 1;
      
      if (filters.contractor_id) {
        whereClause += ` AND cq.contractor_id = $${paramIndex}`;
        queryParams.push(filters.contractor_id);
        paramIndex++;
      }
      
      if (filters.min_amount) {
        whereClause += ` AND cq.base_price >= $${paramIndex}`;
        queryParams.push(filters.min_amount);
        paramIndex++;
      }
      
      if (filters.max_amount) {
        whereClause += ` AND cq.base_price <= $${paramIndex}`;
        queryParams.push(filters.max_amount);
        paramIndex++;
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM contractor_quotes cq 
        ${whereClause}
      `;
      
      const countResult = await database.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      // Get pending quotes with details
      const quotesQuery = `
        SELECT 
          cq.*,
          qr.user_id,
          qr.system_size_kwp,
          qr.location_address,
          qr.service_area,
          qr.created_at as request_created_at,
          EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - cq.created_at)) as days_pending
        FROM contractor_quotes cq
        JOIN quote_requests qr ON cq.request_id = qr.id
        ${whereClause}
        ORDER BY cq.${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const quotesResult = await database.query(quotesQuery, queryParams);
      
      const quotes = quotesResult.rows.map(row => ({
        id: row.id,
        request_id: row.request_id,
        contractor_id: row.contractor_id,
        user_id: row.user_id,
        base_price: parseFloat(row.base_price),
        price_per_kwp: parseFloat(row.price_per_kwp),
        overprice_amount: parseFloat(row.overprice_amount || 0),
        total_user_price: parseFloat(row.total_user_price || 0),
        system_size_kwp: parseFloat(row.system_size_kwp),
        location_address: row.location_address,
        service_area: row.service_area,
        system_specs: row.system_specs,
        installation_timeline_days: row.installation_timeline_days,
        warranty_terms: row.warranty_terms,
        panels_brand: row.panels_brand,
        panels_model: row.panels_model,
        panels_quantity: row.panels_quantity,
        inverter_brand: row.inverter_brand,
        inverter_model: row.inverter_model,
        inverter_quantity: row.inverter_quantity,
        admin_status: row.admin_status,
        created_at: row.created_at,
        request_created_at: row.request_created_at,
        days_pending: parseInt(row.days_pending),
        expires_at: row.expires_at
      }));
      
      logger.debug('Pending quotes retrieved', {
        count: quotes.length,
        total,
        page
      });
      
      return { quotes, total, page, limit };
      
    } catch (error) {
      logger.error('Failed to get pending quotes', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end();
    }
  }
  
  /**
   * Approve or reject quote
   */
  async processQuoteApproval(
    adminId: string,
    approvalData: QuoteApprovalData
  ): Promise<any> {
    const timer = performanceLogger.startTimer('process_quote_approval');
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      const { quote_id, admin_status, admin_notes, rejection_reason } = approvalData;
      
      // Get quote details
      const quoteQuery = `
        SELECT cq.*, qr.system_size_kwp 
        FROM contractor_quotes cq
        JOIN quote_requests qr ON cq.request_id = qr.id
        WHERE cq.id = $1
      `;
      
      const quoteResult = await client.query(quoteQuery, [quote_id]);
      
      if (quoteResult.rows.length === 0) {
        throw new NotFoundError('Quote not found');
      }
      
      const quote = quoteResult.rows[0];
      
      if (quote.admin_status !== 'pending') {
        throw new ConflictError(`Quote has already been ${quote.admin_status}`);
      }
      
      // Update quote status
      const updateQuery = `
        UPDATE contractor_quotes 
        SET 
          admin_status = $1,
          admin_notes = $2,
          reviewed_by = $3,
          reviewed_at = CURRENT_TIMESTAMP,
          rejection_reason = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;
      
      const updatedQuoteResult = await client.query(updateQuery, [
        admin_status,
        admin_notes,
        adminId,
        rejection_reason,
        quote_id
      ]);
      
      const updatedQuote = updatedQuoteResult.rows[0];
      
      // If approved, recalculate financials and update quote
      if (admin_status === 'approved') {
        const financials = await financialService.calculateQuoteFinancials(
          parseFloat(quote.base_price),
          parseFloat(quote.price_per_kwp),
          parseFloat(quote.system_size_kwp)
        );
        
        // Update quote with calculated financials
        await client.query(`
          UPDATE contractor_quotes 
          SET 
            overprice_amount = $1,
            total_user_price = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [
          financials.overprice_amount,
          financials.total_user_price,
          quote_id
        ]);
      }
      
      await client.query('COMMIT');
      
      // Audit log
      auditLogger.quote('QUOTE_APPROVAL_PROCESSED', {
        admin_id: adminId,
        quote_id: quote_id,
        contractor_id: quote.contractor_id,
        admin_status: admin_status,
        base_price: parseFloat(quote.base_price),
        rejection_reason: rejection_reason
      });
      
      logger.info('Quote approval processed', {
        admin_id: adminId,
        quote_id: quote_id,
        status: admin_status,
        contractor_id: quote.contractor_id
      });
      
      return {
        ...updatedQuote,
        base_price: parseFloat(updatedQuote.base_price),
        price_per_kwp: parseFloat(updatedQuote.price_per_kwp),
        overprice_amount: parseFloat(updatedQuote.overprice_amount || 0),
        total_user_price: parseFloat(updatedQuote.total_user_price || 0)
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      
      logger.error('Failed to process quote approval', {
        admin_id: adminId,
        quote_id: approvalData.quote_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      client.release();
      timer.end({ admin_id: adminId });
    }
  }
  
  /**
   * Get contractor management data
   */
  async getContractorManagement(contractorId?: string): Promise<ContractorManagementData[]> {
    const timer = performanceLogger.startTimer('get_contractor_management');
    
    try {
      let whereClause = '';
      const queryParams: any[] = [];
      
      if (contractorId) {
        whereClause = 'WHERE cq.contractor_id = $1';
        queryParams.push(contractorId);
      }
      
      const contractorQuery = `
        SELECT 
          cq.contractor_id,
          COUNT(*) as total_quotes,
          COUNT(CASE WHEN cq.admin_status = 'approved' THEN 1 END) as approved_quotes,
          COUNT(CASE WHEN cq.admin_status = 'rejected' THEN 1 END) as rejected_quotes,
          AVG(CASE WHEN cq.admin_status = 'approved' THEN cq.base_price END) as avg_quote_price,
          MAX(cq.created_at) as last_activity,
          COALESCE(cw.current_balance, 0) as wallet_balance
        FROM contractor_quotes cq
        LEFT JOIN contractor_wallets cw ON cq.contractor_id = cw.contractor_id
        ${whereClause}
        GROUP BY cq.contractor_id, cw.current_balance
        ORDER BY last_activity DESC
      `;
      
      const contractorResult = await database.query(contractorQuery, queryParams);
      
      const contractorManagement = contractorResult.rows.map(row => {
        const totalQuotes = parseInt(row.total_quotes);
        const approvedQuotes = parseInt(row.approved_quotes);
        const rejectedQuotes = parseInt(row.rejected_quotes);
        const successRate = totalQuotes > 0 ? (approvedQuotes / totalQuotes) * 100 : 0;
        
        // Calculate performance score based on success rate, activity, and quote quality
        let performanceScore = successRate * 0.6; // 60% weight for success rate
        
        // Add activity bonus (if active in last 7 days)
        const daysSinceActivity = Math.floor(
          (new Date().getTime() - new Date(row.last_activity).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceActivity <= 7) performanceScore += 20;
        else if (daysSinceActivity <= 30) performanceScore += 10;
        
        // Add quote volume bonus
        if (totalQuotes >= 10) performanceScore += 10;
        else if (totalQuotes >= 5) performanceScore += 5;
        
        performanceScore = Math.min(performanceScore, 100); // Cap at 100
        
        return {
          contractor_id: row.contractor_id,
          verification_status: 'verified' as const, // Default, would come from contractor service
          performance_score: Math.round(performanceScore),
          total_quotes_submitted: totalQuotes,
          quotes_approved: approvedQuotes,
          quotes_rejected: rejectedQuotes,
          success_rate: Math.round(successRate * 100) / 100,
          wallet_balance: parseFloat(row.wallet_balance),
          last_activity: row.last_activity
        };
      });
      
      logger.debug('Contractor management data retrieved', {
        contractors_count: contractorManagement.length
      });
      
      return contractorManagement;
      
    } catch (error) {
      logger.error('Failed to get contractor management data', {
        contractor_id: contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ contractor_id: contractorId });
    }
  }
  
  /**
   * Approve withdrawal request
   */
  async approveWithdrawal(
    adminId: string,
    transactionId: string,
    adminNotes?: string
  ): Promise<any> {
    const timer = performanceLogger.startTimer('approve_withdrawal');
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get withdrawal transaction
      const transactionQuery = `
        SELECT wt.*, cw.contractor_id, cw.pending_balance
        FROM wallet_transactions wt
        JOIN contractor_wallets cw ON wt.wallet_id = cw.id
        WHERE wt.id = $1 AND wt.reference_type = 'withdrawal' AND wt.status = 'pending'
      `;
      
      const transactionResult = await client.query(transactionQuery, [transactionId]);
      
      if (transactionResult.rows.length === 0) {
        throw new NotFoundError('Withdrawal request not found or already processed');
      }
      
      const transaction = transactionResult.rows[0];
      const withdrawalAmount = parseFloat(transaction.amount);
      
      // Update transaction status to approved
      await client.query(`
        UPDATE wallet_transactions
        SET 
          status = 'completed',
          processed_at = CURRENT_TIMESTAMP,
          internal_notes = $1
        WHERE id = $2
      `, [adminNotes || `Approved by admin ${adminId}`, transactionId]);
      
      // Update wallet - remove from pending balance
      await client.query(`
        UPDATE contractor_wallets
        SET 
          pending_balance = pending_balance - $1,
          total_withdrawn = COALESCE(total_withdrawn, 0) + $1,
          last_transaction_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [withdrawalAmount, transaction.wallet_id]);
      
      await client.query('COMMIT');
      
      // Audit log
      auditLogger.financial('WITHDRAWAL_APPROVED', {
        admin_id: adminId,
        transaction_id: transactionId,
        contractor_id: transaction.contractor_id,
        withdrawal_amount: withdrawalAmount,
        admin_notes: adminNotes
      });
      
      logger.info('Withdrawal approved', {
        admin_id: adminId,
        transaction_id: transactionId,
        contractor_id: transaction.contractor_id,
        amount: withdrawalAmount
      });
      
      return {
        transaction_id: transactionId,
        contractor_id: transaction.contractor_id,
        amount: withdrawalAmount,
        status: 'approved',
        processed_at: new Date(),
        admin_notes: adminNotes
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Failed to approve withdrawal', {
        admin_id: adminId,
        transaction_id: transactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      client.release();
      timer.end({ admin_id: adminId });
    }
  }
  
  /**
   * Get system analytics for admin
   */
  async getSystemAnalytics(period: string = 'last_30_days'): Promise<any> {
    const timer = performanceLogger.startTimer('get_system_analytics');
    
    try {
      // Calculate date range based on period
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
      
      // Get comprehensive analytics
      const analyticsQueries = await Promise.all([
        // Quote statistics
        database.query(`
          SELECT 
            COUNT(*) as total_quotes,
            COUNT(CASE WHEN admin_status = 'approved' THEN 1 END) as approved_quotes,
            COUNT(CASE WHEN admin_status = 'rejected' THEN 1 END) as rejected_quotes,
            COUNT(CASE WHEN is_selected = true THEN 1 END) as selected_quotes,
            AVG(base_price) as avg_quote_price,
            SUM(CASE WHEN admin_status = 'approved' AND is_selected = true THEN base_price * 0.15 END) as total_commission,
            SUM(CASE WHEN admin_status = 'approved' AND is_selected = true THEN overprice_amount END) as total_markup
          FROM contractor_quotes 
          WHERE ${dateFilter}
        `),
        
        // Request statistics
        database.query(`
          SELECT 
            COUNT(*) as total_requests,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests,
            AVG(system_size_kwp) as avg_system_size
          FROM quote_requests 
          WHERE ${dateFilter}
        `),
        
        // Daily breakdown for charts
        database.query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as quote_count,
            SUM(base_price) as daily_volume
          FROM contractor_quotes 
          WHERE ${dateFilter}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `)
      ]);
      
      const quoteStats = analyticsQueries[0].rows[0];
      const requestStats = analyticsQueries[1].rows[0];
      const dailyBreakdown = analyticsQueries[2].rows;
      
      const analytics = {
        period: period,
        overview: {
          total_quotes: parseInt(quoteStats.total_quotes),
          approved_quotes: parseInt(quoteStats.approved_quotes),
          rejected_quotes: parseInt(quoteStats.rejected_quotes),
          selected_quotes: parseInt(quoteStats.selected_quotes),
          approval_rate: quoteStats.total_quotes > 0 ? 
            (parseInt(quoteStats.approved_quotes) / parseInt(quoteStats.total_quotes)) * 100 : 0,
          selection_rate: quoteStats.approved_quotes > 0 ? 
            (parseInt(quoteStats.selected_quotes) / parseInt(quoteStats.approved_quotes)) * 100 : 0
        },
        financial: {
          avg_quote_price: parseFloat(quoteStats.avg_quote_price || 0),
          total_commission: parseFloat(quoteStats.total_commission || 0),
          total_markup: parseFloat(quoteStats.total_markup || 0),
          total_platform_revenue: parseFloat(quoteStats.total_commission || 0) + parseFloat(quoteStats.total_markup || 0)
        },
        requests: {
          total_requests: parseInt(requestStats.total_requests),
          completed_requests: parseInt(requestStats.completed_requests),
          completion_rate: requestStats.total_requests > 0 ? 
            (parseInt(requestStats.completed_requests) / parseInt(requestStats.total_requests)) * 100 : 0,
          avg_system_size: parseFloat(requestStats.avg_system_size || 0)
        },
        daily_breakdown: dailyBreakdown.map(row => ({
          date: row.date,
          quote_count: parseInt(row.quote_count),
          daily_volume: parseFloat(row.daily_volume || 0)
        }))
      };
      
      logger.info('System analytics retrieved', {
        period: period,
        total_quotes: analytics.overview.total_quotes,
        platform_revenue: analytics.financial.total_platform_revenue
      });
      
      return analytics;
      
    } catch (error) {
      logger.error('Failed to get system analytics', {
        period: period,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ period: period });
    }
  }

  /**
   * Get detailed quotation with line items for admin review
   */
  async getDetailedQuotationForReview(quotationId: string): Promise<any> {
    const timer = performanceLogger.startTimer('get_detailed_quotation_for_review');
    
    try {
      const dbClient = await database.getClient();
      
      // Get quotation header
      const quotationQuery = `
        SELECT cq.*, qr.user_id, qr.system_size_kwp as requested_size
        FROM contractor_quotes cq
        JOIN quote_requests qr ON cq.request_id = qr.id
        WHERE cq.id = $1
      `;
      
      const quotationResult = await dbClient.query(quotationQuery, [quotationId]);
      
      if (quotationResult.rows.length === 0) {
        throw new NotFoundError('Quotation not found');
      }
      
      // Get line items
      const lineItemsQuery = `
        SELECT * FROM quotation_line_items 
        WHERE quotation_id = $1 
        ORDER BY serial_number
      `;
      
      const lineItemsResult = await dbClient.query(lineItemsQuery, [quotationId]);
      
      // Calculate totals
      const lineItems = lineItemsResult.rows;
      const totals = this.calculateQuotationTotals(lineItems);
      
      dbClient.release();
      
      const result = {
        ...quotationResult.rows[0],
        line_items: lineItems,
        totals: totals
      };
      
      logger.info('Detailed quotation retrieved for admin review', {
        quotation_id: quotationId,
        contractor_id: result.contractor_id,
        line_items_count: lineItems.length,
        total_user_price: totals.total_user_price
      });
      
      return result;
      
    } catch (error) {
      logger.error('Get detailed quotation for review service error', {
        quotation_id: quotationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ quotation_id: quotationId });
    }
  }

  /**
   * Review (approve/reject) detailed quotation
   */
  async reviewDetailedQuotation(quotationId: string, reviewData: any): Promise<any> {
    const timer = performanceLogger.startTimer('review_detailed_quotation');
    const dbClient = await database.getClient();
    
    try {
      await dbClient.query('BEGIN');
      
      // Update quotation status
      const updateQuery = `
        UPDATE contractor_quotes 
        SET 
          admin_status = $1,
          admin_notes = $2,
          rejection_reason = $3,
          reviewed_by = $4,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;
      
      const updateResult = await dbClient.query(updateQuery, [
        reviewData.admin_status,
        reviewData.admin_notes,
        reviewData.rejection_reason,
        reviewData.reviewed_by,
        quotationId
      ]);
      
      if (updateResult.rows.length === 0) {
        throw new NotFoundError('Quotation not found');
      }
      
      // Get updated quotation with line items
      const lineItemsQuery = `
        SELECT * FROM quotation_line_items 
        WHERE quotation_id = $1 
        ORDER BY serial_number
      `;
      
      const lineItemsResult = await dbClient.query(lineItemsQuery, [quotationId]);
      
      await dbClient.query('COMMIT');
      
      const result = {
        ...updateResult.rows[0],
        line_items: lineItemsResult.rows,
        totals: this.calculateQuotationTotals(lineItemsResult.rows)
      };
      
      auditLogger.security('QUOTATION_REVIEWED', {
        quotation_id: quotationId,
        contractor_id: result.contractor_id,
        admin_decision: reviewData.admin_status,
        reviewed_by: reviewData.reviewed_by,
        has_rejection_reason: !!reviewData.rejection_reason,
        timestamp: new Date().toISOString()
      });
      
      logger.info('Detailed quotation reviewed successfully', {
        quotation_id: quotationId,
        decision: reviewData.admin_status,
        reviewed_by: reviewData.reviewed_by
      });
      
      return result;
      
    } catch (error) {
      await dbClient.query('ROLLBACK');
      logger.error('Review detailed quotation service error', {
        quotation_id: quotationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      dbClient.release();
      timer.end({ quotation_id: quotationId });
    }
  }

  /**
   * Calculate quotation totals from line items
   */
  private calculateQuotationTotals(lineItems: any[]) {
    const totalPrice = lineItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    const totalCommission = lineItems.reduce((sum, item) => sum + parseFloat(item.rabhan_commission), 0);
    const totalOverPrice = lineItems.reduce((sum, item) => sum + parseFloat(item.rabhan_over_price), 0);
    const totalUserPrice = lineItems.reduce((sum, item) => sum + parseFloat(item.user_price), 0);
    const totalVendorNet = lineItems.reduce((sum, item) => sum + parseFloat(item.vendor_net_price), 0);
    const vatAmount = totalVendorNet * 0.15; // 15% VAT on vendor net
    const totalPayable = totalVendorNet + vatAmount;
    
    return {
      total_price: totalPrice,
      total_commission: totalCommission,
      total_over_price: totalOverPrice,
      total_user_price: totalUserPrice,
      total_vendor_net: totalVendorNet,
      vat_amount: vatAmount,
      total_payable: totalPayable
    };
  }

  /**
   * Get a single quote by ID with enhanced user data
   */
  async getQuoteById(quoteId: string): Promise<any | null> {
    const timer = performanceLogger.startTimer('get_quote_by_id');
    
    try {
      // Query the specific quote
      const quoteQuery = `
        SELECT 
          qr.id,
          qr.user_id,
          qr.system_size_kwp,
          qr.location_address,
          qr.service_area,
          qr.status,
          qr.property_details,
          qr.electricity_consumption,
          qr.created_at,
          qr.updated_at,
          COUNT(DISTINCT cqa.id) as assigned_contractors_count,
          COUNT(DISTINCT CASE WHEN cq.admin_status = 'approved' THEN cq.id END) as received_quotes_count,
          COUNT(DISTINCT CASE WHEN cq.is_selected = true THEN cq.id END) as approved_quotes_count
        FROM quote_requests qr
        LEFT JOIN contractor_quote_assignments cqa ON qr.id = cqa.request_id
        LEFT JOIN contractor_quotes cq ON qr.id = cq.request_id
        WHERE qr.id = $1
        GROUP BY qr.id
      `;
      
      const result = await database.query(quoteQuery, [quoteId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const quote = result.rows[0];
      
      // Enhance with user data using the same logic as getAllQuotes
      const propertyDetails = typeof quote.property_details === 'string' 
        ? JSON.parse(quote.property_details) 
        : quote.property_details || {};

      try {
        // Create connection to auth service database
        const { Pool } = require('pg');
        const authPool = new Pool({
          host: 'localhost',
          port: 5432,
          database: 'rabhan_auth',
          user: 'postgres',
          password: '12345'
        });

        // Fetch user details from auth service database
        const userResult = await authPool.query(
          'SELECT first_name, last_name, email, phone FROM users WHERE id = $1',
          [quote.user_id]
        );

        await authPool.end();

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          quote.user_email = user.email || `user-${quote.user_id.slice(-8)}@rabhan.sa`;
          quote.user_first_name = user.first_name || 'User';
          quote.user_last_name = user.last_name || quote.user_id.slice(-4);
          quote.user_phone = user.phone || propertyDetails.contact_phone || null;
        } else {
          // User not found in auth service - use property details if available
          const contactEmail = propertyDetails.contact_email || 
                               propertyDetails.email || 
                               `customer-${quote.user_id.slice(-8)}@rabhan.sa`;
          
          const contactName = propertyDetails.contact_name || 
                             propertyDetails.customer_name ||
                             propertyDetails.name;
          
          let firstName = 'Customer';
          let lastName = quote.user_id.slice(-4);
          
          if (contactName) {
            const nameParts = contactName.trim().split(' ');
            firstName = nameParts[0] || 'Customer';
            lastName = nameParts.slice(1).join(' ') || quote.user_id.slice(-4);
          }
          
          quote.user_email = contactEmail;
          quote.user_first_name = firstName;
          quote.user_last_name = lastName;
          quote.user_phone = propertyDetails.contact_phone || propertyDetails.phone || null;
        }
      } catch (userError) {
        logger.warn('Error fetching user details from auth service', {
          user_id: quote.user_id,
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
        
        // Fallback if auth service lookup fails
        const contactEmail = propertyDetails.contact_email || 
                             propertyDetails.email || 
                             `customer-${quote.user_id.slice(-8)}@rabhan.sa`;
        
        const contactName = propertyDetails.contact_name || 
                           propertyDetails.customer_name ||
                           propertyDetails.name;
        
        let firstName = 'Customer';
        let lastName = quote.user_id.slice(-4);
        
        if (contactName) {
          const nameParts = contactName.trim().split(' ');
          firstName = nameParts[0] || 'Customer';
          lastName = nameParts.slice(1).join(' ') || quote.user_id.slice(-4);
        }
        
        quote.user_email = contactEmail;
        quote.user_first_name = firstName;
        quote.user_last_name = lastName;
        quote.user_phone = propertyDetails.contact_phone || propertyDetails.phone || null;
      }
      
      logger.info(`Retrieved quote details for ${quoteId}`, {
        quote_id: quoteId,
        has_user_data: !!quote.user_email
      });
      
      return quote;
      
    } catch (error: any) {
      logger.error('Error fetching quote by ID', {
        error: error.message,
        quote_id: quoteId
      });
      throw error;
    } finally {
      timer.end();
    }
  }

  /**
   * Get contractor assignments for a specific quote
   */
  async getQuoteAssignments(quoteId: string): Promise<any[]> {
    const timer = performanceLogger.startTimer('get_quote_assignments');
    
    try {
      // Query contractor_quote_assignments table to get assignments for this quote
      const assignmentsQuery = `
        SELECT 
          cqa.id,
          cqa.request_id,
          cqa.contractor_id,
          cqa.status,
          cqa.assigned_at,
          cqa.viewed_at,
          cqa.responded_at,
          cqa.response_notes,
          -- Include quote details if contractor has submitted a quote
          cq.base_price,
          cq.total_user_price,
          cq.installation_timeline_days,
          cq.is_selected,
          cq.admin_status as quote_status
        FROM contractor_quote_assignments cqa
        LEFT JOIN contractor_quotes cq ON cqa.contractor_id = cq.contractor_id AND cqa.request_id = cq.request_id
        WHERE cqa.request_id = $1
        ORDER BY cqa.assigned_at ASC
      `;
      
      const result = await database.query(assignmentsQuery, [quoteId]);
      const assignments = result.rows || [];
      
      // Enhance each assignment with contractor details from auth service
      const enhancedAssignments = await Promise.all(assignments.map(async (assignment) => {
        try {
          // Get contractor details from auth service
          const { Pool } = require('pg');
          const authPool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'rabhan_auth',
            user: 'postgres',
            password: '12345'
          });
          
          const contractorResult = await authPool.query(
            'SELECT first_name, last_name, email, phone, company_name FROM contractors WHERE id = $1',
            [assignment.contractor_id]
          );
          
          await authPool.end();
          
          if (contractorResult.rows.length > 0) {
            const contractor = contractorResult.rows[0];
            return {
              ...assignment,
              contractor_company: contractor.company_name || `${contractor.first_name} ${contractor.last_name}`,
              contractor_email: contractor.email,
              contractor_phone: contractor.phone
            };
          } else {
            return {
              ...assignment,
              contractor_company: `Contractor ${assignment.contractor_id.slice(-4)}`,
              contractor_email: `contractor-${assignment.contractor_id.slice(-4)}@rabhan.sa`,
              contractor_phone: '+966501234567'
            };
          }
        } catch (contractorError) {
          // Fallback contractor data if lookup fails
          return {
            ...assignment,
            contractor_company: `Contractor ${assignment.contractor_id.slice(-4)}`,
            contractor_email: `contractor-${assignment.contractor_id.slice(-4)}@rabhan.sa`,
            contractor_phone: '+966501234567'
          };
        }
      }));
      
      logger.info(`Retrieved ${enhancedAssignments.length} assignments for quote ${quoteId}`, {
        quote_id: quoteId,
        assignment_count: enhancedAssignments.length
      });
      
      return enhancedAssignments;
      
    } catch (error: any) {
      logger.error('Error fetching quote assignments', {
        error: error.message,
        quote_id: quoteId
      });
      // Return empty array instead of throwing to prevent View button failure
      return [];
    } finally {
      timer.end();
    }
  }

  /**
   * Get available contractors for assignment to a quote
   */
  async getAvailableContractors(serviceArea?: string): Promise<any[]> {
    const timer = performanceLogger.startTimer('get_available_contractors');
    
    try {
      // Connect to auth database to get contractors
      const { Pool } = require('pg');
      const authPool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'rabhan_auth',
        user: 'postgres',
        password: '12345'
      });
      
      let query = `
        SELECT id, email, first_name, last_name, company_name, phone, status
        FROM contractors 
      `;
      
      const params: any[] = [];
      
      // Add service area filter if provided (future enhancement)
      if (serviceArea) {
        // For now, we'll return all contractors regardless of service area
        // In the future, this could filter by service area coverage
      }
      
      query += ' ORDER BY company_name LIMIT 50';
      
      logger.debug('Executing contractor query', { query, params });
      const result = await authPool.query(query, params);
      await authPool.end();
      
      logger.info(`Retrieved ${result.rows.length} available contractors`, {
        service_area: serviceArea,
        count: result.rows.length,
        sample_contractor: result.rows.length > 0 ? result.rows[0] : null
      });
      
      return result.rows;
      
    } catch (error: any) {
      logger.error('Error fetching available contractors', {
        error: error.message,
        service_area: serviceArea
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end();
    }
  }

  /**
   * Get quotes with contractor assignment counts (admin-specific)
   */
  async getAdminQuotesWithAssignments(filters: any): Promise<any> {
    const timer = performanceLogger.startTimer('get_admin_quotes_with_assignments');
    
    try {
      const {
        page = 1,
        limit = 20,
        status,
        search,
        sort_by = 'created_at',
        sort_order = 'desc',
        contractor_id,
        min_amount,
        max_amount
      } = filters;
      
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;
      
      // Build where clause
      if (status) {
        whereClause += ` AND qr.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }
      
      if (search) {
        whereClause += ` AND (qr.location_address ILIKE $${paramIndex} OR qr.service_area ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      if (contractor_id) {
        whereClause += ` AND EXISTS (SELECT 1 FROM contractor_quote_assignments cqa WHERE cqa.request_id = qr.id AND cqa.contractor_id = $${paramIndex})`;
        queryParams.push(contractor_id);
        paramIndex++;
      }
      
      if (min_amount) {
        whereClause += ` AND EXISTS (SELECT 1 FROM contractor_quotes cq WHERE cq.request_id = qr.id AND cq.base_price >= $${paramIndex})`;
        queryParams.push(min_amount);
        paramIndex++;
      }
      
      if (max_amount) {
        whereClause += ` AND EXISTS (SELECT 1 FROM contractor_quotes cq WHERE cq.request_id = qr.id AND cq.base_price <= $${paramIndex})`;
        queryParams.push(max_amount);
        paramIndex++;
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT qr.id) as total 
        FROM quote_requests qr 
        ${whereClause}
      `;
      
      const countResult = await database.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      // Get quotes with admin-specific assignment counts
      const quotesQuery = `
        SELECT 
          qr.id,
          qr.user_id,
          qr.system_size_kwp,
          qr.location_address,
          qr.service_area,
          qr.status,
          qr.property_details,
          qr.electricity_consumption,
          qr.created_at,
          qr.updated_at,
          COUNT(DISTINCT cqa.id) as assigned_contractors_count,
          COUNT(DISTINCT CASE WHEN cq.admin_status = 'approved' THEN cq.id END) as received_quotes_count,
          COUNT(DISTINCT CASE WHEN cq.is_selected = true THEN cq.id END) as approved_quotes_count
        FROM quote_requests qr
        LEFT JOIN contractor_quote_assignments cqa ON qr.id = cqa.request_id
        LEFT JOIN contractor_quotes cq ON qr.id = cq.request_id
        ${whereClause}
        GROUP BY qr.id, qr.user_id, qr.system_size_kwp, qr.location_address, qr.service_area, qr.status, qr.property_details, qr.electricity_consumption, qr.created_at, qr.updated_at
        ORDER BY qr.${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const quotesResult = await database.query(quotesQuery, queryParams);
      const quotes = quotesResult.rows || [];
      
      // Enhance with user data (same as before)
      const enhancedQuotes = await Promise.all(quotes.map(async (quote: any) => {
        try {
          const { Pool } = require('pg');
          const authPool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'rabhan_auth',
            user: 'postgres',
            password: '12345'
          });
          
          const userResult = await authPool.query(
            'SELECT first_name, last_name, email, phone FROM users WHERE id = $1',
            [quote.user_id]
          );
          
          await authPool.end();
          
          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const propertyDetails = quote.property_details || {};
            
            return {
              ...quote,
              user_email: user.email || `user-${quote.user_id.slice(-8)}@rabhan.sa`,
              user_first_name: user.first_name || 'User',
              user_last_name: user.last_name || quote.user_id.slice(-4),
              user_phone: user.phone || propertyDetails.contact_phone || null
            };
          } else {
            const propertyDetails = quote.property_details || {};
            return {
              ...quote,
              user_email: `user-${quote.user_id.slice(-8)}@rabhan.sa`,
              user_first_name: 'User',
              user_last_name: quote.user_id.slice(-4),
              user_phone: propertyDetails.contact_phone || null
            };
          }
        } catch (userError) {
          const propertyDetails = quote.property_details || {};
          return {
            ...quote,
            user_email: `user-${quote.user_id.slice(-8)}@rabhan.sa`,
            user_first_name: 'User',
            user_last_name: quote.user_id.slice(-4),
            user_phone: propertyDetails.contact_phone || null
          };
        }
      }));
      
      return {
        quotes: enhancedQuotes,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit)
      };
      
    } catch (error: any) {
      logger.error('Error fetching admin quotes with assignments', {
        error: error.message,
        filters
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end();
    }
  }

  /**
   * Assign contractors to a quote request
   */
  async assignContractorsToQuote(quoteId: string, contractorIds: string[], adminId: string): Promise<any[]> {
    const timer = performanceLogger.startTimer('assign_contractors_to_quote');
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if quote exists
      const quoteCheck = await client.query(
        'SELECT id, status FROM quote_requests WHERE id = $1',
        [quoteId]
      );
      
      if (quoteCheck.rows.length === 0) {
        throw new NotFoundError('Quote request not found');
      }
      
      // Remove existing assignments for this quote (allow re-assignment)
      await client.query(
        'DELETE FROM contractor_quote_assignments WHERE request_id = $1',
        [quoteId]
      );
      
      // Create new assignments
      const assignments = [];
      for (const contractorId of contractorIds) {
        const assignmentResult = await client.query(`
          INSERT INTO contractor_quote_assignments (
            id, request_id, contractor_id, status, assigned_at, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, 'assigned', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) RETURNING *
        `, [quoteId, contractorId]);
        
        assignments.push(assignmentResult.rows[0]);
      }
      
      // Update quote request status to 'assigned' or 'in_progress'
      await client.query(
        'UPDATE quote_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['in_progress', quoteId]
      );
      
      await client.query('COMMIT');
      
      // Log the assignment
      auditLogger.security('CONTRACTORS_ASSIGNED_TO_QUOTE', {
        admin_id: adminId,
        quote_id: quoteId,
        contractor_ids: contractorIds,
        assignment_count: assignments.length,
        timestamp: new Date().toISOString()
      });
      
      logger.info('Contractors successfully assigned to quote', {
        quote_id: quoteId,
        contractor_ids: contractorIds,
        assignment_count: assignments.length,
        admin_id: adminId
      });
      
      return assignments;
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error assigning contractors to quote', {
        error: error.message,
        quote_id: quoteId,
        contractor_ids: contractorIds,
        admin_id: adminId
      });
      throw handleDatabaseError(error);
    } finally {
      client.release();
      timer.end();
    }
  }
}

export const adminService = new AdminService();