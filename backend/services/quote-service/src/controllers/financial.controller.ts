import { Response } from 'express';
import { financialService } from '../services/financial.service';
import { database } from '../config/database.config';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger, performanceLogger } from '../utils/logger';
import { asyncHandler } from '../middleware/error.middleware';

export class FinancialController {
  
  /**
   * Get current pricing configuration
   */
  getPricingConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_pricing_config');
    
    try {
      const config = await financialService.getPricingConfig();
      
      res.json({
        success: true,
        message: 'Pricing configuration retrieved successfully',
        data: {
          pricing_config: config
        }
      });
      
    } catch (error) {
      logger.error('Get pricing config API error', {
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });
  
  /**
   * Update pricing configuration (Admin only)
   */
  updatePricingConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_update_pricing_config');
    
    try {
      const userId = req.user!.id;
      const updatedConfig = await financialService.updatePricingConfig(req.body, userId);
      
      res.json({
        success: true,
        message: 'Pricing configuration updated successfully',
        data: {
          pricing_config: updatedConfig
        }
      });
      
      logger.info('Pricing configuration updated via API', {
        admin_id: userId,
        changes: Object.keys(req.body)
      });
      
    } catch (error) {
      logger.error('Update pricing config API error', {
        admin_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ admin_id: req.user?.id });
    }
  });
  
  /**
   * Calculate quote financials (for preview)
   */
  calculateQuoteFinancials = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_calculate_quote_financials');
    
    try {
      const { base_price, price_per_kwp, system_size_kwp, custom_config } = req.body;
      
      const calculation = await financialService.calculateQuoteFinancials(
        base_price,
        price_per_kwp,
        system_size_kwp,
        custom_config
      );
      
      res.json({
        success: true,
        message: 'Quote financials calculated successfully',
        data: {
          financial_calculation: calculation
        }
      });
      
    } catch (error) {
      logger.error('Calculate quote financials API error', {
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });
  
  /**
   * Create invoice for approved quote
   */
  createInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_create_invoice');
    
    try {
      const { quote_id, include_vat, vat_rate } = req.body;
      
      const invoice = await financialService.createInvoiceCalculation(
        quote_id,
        include_vat,
        vat_rate
      );
      
      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: {
          invoice: invoice
        }
      });
      
      logger.info('Invoice created via API', {
        user_id: req.user!.id,
        invoice_id: invoice.invoice_id,
        quote_id: quote_id
      });
      
    } catch (error) {
      logger.error('Create invoice API error', {
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });
  
  /**
   * Get financial analytics
   */
  getFinancialAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_financial_analytics');
    
    try {
      const userRole = req.user!.role;
      const userId = req.user!.id;
      
      // Different analytics based on user role
      let analytics = {};
      
      if (userRole === 'admin') {
        // Platform-wide financial analytics
        analytics = {
          total_platform_revenue: 0,
          total_commission_collected: 0,
          total_markup_collected: 0,
          total_invoices_generated: 0,
          average_quote_value: 0,
          top_performing_contractors: [],
          monthly_revenue_trend: []
        };
      } else if (userRole === 'contractor') {
        // Contractor financial analytics
        analytics = {
          total_quotes_submitted: 0,
          total_potential_earnings: 0,
          total_commission_paid: 0,
          net_earnings: 0,
          average_quote_price: 0,
          success_rate: 0,
          pending_payments: 0
        };
      } else {
        // User financial analytics
        analytics = {
          total_quote_requests: 0,
          average_quote_received: 0,
          total_potential_investment: 0,
          selected_quote_value: 0,
          savings_comparison: {}
        };
      }
      
      res.json({
        success: true,
        message: 'Financial analytics retrieved successfully',
        data: {
          analytics,
          user_role: userRole,
          period: 'last_30_days'
        }
      });
      
    } catch (error) {
      logger.error('Get financial analytics API error', {
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });
  
  /**
   * Get quote financial breakdown
   */
  getQuoteFinancialBreakdown = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_quote_financial_breakdown');
    
    try {
      const { quote_id } = req.params;
      const userRole = req.user!.role;
      
      // Get quote financial details from database
      const query = `
        SELECT 
          cq.base_price,
          cq.price_per_kwp,
          cq.overprice_amount,
          cq.total_user_price,
          qr.system_size_kwp
        FROM contractor_quotes cq
        JOIN quote_requests qr ON cq.request_id = qr.id
        WHERE cq.id = $1
      `;
      
      const result = await database.query(query, [quote_id]);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
        return;
      }
      
      const quote = result.rows[0];
      
      // Recalculate with current pricing rules for accuracy
      const financials = await financialService.calculateQuoteFinancials(
        parseFloat(quote.base_price),
        parseFloat(quote.price_per_kwp),
        parseFloat(quote.system_size_kwp)
      );
      
      // Filter response based on user role
      let response = financials;
      
      if (userRole === 'user') {
        // Users only see what they pay
        response = {
          base_price: financials.base_price,
          platform_overprice_percent: financials.platform_overprice_percent,
          overprice_amount: financials.overprice_amount,
          total_user_price: financials.total_user_price,
          price_per_kwp: financials.price_per_kwp,
          system_size_kwp: financials.system_size_kwp
        } as any;
      } else if (userRole === 'contractor') {
        // Contractors see what they receive
        response = {
          base_price: financials.base_price,
          platform_commission_percent: financials.platform_commission_percent,
          commission_amount: financials.commission_amount,
          contractor_net_amount: financials.contractor_net_amount,
          price_per_kwp: financials.price_per_kwp,
          system_size_kwp: financials.system_size_kwp
        } as any;
      }
      // Admins see everything
      
      res.json({
        success: true,
        message: 'Quote financial breakdown retrieved successfully',
        data: {
          quote_id,
          financial_breakdown: response,
          user_role: userRole
        }
      });
      
    } catch (error) {
      logger.error('Get quote financial breakdown API error', {
        quote_id: req.params.quote_id,
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ quote_id: req.params.quote_id });
    }
  });
}

export const financialController = new FinancialController();