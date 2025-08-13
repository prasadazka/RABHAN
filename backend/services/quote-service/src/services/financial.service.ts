import { database } from '../config/database.config';
import { logger, auditLogger, performanceLogger } from '../utils/logger';
import { BusinessRuleError, handleDatabaseError } from '../middleware/error.middleware';

export interface PricingConfig {
  max_price_per_kwp: number;
  platform_overprice_percent: number;
  platform_commission_percent: number;
  min_system_size_kwp: number;
  max_system_size_kwp: number;
}

export interface QuoteFinancialCalculation {
  base_price: number;
  platform_overprice_percent: number;
  overprice_amount: number;
  total_user_price: number;
  platform_commission_percent: number;
  commission_amount: number;
  contractor_net_amount: number;
  platform_revenue: number;
  price_per_kwp: number;
  system_size_kwp: number;
}

export interface InvoiceCalculation {
  invoice_id: string;
  quote_id: string;
  contractor_amount: number;
  platform_commission: number;
  user_total: number;
  tax_amount?: number;
  final_total: number;
}

export class FinancialService {
  
  /**
   * Get current pricing configuration from database
   */
  async getPricingConfig(): Promise<PricingConfig> {
    const timer = performanceLogger.startTimer('get_pricing_config');
    
    try {
      const result = await database.query(
        'SELECT config_value FROM business_config WHERE config_key = $1 AND is_active = true',
        ['pricing_rules']
      );
      
      if (result.rows.length === 0) {
        logger.warn('No pricing configuration found, using defaults');
        return this.getDefaultPricingConfig();
      }
      
      const config = result.rows[0].config_value;
      
      // Validate configuration
      this.validatePricingConfig(config);
      
      logger.debug('Pricing configuration retrieved', { config });
      return config;
      
    } catch (error) {
      logger.error('Failed to get pricing configuration', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end();
    }
  }
  
  /**
   * Calculate all financial aspects of a quote
   */
  async calculateQuoteFinancials(
    basePrice: number,
    pricePerKwp: number,
    systemSizeKwp: number,
    customConfig?: Partial<PricingConfig>
  ): Promise<QuoteFinancialCalculation> {
    const timer = performanceLogger.startTimer('calculate_quote_financials');
    
    try {
      // Get pricing configuration
      const config = customConfig ? 
        { ...await this.getPricingConfig(), ...customConfig } : 
        await this.getPricingConfig();
      
      // Validate inputs
      this.validateFinancialInputs(basePrice, pricePerKwp, systemSizeKwp, config);
      
      // Calculate platform markup (overprice)
      const overpriceAmount = this.calculatePlatformMarkup(basePrice, config.platform_overprice_percent);
      
      // Calculate total user price
      const totalUserPrice = basePrice + overpriceAmount;
      
      // Calculate platform commission (from contractor)
      const commissionAmount = this.calculatePlatformCommission(basePrice, config.platform_commission_percent);
      
      // Calculate contractor net amount (what contractor receives)
      const contractorNetAmount = basePrice - commissionAmount;
      
      // Platform revenue = commission + markup
      const platformRevenue = commissionAmount + overpriceAmount;
      
      const calculation: QuoteFinancialCalculation = {
        base_price: this.roundMoney(basePrice),
        platform_overprice_percent: config.platform_overprice_percent,
        overprice_amount: this.roundMoney(overpriceAmount),
        total_user_price: this.roundMoney(totalUserPrice),
        platform_commission_percent: config.platform_commission_percent,
        commission_amount: this.roundMoney(commissionAmount),
        contractor_net_amount: this.roundMoney(contractorNetAmount),
        platform_revenue: this.roundMoney(platformRevenue),
        price_per_kwp: this.roundMoney(pricePerKwp),
        system_size_kwp: systemSizeKwp
      };
      
      // Audit log the calculation
      auditLogger.financial('QUOTE_FINANCIAL_CALCULATION', {
        base_price: calculation.base_price,
        total_user_price: calculation.total_user_price,
        commission_amount: calculation.commission_amount,
        platform_revenue: calculation.platform_revenue,
        system_size_kwp: systemSizeKwp,
        config_used: {
          overprice_percent: config.platform_overprice_percent,
          commission_percent: config.platform_commission_percent
        }
      });
      
      logger.info('Quote financial calculation completed', {
        base_price: calculation.base_price,
        user_total: calculation.total_user_price,
        contractor_net: calculation.contractor_net_amount,
        platform_revenue: calculation.platform_revenue
      });
      
      return calculation;
      
    } catch (error) {
      logger.error('Failed to calculate quote financials', {
        base_price: basePrice,
        price_per_kwp: pricePerKwp,
        system_size: systemSizeKwp,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({
        base_price: basePrice,
        system_size: systemSizeKwp
      });
    }
  }
  
  /**
   * Create invoice calculation for approved quote
   */
  async createInvoiceCalculation(
    quoteId: string,
    includeVAT = true,
    vatRate = 0.15
  ): Promise<InvoiceCalculation> {
    const timer = performanceLogger.startTimer('create_invoice_calculation');
    
    try {
      // Get quote details
      const quoteQuery = `
        SELECT cq.*, qr.system_size_kwp
        FROM contractor_quotes cq
        JOIN quote_requests qr ON cq.request_id = qr.id
        WHERE cq.id = $1 AND cq.admin_status = 'approved'
      `;
      
      const quoteResult = await database.query(quoteQuery, [quoteId]);
      
      if (quoteResult.rows.length === 0) {
        throw new BusinessRuleError('Quote not found or not approved', 'QUOTE_NOT_FOUND');
      }
      
      const quote = quoteResult.rows[0];
      
      // Get financial calculation
      const financials = await this.calculateQuoteFinancials(
        parseFloat(quote.base_price),
        parseFloat(quote.price_per_kwp),
        parseFloat(quote.system_size_kwp)
      );
      
      // Calculate tax if applicable
      let taxAmount = 0;
      let finalTotal = financials.total_user_price;
      
      if (includeVAT) {
        taxAmount = this.roundMoney(financials.total_user_price * vatRate);
        finalTotal = this.roundMoney(financials.total_user_price + taxAmount);
      }
      
      // Generate invoice ID
      const invoiceId = `INV_${Date.now()}_${quoteId.slice(-8)}`;
      
      // Store invoice in database
      const invoiceQuery = `
        INSERT INTO invoices (
          id, quote_id, contractor_amount, platform_commission, 
          user_total, tax_amount, final_total, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING id
      `;
      
      const invoiceValues = [
        invoiceId,
        quoteId,
        financials.contractor_net_amount,
        financials.commission_amount,
        financials.total_user_price,
        taxAmount,
        finalTotal
      ];
      
      const invoiceResult = await database.query(invoiceQuery, invoiceValues);
      
      const invoiceCalculation: InvoiceCalculation = {
        invoice_id: invoiceResult.rows[0].id,
        quote_id: quoteId,
        contractor_amount: financials.contractor_net_amount,
        platform_commission: financials.commission_amount,
        user_total: financials.total_user_price,
        tax_amount: taxAmount,
        final_total: finalTotal
      };
      
      // Audit log
      auditLogger.financial('INVOICE_CREATED', {
        invoice_id: invoiceCalculation.invoice_id,
        quote_id: quoteId,
        contractor_amount: invoiceCalculation.contractor_amount,
        platform_commission: invoiceCalculation.platform_commission,
        user_total: invoiceCalculation.user_total,
        final_total: invoiceCalculation.final_total,
        includes_vat: includeVAT
      });
      
      logger.info('Invoice calculation created', {
        invoice_id: invoiceCalculation.invoice_id,
        quote_id: quoteId,
        final_total: invoiceCalculation.final_total
      });
      
      return invoiceCalculation;
      
    } catch (error) {
      logger.error('Failed to create invoice calculation', {
        quote_id: quoteId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ quote_id: quoteId });
    }
  }
  
  /**
   * Update pricing configuration (Admin only)
   */
  async updatePricingConfig(
    newConfig: Partial<PricingConfig>,
    updatedBy: string
  ): Promise<PricingConfig> {
    const timer = performanceLogger.startTimer('update_pricing_config');
    
    try {
      // Get current config
      const currentConfig = await this.getPricingConfig();
      const updatedConfig = { ...currentConfig, ...newConfig };
      
      // Validate new configuration
      this.validatePricingConfig(updatedConfig);
      
      // Update in database
      const updateQuery = `
        UPDATE business_config 
        SET config_value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
        WHERE config_key = 'pricing_rules' AND is_active = true
      `;
      
      await database.query(updateQuery, [JSON.stringify(updatedConfig), updatedBy]);
      
      // Audit log the configuration change
      auditLogger.financial('PRICING_CONFIG_UPDATED', {
        updated_by: updatedBy,
        old_config: currentConfig,
        new_config: updatedConfig,
        changes: newConfig
      });
      
      logger.info('Pricing configuration updated', {
        updated_by: updatedBy,
        changes: Object.keys(newConfig)
      });
      
      return updatedConfig;
      
    } catch (error) {
      logger.error('Failed to update pricing configuration', {
        updated_by: updatedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ updated_by: updatedBy });
    }
  }
  
  // Private helper methods
  
  private calculatePlatformMarkup(basePrice: number, overpricePercent: number): number {
    return basePrice * (overpricePercent / 100);
  }
  
  private calculatePlatformCommission(basePrice: number, commissionPercent: number): number {
    return basePrice * (commissionPercent / 100);
  }
  
  private roundMoney(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
  
  private getDefaultPricingConfig(): PricingConfig {
    return {
      max_price_per_kwp: 2000,
      platform_overprice_percent: 10,
      platform_commission_percent: 15,
      min_system_size_kwp: 1,
      max_system_size_kwp: 1000
    };
  }
  
  private validatePricingConfig(config: any): void {
    const required = [
      'max_price_per_kwp',
      'platform_overprice_percent', 
      'platform_commission_percent',
      'min_system_size_kwp',
      'max_system_size_kwp'
    ];
    
    for (const field of required) {
      if (typeof config[field] !== 'number' || config[field] < 0) {
        throw new BusinessRuleError(
          `Invalid pricing configuration: ${field} must be a positive number`,
          'INVALID_PRICING_CONFIG'
        );
      }
    }
    
    if (config.platform_overprice_percent > 50) {
      throw new BusinessRuleError(
        'Platform overprice cannot exceed 50%',
        'OVERPRICE_TOO_HIGH'
      );
    }
    
    if (config.platform_commission_percent > 50) {
      throw new BusinessRuleError(
        'Platform commission cannot exceed 50%',
        'COMMISSION_TOO_HIGH'
      );
    }
  }
  
  private validateFinancialInputs(
    basePrice: number,
    pricePerKwp: number,
    systemSizeKwp: number,
    config: PricingConfig
  ): void {
    if (basePrice <= 0) {
      throw new BusinessRuleError('Base price must be positive', 'INVALID_BASE_PRICE');
    }
    
    if (pricePerKwp <= 0) {
      throw new BusinessRuleError('Price per kWp must be positive', 'INVALID_PRICE_PER_KWP');
    }
    
    if (pricePerKwp > config.max_price_per_kwp) {
      throw new BusinessRuleError(
        `Price per kWp cannot exceed ${config.max_price_per_kwp} SAR`,
        'PRICE_PER_KWP_TOO_HIGH'
      );
    }
    
    if (systemSizeKwp < config.min_system_size_kwp || systemSizeKwp > config.max_system_size_kwp) {
      throw new BusinessRuleError(
        `System size must be between ${config.min_system_size_kwp} and ${config.max_system_size_kwp} kWp`,
        'INVALID_SYSTEM_SIZE'
      );
    }
    
    // Verify price calculation consistency
    const expectedBasePrice = this.roundMoney(pricePerKwp * systemSizeKwp);
    const priceDifference = Math.abs(basePrice - expectedBasePrice);
    
    if (priceDifference > 0.01) {
      throw new BusinessRuleError(
        'Base price does not match price per kWp calculation',
        'PRICE_CALCULATION_MISMATCH',
        {
          provided_base_price: basePrice,
          calculated_base_price: expectedBasePrice,
          difference: priceDifference
        }
      );
    }
  }
}

export const financialService = new FinancialService();