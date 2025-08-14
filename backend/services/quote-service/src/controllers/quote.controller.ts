import { Response } from 'express';
import { quoteService } from '../services/quote.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger, performanceLogger } from '../utils/logger';
import { asyncHandler } from '../middleware/error.middleware';

export class QuoteController {
  
  /**
   * Create a new quote request (User)
   */
  createQuoteRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_create_quote_request');
    
    try {
      // TEMPORARY FIX FOR TESTING - Use mock user ID when no auth
      const userId = req.user?.id || 'test-user-123';
      const quoteRequest = await quoteService.createQuoteRequest(userId, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Quote request created successfully',
        data: {
          quote_request: quoteRequest
        }
      });
      
      logger.info('Quote request created via API', {
        user_id: userId,
        request_id: quoteRequest.id
      });
      
    } catch (error) {
      logger.error('Create quote request API error', {
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });
  
  /**
   * Get user's quote requests
   */
  getUserQuoteRequests = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_user_quote_requests');
    
    try {
      const userId = req.user!.id;
      const filters = {
        status: req.query.status as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sort_by: req.query.sort_by as string || 'created_at',
        sort_order: req.query.sort_order as string || 'desc'
      };
      
      const result = await quoteService.getUserQuoteRequests(userId, filters);
      
      res.json({
        success: true,
        message: 'Quote requests retrieved successfully',
        data: {
          requests: result.requests,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            pages: Math.ceil(result.total / result.limit)
          }
        }
      });
      
    } catch (error) {
      logger.error('Get user quote requests API error', {
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });
  
  /**
   * Get a specific quote request by ID
   */
  getQuoteRequestById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_quote_request_by_id');
    
    try {
      const { id } = req.params;
      const userId = req.user!.role === 'admin' ? undefined : req.user!.id;
      
      const quoteRequest = await quoteService.getQuoteRequestById(id, userId);
      
      res.json({
        success: true,
        message: 'Quote request retrieved successfully',
        data: {
          quote_request: quoteRequest
        }
      });
      
    } catch (error) {
      logger.error('Get quote request by ID API error', {
        request_id: req.params.id,
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ request_id: req.params.id });
    }
  });
  
  /**
   * Submit a quote (Contractor)
   */
  submitQuote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_submit_quote');
    
    try {
      const contractorId = req.user!.id;
      const quote = await quoteService.submitQuote(contractorId, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Quote submitted successfully',
        data: {
          quote: quote
        }
      });
      
      logger.info('Quote submitted via API', {
        contractor_id: contractorId,
        quote_id: quote.id,
        request_id: quote.request_id
      });
      
    } catch (error) {
      logger.error('Submit quote API error', {
        contractor_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: req.user?.id });
    }
  });
  
  /**
   * Get quotes for a request
   */
  getQuotesForRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_quotes_for_request');
    
    try {
      const { request_id } = req.params;
      const filters = {
        status: req.query.status as string,
        sort_by: req.query.sort_by as string || 'base_price',
        sort_order: req.query.sort_order as string || 'asc',
        userRole: req.user!.role
      };
      
      // Verify user has access to this request
      if (req.user!.role !== 'admin') {
        await quoteService.getQuoteRequestById(request_id, req.user!.id);
      }
      
      const quotes = await quoteService.getQuotesForRequest(request_id, filters);
      
      res.json({
        success: true,
        message: 'Quotes retrieved successfully',
        data: {
          quotes: quotes,
          request_id: request_id,
          count: quotes.length
        }
      });
      
    } catch (error) {
      logger.error('Get quotes for request API error', {
        request_id: req.params.request_id,
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ request_id: req.params.request_id });
    }
  });
  
  /**
   * Get contractor's own quotes
   */
  getContractorQuotes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_contractor_quotes');
    
    try {
      const contractorId = req.user!.id;
      const filters = {
        status: req.query.status as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sort_by: req.query.sort_by as string || 'created_at',
        sort_order: req.query.sort_order as string || 'desc'
      };
      
      // Get contractor's quotes with pagination
      const result = await quoteService.getContractorQuotes(contractorId, filters);
      
      res.json({
        success: true,
        message: 'Contractor quotes retrieved successfully',
        data: {
          quotes: result.quotes,
          pagination: {
            total: result.total,
            page: filters.page,
            limit: filters.limit,
            pages: Math.ceil(result.total / filters.limit)
          }
        }
      });
      
    } catch (error) {
      logger.error('Get contractor quotes API error', {
        contractor_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: req.user?.id });
    }
  });
  
  /**
   * Compare quotes
   */
  compareQuotes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_compare_quotes');
    
    try {
      const userId = req.user!.id;
      const { request_id, quote_ids, comparison_criteria } = req.body;
      
      const comparison = await quoteService.compareQuotes(
        userId,
        request_id,
        quote_ids,
        comparison_criteria
      );
      
      res.json({
        success: true,
        message: 'Quotes compared successfully',
        data: {
          comparison: comparison
        }
      });
      
      logger.info('Quotes compared via API', {
        user_id: userId,
        request_id: request_id,
        quote_count: quote_ids.length
      });
      
    } catch (error) {
      logger.error('Compare quotes API error', {
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });
  
  /**
   * Select a quote
   */
  selectQuote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_select_quote');
    
    try {
      const userId = req.user!.id;
      const { quote_id, selection_reason } = req.body;
      
      const selectedQuote = await quoteService.selectQuote(userId, quote_id, selection_reason);
      
      res.json({
        success: true,
        message: 'Quote selected successfully',
        data: {
          selected_quote: selectedQuote,
          next_steps: [
            'Sign installation agreement',
            'Process payment',
            'Schedule installation'
          ]
        }
      });
      
      logger.info('Quote selected via API', {
        user_id: userId,
        quote_id: quote_id
      });
      
    } catch (error) {
      logger.error('Select quote API error', {
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });
  
  /**
   * Get available contractors for quote requests (only contractors who can login)
   */
  getAvailableContractors = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_available_contractors');
    
    try {
      const filters = {
        region: req.query.region as string,
        city: req.query.city as string,
        min_rating: parseFloat(req.query.min_rating as string) || 0,
        verification_level: parseInt(req.query.verification_level as string) || 0,
        limit: parseInt(req.query.limit as string) || 20,
        sort_by: req.query.sort_by as string || 'average_rating',
        sort_order: req.query.sort_order as string || 'desc'
      };

      const contractors = await quoteService.getAvailableContractors(filters);
      
      res.json({
        success: true,
        message: 'Available contractors retrieved successfully',
        data: {
          contractors: contractors,
          total: contractors.length
        }
      });
      
    } catch (error: any) {
      logger.error('Failed to get available contractors', {
        error: error.message,
        stack: error.stack,
        user_id: req.user?.id,
        filters: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get available contractors',
        error: {
          code: 'CONTRACTORS_FETCH_ERROR',
          message: error.message
        }
      });
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });

  /**
   * Get available requests for contractors (matching by location/service area)
   */
  getAvailableRequests = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_available_requests');
    
    try {
      const _contractorId = req.user!.id;
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        min_system_size: parseFloat(req.query.min_system_size as string),
        max_system_size: parseFloat(req.query.max_system_size as string),
        service_area: req.query.service_area as string
      };
      
      // TODO: Implement contractor service area matching logic
      // This would need integration with contractor service to get contractor's service areas
      
      res.json({
        success: true,
        message: 'Available quote requests retrieved successfully',
        data: {
          available_requests: [],
          pagination: {
            total: 0,
            page: filters.page,
            limit: filters.limit,
            pages: 0
          }
        }
      });
      
    } catch (error) {
      logger.error('Get available requests API error', {
        contractor_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: req.user?.id });
    }
  });
  
  /**
   * Update quote request status
   */
  updateQuoteRequestStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_update_quote_request_status');
    
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { status } = req.body;
      
      // Verify ownership
      await quoteService.getQuoteRequestById(id, userId);
      
      // TODO: Implement status update logic in service
      
      res.json({
        success: true,
        message: 'Quote request status updated successfully',
        data: {
          request_id: id,
          new_status: status
        }
      });
      
    } catch (error) {
      logger.error('Update quote request status API error', {
        request_id: req.params.id,
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ request_id: req.params.id });
    }
  });

  /**
   * Get assigned quote requests for a contractor
   */
  getContractorAssignedRequests = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_contractor_assigned_requests');
    
    try {
      const contractorId = req.user!.id;
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        status: req.query.status as string
      };
      
      const result = await quoteService.getContractorAssignedRequests(contractorId, filters);
      
      res.json({
        success: true,
        message: 'Assigned quote requests retrieved successfully',
        data: {
          assigned_requests: result.assignments,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            pages: Math.ceil(result.total / result.limit)
          },
          contractor_id: contractorId
        }
      });
      
      logger.info('Contractor assigned requests retrieved via API', {
        contractor_id: contractorId,
        page: filters.page,
        limit: filters.limit,
        total_found: result.assignments.length
      });
      
    } catch (error) {
      logger.error('Get contractor assigned requests API error', {
        contractor_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: req.user?.id });
    }
  });

  /**
   * Contractor respond to quote request (accept/reject)
   */
  contractorRespondToRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_contractor_respond_to_request');
    
    try {
      const { request_id } = req.params;
      const contractorId = req.user!.id;
      const { response, notes } = req.body;
      
      const result = await quoteService.contractorRespondToRequest(
        contractorId,
        request_id, 
        response,
        notes
      );
      
      res.json({
        success: true,
        message: `Request ${response} successfully`,
        data: {
          assignment: result,
          next_steps: response === 'accepted' ? 
            ['Submit your quote for this request', 'Wait for admin approval'] :
            ['Request has been declined']
        }
      });
      
      logger.info('Contractor responded to quote request', {
        contractor_id: contractorId,
        request_id,
        response,
        notes: notes ? 'Provided' : 'None'
      });
      
    } catch (error) {
      logger.error('Contractor respond to request API error', {
        contractor_id: req.user?.id,
        request_id: req.params.request_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: req.user?.id });
    }
  });

  /**
   * Submit detailed quotation with line items (Contractor)
   */
  submitDetailedQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_submit_detailed_quotation');
    
    try {
      const contractorId = req.user!.id;
      const quotationData = req.body;
      
      const quotation = await quoteService.submitDetailedQuotation(contractorId, quotationData);
      
      res.status(201).json({
        success: true,
        message: 'Detailed quotation submitted successfully',
        data: {
          quotation: quotation,
          status: 'pending_admin_approval',
          next_steps: [
            'Wait for admin review and approval',
            'You will be notified once the quotation is reviewed'
          ]
        }
      });
      
      logger.info('Detailed quotation submitted via API', {
        contractor_id: contractorId,
        quotation_id: quotation.id,
        request_id: quotation.request_id,
        line_items_count: quotation.line_items?.length || 0
      });
      
    } catch (error) {
      logger.error('Submit detailed quotation API error', {
        contractor_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: req.user?.id });
    }
  });

  /**
   * Get approved quotations for user's request (User)
   */
  getUserApprovedQuotations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_user_approved_quotations');
    
    try {
      const userId = req.user!.id;
      const { request_id } = req.params;
      
      // Verify user owns this request
      await quoteService.getQuoteRequestById(request_id, userId);
      
      const quotations = await quoteService.getUserApprovedQuotations(request_id, userId);
      
      res.json({
        success: true,
        message: 'Approved quotations retrieved successfully',
        data: {
          request_id: request_id,
          quotations: quotations,
          count: quotations.length,
          comparison_available: quotations.length > 1
        }
      });
      
      logger.info('User approved quotations retrieved', {
        user_id: userId,
        request_id: request_id,
        quotations_count: quotations.length
      });
      
    } catch (error) {
      logger.error('Get user approved quotations API error', {
        user_id: req.user?.id,
        request_id: req.params.request_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });

  /**
   * Get specific quotation details for user (User)
   */
  getUserQuotationDetails = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_user_quotation_details');
    
    try {
      const userId = req.user!.id;
      const { quotation_id } = req.params;
      
      const quotation = await quoteService.getUserQuotationDetails(quotation_id, userId);
      
      res.json({
        success: true,
        message: 'Quotation details retrieved successfully',
        data: {
          quotation: quotation,
          line_items_count: quotation.line_items?.length || 0,
          is_selectable: quotation.admin_status === 'approved' && !quotation.is_selected
        }
      });
      
      logger.info('User quotation details retrieved', {
        user_id: userId,
        quotation_id: quotation_id,
        contractor_id: quotation.contractor_id
      });
      
    } catch (error) {
      logger.error('Get user quotation details API error', {
        user_id: req.user?.id,
        quotation_id: req.params.quotation_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });

  /**
   * Select a quotation (User)
   */
  selectUserQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_select_user_quotation');
    
    try {
      const userId = req.user!.id;
      const { quotation_id } = req.params;
      const { selection_reason } = req.body;
      
      const result = await quoteService.selectUserQuotation(quotation_id, userId, selection_reason);
      
      res.json({
        success: true,
        message: 'Quotation selected successfully',
        data: {
          selected_quotation: result.selectedQuotation,
          rejected_quotations: result.rejectedQuotations,
          next_steps: [
            'Quotation has been accepted',
            'Contract preparation will begin',
            'You will be contacted for next steps'
          ]
        }
      });
      
      logger.info('User quotation selected successfully', {
        user_id: userId,
        quotation_id: quotation_id,
        contractor_id: result.selectedQuotation.contractor_id,
        request_id: result.selectedQuotation.request_id,
        total_amount: result.selectedQuotation.totals?.total_user_price
      });
      
    } catch (error) {
      logger.error('Select user quotation API error', {
        user_id: req.user?.id,
        quotation_id: req.params.quotation_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });
}

export const quoteController = new QuoteController();