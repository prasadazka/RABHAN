import { database } from '../config/database.config';
import { Pool } from 'pg';
import { logger, auditLogger, performanceLogger } from '../utils/logger';
import { 
  QuoteRequest, 
  ContractorQuote, 
  CreateQuoteRequestDTO, 
  SubmitQuoteDTO,
  QuoteComparison
} from '../types/quote.types';
import { NotFoundError, ConflictError, BusinessRuleError, handleDatabaseError } from '../middleware/error.middleware';
import { financialService } from './financial.service';
import axios from 'axios';

export class QuoteService {
  
  private contractorServiceUrl = process.env.CONTRACTOR_SERVICE_URL || 'http://localhost:3004';
  private authDatabase: Pool;

  constructor() {
    // Create connection to auth service database
    this.authDatabase = new Pool({
      host: process.env.AUTH_DB_HOST || 'localhost',
      port: parseInt(process.env.AUTH_DB_PORT || '5432', 10),
      database: process.env.AUTH_DB_NAME || 'rabhan_auth',
      user: process.env.AUTH_DB_USER || 'postgres',
      password: process.env.AUTH_DB_PASSWORD || '12345',
      max: 10,
      min: 2,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 2000,
      application_name: 'quote-service-auth-reader'
    });
  }
  
  /**
   * Create a new quote request
   */
  async createQuoteRequest(userId: string, data: CreateQuoteRequestDTO): Promise<QuoteRequest> {
    const timer = performanceLogger.startTimer('create_quote_request');
    
    try {
      // Validate system size against business rules
      await this.validateSystemSize(data.system_size_kwp);
      
      const query = `
        INSERT INTO quote_requests (
          user_id, system_size_kwp, location_address, service_area,
          property_details, electricity_consumption, selected_contractors, 
          inspection_dates, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
        RETURNING *
      `;
      
      const values = [
        userId,
        data.system_size_kwp,
        data.location_address,
        data.service_area,
        JSON.stringify({
          ...data.property_details || {},
          contact_phone: data.contact_phone,
          notes: data.notes || null
        }),
        JSON.stringify({
          monthly_kwh: data.electricity_consumption || 500,
          average_bill: data.average_electricity_bill || 200,
          peak_usage_hours: data.peak_usage_hours || "12-16"
        }),
        data.selected_contractors || null,
        data.inspection_schedules ? JSON.stringify(data.inspection_schedules) : null
      ];
      
      const result = await database.query(query, values);
      const quoteRequest = result.rows[0];
      
      // Notify selected contractors about new quote request
      if (data.selected_contractors && data.selected_contractors.length > 0) {
        await this.notifyContractorsOfNewRequest(quoteRequest.id, data.selected_contractors);
      }
      
      // Audit log
      auditLogger.quote('QUOTE_REQUEST_CREATED', {
        user_id: userId,
        request_id: quoteRequest.id,
        system_size_kwp: data.system_size_kwp,
        estimated_cost: data.system_size_kwp * 2000, // Base estimation
        selected_contractors: data.selected_contractors
      });
      
      logger.info('Quote request created successfully', {
        user_id: userId,
        request_id: quoteRequest.id,
        system_size: data.system_size_kwp,
        contractors_notified: data.selected_contractors?.length || 0
      });
      
      return await this.formatQuoteRequest(quoteRequest);
      
    } catch (error) {
      logger.error('Failed to create quote request', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        sql_error: error,
        stack: error instanceof Error ? error.stack : undefined
      });
      console.error('DETAILED SQL ERROR:', error);
      throw handleDatabaseError(error);
    } finally {
      timer.end({ user_id: userId });
    }
  }
  
  /**
   * Get quote requests for a user
   */
  async getUserQuoteRequests(
    userId: string, 
    filters: {
      status?: string;
      page?: number;
      limit?: number;
      sort_by?: string;
      sort_order?: string;
    } = {}
  ): Promise<{ requests: any[]; total: number; page: number; limit: number }> {
    const timer = performanceLogger.startTimer('get_user_quote_requests');
    
    try {
      const { page = 1, limit = 10, sort_by = 'created_at', sort_order = 'desc' } = filters;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE user_id = $1';
      const queryParams: any[] = [userId];
      let paramIndex = 2;
      
      if (filters.status) {
        whereClause += ` AND status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM quote_requests ${whereClause}`;
      const countResult = await database.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      // Get requests with pagination
      const dataQuery = `
        SELECT qr.*, 
               (SELECT COUNT(*) FROM contractor_quotes cq WHERE cq.request_id = qr.id) as quote_count,
               (SELECT COUNT(*) FROM contractor_quotes cq WHERE cq.request_id = qr.id AND cq.admin_status = 'approved') as approved_quote_count
        FROM quote_requests qr 
        ${whereClause}
        ORDER BY ${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const dataResult = await database.query(dataQuery, queryParams);
      
      const requests = await Promise.all(dataResult.rows.map(row => this.formatQuoteRequest(row, true, 'user')));
      
      logger.debug('Retrieved user quote requests', {
        user_id: userId,
        count: requests.length,
        total,
        page
      });
      
      return { requests, total, page, limit };
      
    } catch (error) {
      logger.error('Failed to get user quote requests', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ user_id: userId });
    }
  }
  
  /**
   * Get a specific quote request by ID
   */
  async getQuoteRequestById(requestId: string, userId?: string): Promise<QuoteRequest> {
    const timer = performanceLogger.startTimer('get_quote_request_by_id');
    
    try {
      let query = `
        SELECT qr.*, 
               (SELECT COUNT(*) FROM contractor_quotes cq WHERE cq.request_id = qr.id) as quote_count,
               (SELECT COUNT(*) FROM contractor_quotes cq WHERE cq.request_id = qr.id AND cq.admin_status = 'approved') as approved_quote_count
        FROM quote_requests qr 
        WHERE qr.id = $1
      `;
      
      const queryParams = [requestId];
      
      if (userId) {
        query += ' AND qr.user_id = $2';
        queryParams.push(userId);
      }
      
      const result = await database.query(query, queryParams);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Quote request');
      }
      
      return await this.formatQuoteRequest(result.rows[0], true);
      
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      
      logger.error('Failed to get quote request by ID', {
        request_id: requestId,
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ request_id: requestId });
    }
  }
  
  /**
   * Submit a quote (contractor)
   */
  async submitQuote(contractorId: string, data: SubmitQuoteDTO): Promise<ContractorQuote> {
    const timer = performanceLogger.startTimer('submit_quote');
    
    try {
      // Check if request exists and is in valid state
      const requestCheck = await database.query(
        'SELECT status, system_size_kwp FROM quote_requests WHERE id = $1',
        [data.request_id]
      );
      
      if (requestCheck.rows.length === 0) {
        throw new NotFoundError('Quote request');
      }
      
      const request = requestCheck.rows[0];
      if (!['pending', 'contractors_selected', 'quotes_received'].includes(request.status)) {
        throw new BusinessRuleError(
          'Cannot submit quote for request in current status',
          'INVALID_REQUEST_STATUS',
          { current_status: request.status }
        );
      }
      
      // Validate pricing against business rules
      await this.validateQuotePricing(data.price_per_kwp, data.base_price, request.system_size_kwp);
      
      // Check if contractor already submitted a quote for this request
      const existingQuote = await database.query(
        'SELECT id FROM contractor_quotes WHERE request_id = $1 AND contractor_id = $2',
        [data.request_id, contractorId]
      );
      
      if (existingQuote.rows.length > 0) {
        throw new ConflictError('Quote already submitted for this request');
      }
      
      // Calculate financial details using the financial service
      const financials = await financialService.calculateQuoteFinancials(
        data.base_price,
        data.price_per_kwp,
        request.system_size_kwp
      );
      
      const query = `
        INSERT INTO contractor_quotes (
          request_id, contractor_id, base_price, price_per_kwp, 
          system_specs, installation_timeline_days, warranty_terms, maintenance_terms,
          panels_brand, panels_model, panels_quantity,
          inverter_brand, inverter_model, inverter_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const values = [
        data.request_id,
        contractorId,
        financials.base_price,
        financials.price_per_kwp,
        JSON.stringify(data.system_specs),
        data.installation_timeline_days,
        JSON.stringify(data.warranty_terms),
        JSON.stringify(data.maintenance_terms),
        data.panels_brand,
        data.panels_model,
        data.panels_quantity,
        data.inverter_brand,
        data.inverter_model,
        data.inverter_quantity
      ];
      
      const result = await database.query(query, values);
      const quote = result.rows[0];
      
      // Update request status if this is the first quote
      await this.updateRequestStatusIfNeeded(data.request_id);
      
      // Audit log
      auditLogger.quote('CONTRACTOR_QUOTE_SUBMITTED', {
        contractor_id: contractorId,
        request_id: data.request_id,
        quote_id: quote.id,
        base_price: data.base_price,
        price_per_kwp: data.price_per_kwp
      });
      
      logger.info('Contractor quote submitted successfully', {
        contractor_id: contractorId,
        quote_id: quote.id,
        request_id: data.request_id
      });
      
      return this.formatContractorQuote(quote);
      
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessRuleError || error instanceof ConflictError) {
        throw error;
      }
      
      logger.error('Failed to submit contractor quote', {
        contractor_id: contractorId,
        request_id: data.request_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ contractor_id: contractorId });
    }
  }
  
  /**
   * Get quotes for a request
   */
  async getQuotesForRequest(
    requestId: string,
    filters: {
      status?: string;
      sort_by?: string;
      sort_order?: string;
      userRole?: string;
    } = {}
  ): Promise<ContractorQuote[]> {
    const timer = performanceLogger.startTimer('get_quotes_for_request');
    
    try {
      const { status, sort_by = 'base_price', sort_order = 'asc', userRole } = filters;
      
      let whereClause = 'WHERE request_id = $1';
      const queryParams: any[] = [requestId];
      let paramIndex = 2;
      
      // For non-admin users, only show approved quotes
      if (userRole && userRole !== 'admin') {
        whereClause += ` AND admin_status = 'approved'`;
      }
      
      if (status) {
        whereClause += ` AND admin_status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }
      
      const query = `
        SELECT cq.*,
               EXTRACT(DAYS FROM (expires_at - CURRENT_TIMESTAMP)) as days_until_expiry
        FROM contractor_quotes cq 
        ${whereClause}
        ORDER BY ${sort_by} ${sort_order.toUpperCase()}
      `;
      
      const result = await database.query(query, queryParams);
      
      // Fetch line items for each quote
      for (const quote of result.rows) {
        try {
          const lineItemsQuery = `
            SELECT * FROM quotation_line_items 
            WHERE quotation_id = $1 
            ORDER BY id
          `;
          const lineItemsResult = await database.query(lineItemsQuery, [quote.id]);
          quote.line_items = lineItemsResult.rows;
        } catch (error) {
          console.log('Error fetching line items for quote', quote.id, ':', error.message);
          quote.line_items = [];
        }
      }
      
      // Enrich quotes with contractor information
      console.log('🔍 Enriching quotes with contractor information. Found', result.rows.length, 'quotes');
      const quotes = await Promise.all(
        result.rows.map(async (row) => {
          const quote = this.formatContractorQuote(row);
          
          console.log('🏢 Fetching contractor info for:', row.contractor_id);
          // Fetch contractor information
          const contractorInfo = await this.fetchContractorInfo(row.contractor_id);
          console.log('🏢 Contractor info result:', contractorInfo);
          
          if (contractorInfo) {
            // Add contractor information to the quote
            const enrichedQuote = {
              ...quote,
              contractor_name: contractorInfo.business_name,
              contractor_company: contractorInfo.business_name,
              contractor_email: contractorInfo.email,
              contractor_phone: contractorInfo.phone,
              contractor_status: contractorInfo.status,
              contractor_verification_level: contractorInfo.verification_level
            };
            console.log('✅ Enriched quote with contractor:', enrichedQuote.contractor_name);
            return enrichedQuote;
          }
          
          console.log('⚠️ No contractor info found, returning original quote');
          return quote;
        })
      );
      
      return quotes;
      
    } catch (error) {
      logger.error('Failed to get quotes for request', {
        request_id: requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ request_id: requestId });
    }
  }
  
  /**
   * Compare multiple quotes
   */
  async compareQuotes(
    userId: string,
    requestId: string,
    quoteIds: string[],
    criteria?: any
  ): Promise<QuoteComparison> {
    const timer = performanceLogger.startTimer('compare_quotes');
    
    try {
      // Verify user owns the request
      const requestCheck = await database.query(
        'SELECT user_id FROM quote_requests WHERE id = $1',
        [requestId]
      );
      
      if (requestCheck.rows.length === 0) {
        throw new NotFoundError('Quote request');
      }
      
      if (requestCheck.rows[0].user_id !== userId) {
        throw new BusinessRuleError('Cannot compare quotes for request you do not own', 'UNAUTHORIZED_ACCESS');
      }
      
      // Get the quotes for comparison
      const quotesQuery = `
        SELECT cq.*, 
               EXTRACT(DAYS FROM (expires_at - CURRENT_TIMESTAMP)) as days_until_expiry
        FROM contractor_quotes cq
        WHERE cq.request_id = $1 AND cq.id = ANY($2) AND cq.admin_status = 'approved'
        ORDER BY cq.base_price ASC
      `;
      
      const quotesResult = await database.query(quotesQuery, [requestId, quoteIds]);
      
      if (quotesResult.rows.length !== quoteIds.length) {
        throw new BusinessRuleError('Some quotes are not available for comparison', 'INVALID_QUOTES');
      }
      
      // Create or update comparison record
      const comparisonQuery = `
        INSERT INTO quote_comparisons (request_id, user_id, compared_quotes, comparison_criteria, views_count)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (request_id, user_id)
        DO UPDATE SET 
          compared_quotes = $3,
          comparison_criteria = $4,
          views_count = quote_comparisons.views_count + 1,
          last_viewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const comparisonValues = [
        requestId,
        userId,
        quoteIds,
        JSON.stringify(criteria || {})
      ];
      
      const comparisonResult = await database.query(comparisonQuery, comparisonValues);
      
      logger.info('Quotes compared successfully', {
        user_id: userId,
        request_id: requestId,
        quote_count: quoteIds.length
      });
      
      return {
        ...comparisonResult.rows[0],
        quotes: quotesResult.rows.map(row => this.formatContractorQuote(row))
      };
      
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessRuleError) {
        throw error;
      }
      
      logger.error('Failed to compare quotes', {
        user_id: userId,
        request_id: requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ user_id: userId });
    }
  }
  
  /**
   * Select a quote
   */
  async selectQuote(userId: string, quoteId: string, selectionReason?: string): Promise<ContractorQuote> {
    const timer = performanceLogger.startTimer('select_quote');
    
    try {
      // Get quote and verify ownership
      const quoteQuery = `
        SELECT cq.*, qr.user_id, qr.status as request_status
        FROM contractor_quotes cq
        JOIN quote_requests qr ON cq.request_id = qr.id
        WHERE cq.id = $1 AND cq.admin_status = 'approved'
      `;
      
      const quoteResult = await database.query(quoteQuery, [quoteId]);
      
      if (quoteResult.rows.length === 0) {
        throw new NotFoundError('Quote');
      }
      
      const quote = quoteResult.rows[0];
      
      if (quote.user_id !== userId) {
        throw new BusinessRuleError('Cannot select quote for request you do not own', 'UNAUTHORIZED_ACCESS');
      }
      
      if (quote.request_status === 'quote_selected') {
        throw new BusinessRuleError('A quote has already been selected for this request', 'QUOTE_ALREADY_SELECTED');
      }
      
      // Start transaction
      const client = await database.getClient();
      
      try {
        await client.query('BEGIN');
        
        // Mark the quote as selected
        await client.query(
          'UPDATE contractor_quotes SET is_selected = true, selected_at = CURRENT_TIMESTAMP WHERE id = $1',
          [quoteId]
        );
        
        // Update request status
        await client.query(
          'UPDATE quote_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['quote_selected', quote.request_id]
        );
        
        // Record the selection in comparisons table
        await client.query(`
          UPDATE quote_comparisons 
          SET selected_quote_id = $1, selection_reason = $2, updated_at = CURRENT_TIMESTAMP
          WHERE request_id = $3 AND user_id = $4
        `, [quoteId, selectionReason, quote.request_id, userId]);
        
        await client.query('COMMIT');
        
        // Audit log
        auditLogger.quote('QUOTE_SELECTED', {
          user_id: userId,
          quote_id: quoteId,
          contractor_id: quote.contractor_id,
          request_id: quote.request_id,
          selected_price: quote.total_user_price
        });
        
        logger.info('Quote selected successfully', {
          user_id: userId,
          quote_id: quoteId,
          request_id: quote.request_id
        });
        
        return this.formatContractorQuote({ ...quote, is_selected: true, selected_at: new Date() });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessRuleError) {
        throw error;
      }
      
      logger.error('Failed to select quote', {
        user_id: userId,
        quote_id: quoteId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ user_id: userId });
    }
  }

  /**
   * Get assigned quote requests for a contractor
   */
  async getContractorAssignedRequests(
    contractorId: string,
    filters: {
      status?: string;
      page?: number;
      limit?: number;
      sort_by?: string;
      sort_order?: string;
    } = {}
  ): Promise<{ assignments: any[]; total: number; page: number; limit: number }> {
    const timer = performanceLogger.startTimer('get_contractor_assigned_requests');
    
    try {
      const { page = 1, limit = 10, sort_by = 'assigned_at', sort_order = 'desc' } = filters;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE cqa.contractor_id = $1';
      const queryParams: any[] = [contractorId];
      let paramIndex = 2;
      
      if (filters.status) {
        whereClause += ` AND cqa.status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM contractor_quote_assignments cqa 
        ${whereClause}
      `;
      const countResult = await database.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      // Get assignments with quote request details
      const dataQuery = `
        SELECT 
          cqa.*,
          qr.user_id,
          qr.system_size_kwp,
          qr.location_address,
          qr.service_area,
          qr.property_details,
          qr.electricity_consumption,
          qr.created_at as request_created_at,
          qr.status as request_status,
          (SELECT COUNT(*) FROM contractor_quotes cq WHERE cq.request_id = qr.id AND cq.contractor_id = cqa.contractor_id) as has_submitted_quote
        FROM contractor_quote_assignments cqa
        JOIN quote_requests qr ON cqa.request_id = qr.id
        ${whereClause}
        ORDER BY ${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const dataResult = await database.query(dataQuery, queryParams);
      
      const assignments = dataResult.rows.map(row => ({
        assignment_id: row.id,
        request_id: row.request_id,
        contractor_id: row.contractor_id,
        assignment_status: row.status,
        assigned_at: row.assigned_at,
        viewed_at: row.viewed_at,
        responded_at: row.responded_at,
        response_notes: row.response_notes,
        has_submitted_quote: parseInt(row.has_submitted_quote) > 0,
        quote_request: {
          user_id: row.user_id,
          system_size_kwp: parseFloat(row.system_size_kwp),
          location_address: row.location_address,
          service_area: row.service_area,
          property_details: row.property_details,
          electricity_consumption: row.electricity_consumption,
          created_at: row.request_created_at,
          status: row.request_status
        }
      }));
      
      logger.debug('Retrieved contractor assigned requests', {
        contractor_id: contractorId,
        count: assignments.length,
        total,
        page
      });
      
      return { assignments, total, page, limit };
      
    } catch (error) {
      logger.error('Failed to get contractor assigned requests', {
        contractor_id: contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ contractor_id: contractorId });
    }
  }

  /**
   * Contractor accepts or rejects a quote request
   */
  async contractorRespondToRequest(
    contractorId: string, 
    requestId: string, 
    response: 'accepted' | 'rejected',
    notes?: string
  ): Promise<any> {
    const timer = performanceLogger.startTimer('contractor_respond_to_request');
    
    try {
      // Check if assignment exists
      const assignmentCheck = await database.query(
        'SELECT * FROM contractor_quote_assignments WHERE contractor_id = $1 AND request_id = $2',
        [contractorId, requestId]
      );
      
      if (assignmentCheck.rows.length === 0) {
        throw new NotFoundError('Quote request assignment');
      }
      
      const assignment = assignmentCheck.rows[0];
      
      if (assignment.status !== 'assigned' && assignment.status !== 'viewed') {
        throw new BusinessRuleError(
          'Cannot respond to request that has already been responded to',
          'ALREADY_RESPONDED'
        );
      }
      
      // Update assignment status
      await database.query(`
        UPDATE contractor_quote_assignments 
        SET status = $1, responded_at = NOW(), response_notes = $2, updated_at = NOW()
        WHERE contractor_id = $3 AND request_id = $4
      `, [response, notes || null, contractorId, requestId]);
      
      // Update quote request status based on contractor responses
      await this.updateQuoteRequestStatusBasedOnContractorResponses(requestId);
      
      // Audit log
      auditLogger.quote('CONTRACTOR_RESPONSE_RECORDED', {
        contractor_id: contractorId,
        request_id: requestId,
        response,
        notes: notes || 'No notes provided'
      });
      
      logger.info('Contractor responded to quote request', {
        contractor_id: contractorId,
        request_id: requestId,
        response
      });
      
      return {
        success: true,
        message: `Quote request ${response} successfully`,
        response,
        responded_at: new Date().toISOString()
      };
      
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessRuleError) {
        throw error;
      }
      
      logger.error('Failed to record contractor response', {
        contractor_id: contractorId,
        request_id: requestId,
        response,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ contractor_id: contractorId });
    }
  }

  /**
   * Update quote request status based on contractor responses
   */
  private async updateQuoteRequestStatusBasedOnContractorResponses(requestId: string): Promise<void> {
    try {
      // Get all assignments for this request with their statuses
      const assignmentsResult = await database.query(`
        SELECT status, COUNT(*) as count
        FROM contractor_quote_assignments 
        WHERE request_id = $1
        GROUP BY status
      `, [requestId]);
      
      const assignmentCounts = assignmentsResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);
      
      // Determine new quote request status based on assignment responses
      let newQuoteStatus = 'pending';
      
      if (assignmentCounts.accepted > 0) {
        // At least one contractor accepted - status becomes 'in-progress'
        newQuoteStatus = 'in-progress';
      } else if (assignmentCounts.rejected > 0 && !assignmentCounts.accepted && !assignmentCounts.assigned && !assignmentCounts.viewed) {
        // All contractors rejected - status becomes 'rejected'
        newQuoteStatus = 'rejected';
      }
      
      // Update quote request status and timestamp
      await database.query(`
        UPDATE quote_requests 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `, [newQuoteStatus, requestId]);
      
      logger.info('Quote request status updated based on contractor responses', {
        request_id: requestId,
        new_status: newQuoteStatus,
        assignment_counts: assignmentCounts
      });
      
    } catch (error) {
      logger.error('Failed to update quote request status', {
        request_id: requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - this is a supporting operation that shouldn't fail the main flow
    }
  }
  
  // Private helper methods
  
  private async validateSystemSize(systemSizeKwp: number): Promise<void> {
    const _config = await this.getBusinessConfig('quote_rules');
    const maxSize = 1000; // Default reasonable maximum
    
    if (systemSizeKwp > maxSize) {
      throw new BusinessRuleError(
        `System size cannot exceed ${maxSize} kWp`,
        'SYSTEM_SIZE_TOO_LARGE',
        { provided: systemSizeKwp, maximum: maxSize }
      );
    }
  }
  
  private async validateQuotePricing(pricePerKwp: number, basePrice: number, systemSizeKwp: number): Promise<void> {
    const _config = await this.getBusinessConfig('pricing_rules');
    const maxPricePerKwp = _config.max_price_per_kwp || 2000;
    
    if (pricePerKwp > maxPricePerKwp) {
      throw new BusinessRuleError(
        `Price per kWp cannot exceed ${maxPricePerKwp} SAR`,
        'PRICE_PER_KWP_TOO_HIGH',
        { provided: pricePerKwp, maximum: maxPricePerKwp }
      );
    }
    
    // Validate total price consistency
    const expectedBasePrice = Math.round(pricePerKwp * systemSizeKwp * 100) / 100;
    const priceDifference = Math.abs(basePrice - expectedBasePrice);
    
    if (priceDifference > 0.01) { // Allow for small rounding differences
      throw new BusinessRuleError(
        'Base price does not match price per kWp calculation',
        'PRICE_CALCULATION_MISMATCH',
        { base_price: basePrice, calculated_price: expectedBasePrice }
      );
    }
  }
  
  private async updateRequestStatusIfNeeded(requestId: string): Promise<void> {
    const quoteCount = await database.query(
      'SELECT COUNT(*) as count FROM contractor_quotes WHERE request_id = $1',
      [requestId]
    );
    
    const count = parseInt(quoteCount.rows[0].count);
    
    if (count === 1) {
      // First quote received, update status
      await database.query(
        "UPDATE quote_requests SET status = 'quotes_received', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [requestId]
      );
    }
  }
  
  private async getBusinessConfig(configKey: string): Promise<any> {
    const result = await database.query(
      'SELECT config_value FROM business_config WHERE config_key = $1 AND is_active = true',
      [configKey]
    );
    
    return result.rows[0]?.config_value || {};
  }

  /**
   * Fetch contractor information from contractor service
   */
  private async fetchContractorInfo(contractorId: string): Promise<any | null> {
    try {
      // First try contractor service
      const response = await axios.get(`${this.contractorServiceUrl}/api/contractors/${contractorId}`, {
        timeout: 5000,
        headers: {
          'x-service': 'quote-service'
        }
      });
      
      if (response.data?.success && response.data?.data) {
        const contractor = response.data.data;
        return {
          id: contractor.id,
          business_name: contractor.business_name || 'Solar Company',
          business_name_ar: contractor.business_name_ar,
          status: contractor.status,
          verification_level: contractor.verification_level || 0
        };
      }
    } catch (error) {
      logger.debug('Contractor service lookup failed, trying auth service fallback', {
        contractor_id: contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Fallback: Get contractor data from auth service
    try {
      const { Pool } = require('pg');
      const authPool = new Pool({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: '12345',
        database: 'rabhan_auth'
      });
      
      const authResult = await authPool.query(
        'SELECT id, first_name, last_name, email, phone, company_name FROM contractors WHERE id = $1',
        [contractorId]
      );
      
      await authPool.end();
      
      if (authResult.rows.length > 0) {
        const contractor = authResult.rows[0];
        return {
          id: contractor.id,
          business_name: contractor.company_name || `${contractor.first_name} ${contractor.last_name}`,
          business_name_ar: contractor.company_name || `${contractor.first_name} ${contractor.last_name}`,
          status: 'active',
          verification_level: 1,
          email: contractor.email,
          phone: contractor.phone,
          user_type: 'contractor'
        };
      }
    } catch (authError) {
      logger.error('Failed to fetch contractor info from auth service fallback', {
        contractor_id: contractorId,
        error: authError instanceof Error ? authError.message : 'Unknown error'
      });
    }
    
    // Final fallback: Return a placeholder with contractor ID info
    logger.warn('Using placeholder contractor data - data consistency issue detected', {
      contractor_id: contractorId
    });
    
    return {
      id: contractorId,
      business_name: `Contractor ${contractorId.substring(0, 8)}`,
      business_name_ar: `مقاول ${contractorId.substring(0, 8)}`,
      status: 'unknown',
      verification_level: 0,
      email: 'unknown@contractor.com',
      phone: '+966XXXXXXXX',
      user_type: 'contractor',
      is_placeholder: true
    };
  }

  /**
   * Notify contractors about new quote request assignment
   */
  private async notifyContractorsOfNewRequest(requestId: string, contractorIds: string[]): Promise<void> {
    try {
      // Create contractor assignments in the database
      for (const contractorId of contractorIds) {
        await database.query(`
          INSERT INTO contractor_quote_assignments (
            request_id, contractor_id, status, assigned_at, created_at, updated_at
          ) VALUES ($1, $2, 'assigned', NOW(), NOW(), NOW())
          ON CONFLICT (request_id, contractor_id) DO NOTHING
        `, [requestId, contractorId]);
      }

      logger.info('Contractors notified of new quote request', {
        request_id: requestId,
        contractor_ids: contractorIds,
        count: contractorIds.length
      });

      // TODO: Add email/SMS notification here
      // await this.sendContractorNotifications(requestId, contractorIds);
      
    } catch (error) {
      logger.error('Failed to notify contractors', {
        request_id: requestId,
        contractor_ids: contractorIds,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw error - notification failure shouldn't break quote request creation
    }
  }

  /**
   * Enrich contractor data for selected contractors
   */
  private async enrichContractorDetails(selectedContractors: string[]): Promise<{ [key: string]: any }> {
    const contractorDetails: { [key: string]: any } = {};
    
    if (!selectedContractors || selectedContractors.length === 0) {
      return contractorDetails;
    }

    // Fetch contractor information in parallel
    const contractorPromises = selectedContractors.map(async (contractorId) => {
      const info = await this.fetchContractorInfo(contractorId);
      if (info) {
        contractorDetails[contractorId] = info;
      }
    });

    await Promise.all(contractorPromises);
    return contractorDetails;
  }
  
  private async formatQuoteRequest(row: any, includeContractorDetails: boolean = false, userRole?: string): Promise<any> {
    const propertyDetails = typeof row.property_details === 'string' 
      ? JSON.parse(row.property_details) 
      : row.property_details || {};

    const baseData = {
      id: row.id,
      user_id: row.user_id,
      property_details: propertyDetails,
      electricity_consumption: row.electricity_consumption,
      system_size_kwp: parseFloat(row.system_size_kwp),
      location_lat: row.location_lat ? parseFloat(row.location_lat) : undefined,
      location_lng: row.location_lng ? parseFloat(row.location_lng) : undefined,
      location_address: row.location_address,
      roof_size_sqm: row.roof_size_sqm ? parseFloat(row.roof_size_sqm) : undefined,
      service_area: row.service_area,
      status: row.status,
      inspection_dates: row.inspection_dates || [],
      selected_contractors: row.selected_contractors || [],
      max_contractors: row.max_contractors,
      inspection_penalty_acknowledged: row.inspection_penalty_acknowledged,
      penalty_amount: parseFloat(row.penalty_amount || 0),
      created_at: row.created_at,
      updated_at: row.updated_at,
      cancelled_at: row.cancelled_at,
      cancellation_reason: row.cancellation_reason,
      // Frontend expected fields
      contact_phone: propertyDetails.contact_phone || '',
      quotes_count: (userRole && userRole !== 'admin') ? (row.approved_quote_count || 0) : (row.quote_count || 0),
      approved_quote_count: row.approved_quote_count || 0
    };

    // Enrich with contractor details if requested
    if (includeContractorDetails) {
      // Get assigned contractors for this quote request
      const assignedContractorsQuery = await database.query(`
        SELECT cqa.contractor_id, cqa.status as assignment_status, cqa.assigned_at, cqa.responded_at
        FROM contractor_quote_assignments cqa
        WHERE cqa.request_id = $1
        ORDER BY cqa.assigned_at ASC
      `, [baseData.id]);
      
      if (assignedContractorsQuery.rows.length > 0) {
        const assignedContractorIds = assignedContractorsQuery.rows.map(row => row.contractor_id);
        const contractorDetails = await this.enrichContractorDetails(assignedContractorIds);
        
        // Combine contractor details with assignment status
        const contractorsWithStatus = assignedContractorsQuery.rows.map(assignment => ({
          contractor_id: assignment.contractor_id,
          assignment_status: assignment.assignment_status,
          assigned_at: assignment.assigned_at,
          responded_at: assignment.responded_at,
          contractor_info: contractorDetails[assignment.contractor_id] || null
        }));
        
        return {
          ...baseData,
          assigned_contractors: contractorsWithStatus,
          contractor_details: contractorDetails
        };
      }
      
      // Fallback: include selected contractors if no assigned contractors
      if (baseData.selected_contractors.length > 0) {
        const contractorDetails = await this.enrichContractorDetails(baseData.selected_contractors);
        return {
          ...baseData,
          contractor_details: contractorDetails
        };
      }
    }

    return baseData;
  }
  
  private formatContractorQuote(row: any): any {
    return {
      id: row.id,
      request_id: row.request_id,
      contractor_id: row.contractor_id,
      base_price: parseFloat(row.base_price),
      price_per_kwp: parseFloat(row.price_per_kwp),
      overprice_amount: parseFloat(row.overprice_amount),
      total_user_price: parseFloat(row.total_user_price),
      system_specs: row.system_specs,
      installation_timeline_days: row.installation_timeline_days,
      warranty_terms: row.warranty_terms,
      maintenance_terms: row.maintenance_terms,
      panels_brand: row.panels_brand,
      panels_model: row.panels_model,
      panels_quantity: row.panels_quantity,
      inverter_brand: row.inverter_brand,
      inverter_model: row.inverter_model,
      inverter_quantity: row.inverter_quantity,
      admin_status: row.admin_status,
      admin_notes: row.admin_notes,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at,
      rejection_reason: row.rejection_reason,
      is_selected: row.is_selected,
      selected_at: row.selected_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
      // System specifications
      solar_system_capacity_kwp: row.solar_system_capacity_kwp,
      storage_capacity_kwh: row.storage_capacity_kwh,
      monthly_production_kwh: row.monthly_production_kwh,
      // Additional fields for API response
      days_until_expiry: row.days_until_expiry,
      // Line items
      line_items: row.line_items || []
    };
  }

  /**
   * Get available contractors for quote requests
   * This method queries auth service contractors table first (to ensure they can login),
   * then enriches with contractor service details
   */
  async getAvailableContractors(filters: any): Promise<any[]> {
    try {
      logger.info('Getting available contractors', { filters });

      // First, get contractors from auth service contractors table
      // These are contractors who can actually login
      const authQuery = `
        SELECT id, company_name, cr_number, vat_number, business_type,
               email, phone, status, created_at
        FROM contractors
        WHERE status IN ('ACTIVE', 'PENDING')
        ORDER BY created_at DESC
      `;

      const authResult = await this.authDatabase.query(authQuery);

      if (authResult.rows.length === 0) {
        logger.warn('No contractors found in auth database');
        return [];
      }

      logger.info(`Found ${authResult.rows.length} contractors with auth accounts`);

      // Use contractors from auth service directly (they contain all necessary info)
      const contractors = [];
      for (const authContractor of authResult.rows) {
        // Convert auth contractor to frontend format with all expected fields
        contractors.push({
          id: authContractor.id,
          email: authContractor.email,
          phone: authContractor.phone,
          status: authContractor.status,
          business_name: authContractor.company_name,
          business_name_ar: authContractor.company_name, // Default to same as English
          company_name: authContractor.company_name,
          business_type: authContractor.business_type,
          cr_number: authContractor.cr_number,
          vat_number: authContractor.vat_number,
          verification_level: authContractor.sama_verified ? 3 : 1,
          average_rating: 4.5, // Default rating
          total_reviews: 10, // Default reviews
          completed_projects: 5, // Default projects
          total_projects: 5, // Default total projects
          years_experience: 5, // Default experience
          city: 'Riyadh', // Default city
          region: 'Riyadh Region', // Default region
          service_areas: ['Riyadh', 'Riyadh Region'], // Default service areas
          service_categories: ['RESIDENTIAL_SOLAR'], // Default categories
          created_at: authContractor.created_at
        });
      }

      // Sort contractors
      contractors.sort((a, b) => {
        if (filters.sort_by === 'average_rating') {
          return filters.sort_order === 'desc' ? b.average_rating - a.average_rating : a.average_rating - b.average_rating;
        }
        return filters.sort_order === 'desc' ? 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime() :
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Apply limit
      const limited = contractors.slice(0, filters.limit || 20);

      logger.info(`Returning ${limited.length} available contractors`, {
        total_auth_contractors: authResult.rows.length,
        filtered_contractors: limited.length
      });

      return limited;

    } catch (error) {
      logger.error('Failed to get available contractors', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        filters
      });
      throw error;
    }
  }

  /**
   * Submit detailed quotation with line items
   */
  async submitDetailedQuotation(contractorId: string, data: any): Promise<any> {
    const timer = performanceLogger.startTimer('submit_detailed_quotation');
    const dbClient = await database.getClient();
    
    try {
      await dbClient.query('BEGIN');
      
      // Get current business config for pricing calculations
      const configQuery = 'SELECT config_value FROM business_config WHERE config_key = $1';
      const pricingConfig = await dbClient.query(configQuery, ['pricing_rules']);
      const config = pricingConfig.rows[0]?.config_value || {};
      
      const commissionPercent = config.platform_commission_percent || 15;
      const overPricePercent = config.platform_overprice_percent || 10;
      const vatRate = 15; // Fixed VAT rate
      
      // Create new contractor quote with quotation header info
      const createQuoteQuery = `
        INSERT INTO contractor_quotes (
          contractor_id,
          request_id,
          contractor_vat_number,
          installation_deadline,
          payment_terms,
          solar_system_capacity_kwp,
          storage_capacity_kwh,
          monthly_production_kwh,
          base_price,
          price_per_kwp,
          installation_timeline_days,
          system_specs,
          admin_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending_review'
        ) RETURNING *
      `;
      
      // Calculate base price from line items
      const totalBasePrice = data.line_items?.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unit_price), 0) || 0;
      
      const quoteResult = await dbClient.query(createQuoteQuery, [
        contractorId,
        data.request_id || null, // Allow null for direct quotations
        data.contractor_vat_number,
        data.installation_deadline,
        data.payment_terms,
        data.solar_system_capacity_kwp,
        data.storage_capacity_kwh,
        data.monthly_production_kwh,
        totalBasePrice,
        data.price_per_kwp || (totalBasePrice / (data.solar_system_capacity_kwp || 1)),
        data.installation_timeline_days || 30,
        data.system_specs || {}
      ]);
      
      if (quoteResult.rows.length === 0) {
        throw new Error('Failed to create quotation');
      }
      
      const quotation = quoteResult.rows[0];
      
      // Insert line items with calculated pricing
      const lineItems = [];
      if (data.line_items && data.line_items.length > 0) {
        for (const item of data.line_items) {
          const totalPrice = item.quantity * item.unit_price;
          const rabhanCommission = totalPrice * (commissionPercent / 100);
          const rabhanOverPrice = totalPrice * (overPricePercent / 100);
          const userPrice = totalPrice + rabhanOverPrice;
          const vendorNetPrice = totalPrice - rabhanCommission;
          
          const lineItemQuery = `
            INSERT INTO quotation_line_items (
              quotation_id, item_name, description, units, unit_price
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `;
          
          const lineItemResult = await dbClient.query(lineItemQuery, [
            quotation.id,
            item.item_name,
            item.description,
            item.quantity,
            item.unit_price
          ]);
        
          lineItems.push(lineItemResult.rows[0]);
        }
      }
      
      await dbClient.query('COMMIT');
      
      const result = {
        ...quotation,
        line_items: lineItems,
        totals: this.calculateQuotationTotals(lineItems, vatRate)
      };
      
      logger.info('Detailed quotation submitted successfully', {
        contractor_id: contractorId,
        quotation_id: quotation.id,
        line_items_count: lineItems.length,
        commission_percent: commissionPercent,
        overprice_percent: overPricePercent
      });
      
      return result;
      
    } catch (error) {
      await dbClient.query('ROLLBACK');
      logger.error('Submit detailed quotation service error', {
        contractor_id: contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      dbClient.release();
      timer.end({ contractor_id: contractorId });
    }
  }
  
  /**
   * Calculate quotation totals from line items
   */
  private calculateQuotationTotals(lineItems: any[], vatRate: number) {
    const totalPrice = lineItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    const totalCommission = lineItems.reduce((sum, item) => sum + parseFloat(item.rabhan_commission), 0);
    const totalOverPrice = lineItems.reduce((sum, item) => sum + parseFloat(item.rabhan_over_price), 0);
    const totalUserPrice = lineItems.reduce((sum, item) => sum + parseFloat(item.user_price), 0);
    const totalVendorNet = lineItems.reduce((sum, item) => sum + parseFloat(item.vendor_net_price), 0);
    const vatAmount = totalVendorNet * (vatRate / 100);
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
   * Get approved quotations for user's quote request
   */
  async getUserApprovedQuotations(requestId: string, userId: string): Promise<any[]> {
    const timer = performanceLogger.startTimer('get_user_approved_quotations');
    
    try {
      const dbClient = await database.getClient();
      
      // Get approved quotations for the request
      const quotationsQuery = `
        SELECT cq.*, c.company_name as contractor_company, c.email as contractor_email
        FROM contractor_quotes cq
        LEFT JOIN contractors c ON cq.contractor_id = c.id
        JOIN quote_requests qr ON cq.request_id = qr.id
        WHERE cq.request_id = $1 
          AND qr.user_id = $2 
          AND cq.admin_status = 'approved'
        ORDER BY cq.created_at DESC
      `;
      
      const quotationsResult = await dbClient.query(quotationsQuery, [requestId, userId]);
      
      if (quotationsResult.rows.length === 0) {
        dbClient.release();
        return [];
      }
      
      // Get line items for each quotation
      const quotations = [];
      for (const quotation of quotationsResult.rows) {
        const lineItemsQuery = `
          SELECT * FROM quotation_line_items 
          WHERE quotation_id = $1 
          ORDER BY serial_number
        `;
        
        const lineItemsResult = await dbClient.query(lineItemsQuery, [quotation.id]);
        const lineItems = lineItemsResult.rows;
        const totals = this.calculateQuotationTotals(lineItems, 15); // 15% VAT
        
        quotations.push({
          ...quotation,
          line_items: lineItems,
          totals: totals
        });
      }
      
      dbClient.release();
      
      logger.info('User approved quotations retrieved successfully', {
        user_id: userId,
        request_id: requestId,
        quotations_count: quotations.length
      });
      
      return quotations;
      
    } catch (error) {
      logger.error('Get user approved quotations service error', {
        user_id: userId,
        request_id: requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: userId, request_id: requestId });
    }
  }

  /**
   * Get specific quotation details for user
   */
  async getUserQuotationDetails(quotationId: string, userId: string): Promise<any> {
    const timer = performanceLogger.startTimer('get_user_quotation_details');
    const dbClient = await database.getClient();
    
    try {
      // Get quotation with ownership verification
      const quotationQuery = `
        SELECT cq.*, c.company_name as contractor_company, 
               c.email as contractor_email, c.phone as contractor_phone,
               qr.user_id
        FROM contractor_quotes cq
        LEFT JOIN contractors c ON cq.contractor_id = c.id
        JOIN quote_requests qr ON cq.request_id = qr.id
        WHERE cq.id = $1 
          AND qr.user_id = $2 
          AND cq.admin_status = 'approved'
      `;
      
      const quotationResult = await dbClient.query(quotationQuery, [quotationId, userId]);
      
      if (quotationResult.rows.length === 0) {
        throw new NotFoundError('Quotation not found or not accessible');
      }
      
      // Get line items
      const lineItemsQuery = `
        SELECT * FROM quotation_line_items 
        WHERE quotation_id = $1 
        ORDER BY serial_number
      `;
      
      const lineItemsResult = await dbClient.query(lineItemsQuery, [quotationId]);
      const lineItems = lineItemsResult.rows;
      const totals = this.calculateQuotationTotals(lineItems, 15); // 15% VAT
      
      const result = {
        ...quotationResult.rows[0],
        line_items: lineItems,
        totals: totals
      };
      
      logger.info('User quotation details retrieved successfully', {
        user_id: userId,
        quotation_id: quotationId,
        contractor_id: result.contractor_id,
        total_user_price: totals.total_user_price
      });
      
      return result;
      
    } catch (error) {
      logger.error('Get user quotation details service error', {
        user_id: userId,
        quotation_id: quotationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      dbClient.release();
      timer.end({ user_id: userId, quotation_id: quotationId });
    }
  }

  /**
   * Select a quotation - marks one as selected and others as not selected
   */
  async selectUserQuotation(quotationId: string, userId: string, selectionReason?: string): Promise<any> {
    const timer = performanceLogger.startTimer('select_user_quotation');
    const dbClient = await database.getClient();
    
    try {
      await dbClient.query('BEGIN');
      
      // First, verify user owns this quotation and it's approved
      const verifyQuery = `
        SELECT cq.*, qr.user_id, qr.id as request_id
        FROM contractor_quotes cq
        JOIN quote_requests qr ON cq.request_id = qr.id
        WHERE cq.id = $1 
          AND qr.user_id = $2 
          AND cq.admin_status = 'approved'
          AND cq.is_selected = false
      `;
      
      const verifyResult = await dbClient.query(verifyQuery, [quotationId, userId]);
      
      if (verifyResult.rows.length === 0) {
        throw new NotFoundError('Quotation not found, not approved, or already selected');
      }
      
      const quotation = verifyResult.rows[0];
      const requestId = quotation.request_id;
      
      // Update selected quotation
      const selectQuery = `
        UPDATE contractor_quotes 
        SET 
          is_selected = true,
          selected_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const selectResult = await dbClient.query(selectQuery, [quotationId]);
      
      // Mark all other quotations for this request as not selected
      const rejectOthersQuery = `
        UPDATE contractor_quotes 
        SET 
          is_selected = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE request_id = $1 
          AND id != $2
        RETURNING id, contractor_id
      `;
      
      const rejectResult = await dbClient.query(rejectOthersQuery, [requestId, quotationId]);
      
      // Update quote request status
      const updateRequestQuery = `
        UPDATE quote_requests 
        SET 
          status = 'quote_selected',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await dbClient.query(updateRequestQuery, [requestId]);
      
      // Get line items and totals for selected quotation
      const lineItemsQuery = `
        SELECT * FROM quotation_line_items 
        WHERE quotation_id = $1 
        ORDER BY serial_number
      `;
      
      const lineItemsResult = await dbClient.query(lineItemsQuery, [quotationId]);
      const lineItems = lineItemsResult.rows;
      const totals = this.calculateQuotationTotals(lineItems, 15); // 15% VAT
      
      await dbClient.query('COMMIT');
      
      const result = {
        selectedQuotation: {
          ...selectResult.rows[0],
          line_items: lineItems,
          totals: totals
        },
        rejectedQuotations: rejectResult.rows,
        selectionReason: selectionReason
      };
      
      // Log the selection
      auditLogger.financial('QUOTATION_SELECTED', {
        user_id: userId,
        quotation_id: quotationId,
        contractor_id: quotation.contractor_id,
        request_id: requestId,
        total_amount: totals.total_user_price,
        selection_reason: selectionReason,
        rejected_count: rejectResult.rows.length,
        timestamp: new Date().toISOString()
      });
      
      logger.info('User quotation selected successfully', {
        user_id: userId,
        quotation_id: quotationId,
        request_id: requestId,
        contractor_id: quotation.contractor_id,
        rejected_quotations: rejectResult.rows.length,
        total_amount: totals.total_user_price
      });
      
      return result;
      
    } catch (error) {
      await dbClient.query('ROLLBACK');
      logger.error('Select user quotation service error', {
        user_id: userId,
        quotation_id: quotationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      dbClient.release();
      timer.end({ user_id: userId, quotation_id: quotationId });
    }
  }

  /**
   * Get contractor's own quotes with pagination
   */
  async getContractorQuotes(contractorId: string, filters: any): Promise<{ quotes: any[], total: number }> {
    const timer = performanceLogger.startTimer('get_contractor_quotes');
    const dbClient = await database.getClient();
    
    try {
      const { page = 1, limit = 10, status, sort_by = 'created_at', sort_order = 'desc' } = filters;
      const offset = (page - 1) * limit;
      
      // Build WHERE clause
      let whereClause = 'WHERE cq.contractor_id = $1';
      const queryParams = [contractorId];
      let paramCount = 1;
      
      if (status) {
        paramCount++;
        whereClause += ` AND cq.admin_status = $${paramCount}`;
        queryParams.push(status);
      }
      
      // Build ORDER BY clause
      const validSortFields = ['created_at', 'updated_at', 'admin_status', 'base_price'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM contractor_quotes cq
        ${whereClause}
      `;
      
      const countResult = await dbClient.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      // Get quotes with line items
      const quotesQuery = `
        SELECT 
          cq.*,
          qr.user_id,
          qr.system_size_kwp as request_system_size,
          qr.location_address,
          qr.service_area,
          COALESCE(
            json_agg(
              json_build_object(
                'id', qli.id,
                'item_name', qli.item_name,
                'description', qli.description,
                'units', qli.units,
                'unit_price', qli.unit_price,
                'total_price', qli.total_price,
                'rabhan_commission', qli.rabhan_commission,
                'rabhan_overprice', qli.rabhan_overprice,
                'user_price', qli.user_price,
                'vendor_net_price', qli.vendor_net_price,
                'line_order', qli.line_order
              ) ORDER BY qli.line_order
            ) FILTER (WHERE qli.id IS NOT NULL), 
            '[]'
          ) as line_items
        FROM contractor_quotes cq
        LEFT JOIN quote_requests qr ON cq.request_id = qr.id
        LEFT JOIN quotation_line_items qli ON cq.id = qli.quotation_id
        ${whereClause}
        GROUP BY cq.id, qr.user_id, qr.system_size_kwp, qr.location_address, qr.service_area
        ORDER BY cq.${sortField} ${sortDirection}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      queryParams.push(limit.toString(), offset.toString());
      const quotesResult = await dbClient.query(quotesQuery, queryParams);
      
      // Calculate totals for each quote
      const quotes = quotesResult.rows.map(quote => {
        const lineItems = quote.line_items || [];
        const totals = lineItems.length > 0 ? this.calculateQuotationTotals(lineItems, 15) : null;
        
        return {
          ...quote,
          line_items: lineItems,
          totals: totals,
          status_display: this.getStatusDisplay(quote.admin_status),
          created_at_formatted: new Date(quote.created_at).toLocaleDateString('en-GB'),
          installation_deadline_formatted: quote.installation_deadline ? 
            new Date(quote.installation_deadline).toLocaleDateString('en-GB') : null
        };
      });
      
      logger.info('Contractor quotes retrieved successfully', {
        contractor_id: contractorId,
        total_quotes: total,
        returned_quotes: quotes.length,
        filters: filters
      });
      
      return { quotes, total };
      
    } catch (error) {
      logger.error('Failed to get contractor quotes', {
        contractor_id: contractorId,
        filters: filters,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    } finally {
      dbClient.release();
      timer.end({ contractor_id: contractorId });
    }
  }

  /**
   * Get status display text
   */
  private getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending_review': 'Pending Review',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'revision_needed': 'Revision Needed'
    };
    return statusMap[status] || status;
  }
}

export const quoteService = new QuoteService();