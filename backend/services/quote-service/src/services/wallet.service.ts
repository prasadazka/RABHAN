import { database } from '../config/database.config';
import { logger, auditLogger, performanceLogger } from '../utils/logger';
import { NotFoundError, BusinessRuleError, ConflictError, handleDatabaseError } from '../middleware/error.middleware';
import { financialService } from './financial.service';

export interface ContractorWallet {
  id: string;
  contractor_id: string;
  balance: number;
  pending_balance: number;
  total_earned: number;
  total_commission_paid: number;
  total_penalties: number;
  bank_account_details: any;
  payment_methods: any;
  created_at: Date;
  updated_at: Date;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  contractor_id: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_type: 'quote' | 'invoice' | 'penalty' | 'withdrawal' | 'adjustment';
  reference_id: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  processed_at?: Date;
  created_at: Date;
}

export interface PaymentMethod {
  type: 'bank_transfer' | 'digital_wallet' | 'check';
  account_number?: string;
  iban?: string;
  bank_name?: string;
  beneficiary_name?: string;
  wallet_id?: string;
  wallet_provider?: string;
  is_primary: boolean;
  is_verified: boolean;
}

export interface WithdrawalRequest {
  id: string;
  contractor_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  requested_at: Date;
  processed_at?: Date;
  admin_notes?: string;
}

export class WalletService {
  
  /**
   * Get or create contractor wallet
   */
  async getOrCreateWallet(contractorId: string): Promise<ContractorWallet> {
    const timer = performanceLogger.startTimer('get_or_create_wallet');
    
    try {
      // Try to get existing wallet
      const existingWallet = await database.query(
        'SELECT * FROM contractor_wallets WHERE contractor_id = $1',
        [contractorId]
      );
      
      if (existingWallet.rows.length > 0) {
        return this.formatWallet(existingWallet.rows[0]);
      }
      
      // Create new wallet
      const createWalletQuery = `
        INSERT INTO contractor_wallets (
          contractor_id, current_balance, pending_balance, total_earned,
          total_commission_paid, total_penalties
        ) VALUES ($1, 0, 0, 0, 0, 0)
        RETURNING *
      `;
      
      const result = await database.query(createWalletQuery, [contractorId]);
      const wallet = result.rows[0];
      
      // Audit log
      auditLogger.financial('CONTRACTOR_WALLET_CREATED', {
        contractor_id: contractorId,
        wallet_id: wallet.id
      });
      
      logger.info('Contractor wallet created', {
        contractor_id: contractorId,
        wallet_id: wallet.id
      });
      
      return this.formatWallet(wallet);
      
    } catch (error) {
      logger.error('Failed to get or create wallet', {
        contractor_id: contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ contractor_id: contractorId });
    }
  }
  
  /**
   * Process payment for completed quote (called when user pays invoice)
   */
  async processQuotePayment(quoteId: string, invoiceId: string): Promise<WalletTransaction> {
    const timer = performanceLogger.startTimer('process_quote_payment');
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get quote and financial details
      const quoteQuery = `
        SELECT cq.*, qr.system_size_kwp, cq.contractor_id
        FROM contractor_quotes cq
        JOIN quote_requests qr ON cq.request_id = qr.id
        WHERE cq.id = $1 AND cq.is_selected = true AND cq.admin_status = 'approved'
      `;
      
      const quoteResult = await client.query(quoteQuery, [quoteId]);
      
      if (quoteResult.rows.length === 0) {
        throw new BusinessRuleError('Quote not found or not eligible for payment', 'INVALID_QUOTE');
      }
      
      const quote = quoteResult.rows[0];
      
      // Calculate financial breakdown
      const financials = await financialService.calculateQuoteFinancials(
        parseFloat(quote.base_price),
        parseFloat(quote.price_per_kwp),
        parseFloat(quote.system_size_kwp)
      );
      
      // Get or create contractor wallet
      const wallet = await this.getOrCreateWallet(quote.contractor_id);
      
      // Create credit transaction for contractor
      const transactionId = await this.createTransaction(
        wallet.id,
        quote.contractor_id,
        'credit',
        financials.contractor_net_amount,
        `Payment for completed solar installation - Quote ${quoteId}`,
        'quote',
        quoteId,
        'completed',
        client
      );
      
      // Update wallet balance
      await client.query(`
        UPDATE contractor_wallets 
        SET current_balance = current_balance + $1,
            total_earned = total_earned + $2,
            total_commission_paid = total_commission_paid + $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [
        financials.contractor_net_amount,
        financials.base_price,
        financials.commission_amount,
        wallet.id
      ]);
      
      await client.query('COMMIT');
      
      // Get the transaction record
      const transactionResult = await database.query(
        'SELECT * FROM wallet_transactions WHERE id = $1',
        [transactionId]
      );
      
      // Audit log
      auditLogger.financial('QUOTE_PAYMENT_PROCESSED', {
        contractor_id: quote.contractor_id,
        quote_id: quoteId,
        invoice_id: invoiceId,
        transaction_id: transactionId,
        contractor_amount: financials.contractor_net_amount,
        commission_paid: financials.commission_amount,
        platform_revenue: financials.platform_revenue
      });
      
      logger.info('Quote payment processed successfully', {
        contractor_id: quote.contractor_id,
        quote_id: quoteId,
        amount: financials.contractor_net_amount
      });
      
      return this.formatTransaction(transactionResult.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to process quote payment', {
        quote_id: quoteId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
      timer.end({ quote_id: quoteId });
    }
  }
  
  /**
   * Process penalty deduction
   */
  async processPenalty(
    contractorId: string,
    amount: number,
    reason: string,
    referenceId: string
  ): Promise<WalletTransaction> {
    const timer = performanceLogger.startTimer('process_penalty');
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      const wallet = await this.getOrCreateWallet(contractorId);
      
      // Check if contractor has sufficient balance
      if (wallet.balance < amount) {
        throw new BusinessRuleError(
          'Insufficient wallet balance for penalty deduction',
          'INSUFFICIENT_BALANCE',
          { current_balance: wallet.balance, penalty_amount: amount }
        );
      }
      
      // Create debit transaction
      const transactionId = await this.createTransaction(
        wallet.id,
        contractorId,
        'debit',
        amount,
        `Penalty: ${reason}`,
        'penalty',
        referenceId,
        'completed',
        client
      );
      
      // Update wallet balance
      await client.query(`
        UPDATE contractor_wallets 
        SET current_balance = current_balance - $1,
            total_penalties = total_penalties + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [amount, wallet.id]);
      
      await client.query('COMMIT');
      
      // Get the transaction record
      const transactionResult = await database.query(
        'SELECT * FROM wallet_transactions WHERE id = $1',
        [transactionId]
      );
      
      // Audit log
      auditLogger.financial('PENALTY_PROCESSED', {
        contractor_id: contractorId,
        penalty_amount: amount,
        reason,
        reference_id: referenceId,
        transaction_id: transactionId
      });
      
      logger.info('Penalty processed successfully', {
        contractor_id: contractorId,
        amount,
        reason
      });
      
      return this.formatTransaction(transactionResult.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to process penalty', {
        contractor_id: contractorId,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
      timer.end({ contractor_id: contractorId });
    }
  }
  
  /**
   * Request withdrawal
   */
  async requestWithdrawal(
    contractorId: string,
    amount: number,
    paymentMethod: PaymentMethod
  ): Promise<WithdrawalRequest> {
    const timer = performanceLogger.startTimer('request_withdrawal');
    
    try {
      const wallet = await this.getOrCreateWallet(contractorId);
      
      // Validate withdrawal amount
      if (amount <= 0) {
        throw new BusinessRuleError('Withdrawal amount must be positive', 'INVALID_AMOUNT');
      }
      
      if (amount > wallet.balance) {
        throw new BusinessRuleError(
          'Insufficient balance for withdrawal',
          'INSUFFICIENT_BALANCE',
          { requested: amount, available: wallet.balance }
        );
      }
      
      // Minimum withdrawal amount
      const minWithdrawal = 100; // 100 SAR minimum
      if (amount < minWithdrawal) {
        throw new BusinessRuleError(
          `Minimum withdrawal amount is ${minWithdrawal} SAR`,
          'BELOW_MINIMUM_WITHDRAWAL'
        );
      }
      
      // Create withdrawal request
      const withdrawalQuery = `
        INSERT INTO wallet_transactions (
          wallet_id, contractor_id, transaction_type, amount, description,
          reference_type, reference_id, status
        ) VALUES ($1, $2, 'debit', $3, $4, 'withdrawal', $5, 'pending')
        RETURNING id
      `;
      
      const withdrawalId = `WD_${Date.now()}_${contractorId.slice(-8)}`;
      const description = `Withdrawal request - ${paymentMethod.type}`;
      
      const result = await database.query(withdrawalQuery, [
        wallet.id,
        contractorId,
        amount,
        description,
        withdrawalId
      ]);
      
      const transactionId = result.rows[0].id;
      
      // Move amount to pending balance
      await database.query(`
        UPDATE contractor_wallets 
        SET current_balance = current_balance - $1,
            pending_balance = pending_balance + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [amount, wallet.id]);
      
      const withdrawalRequest: WithdrawalRequest = {
        id: transactionId,
        contractor_id: contractorId,
        amount,
        payment_method: paymentMethod,
        status: 'pending',
        requested_at: new Date()
      };
      
      // Audit log
      auditLogger.financial('WITHDRAWAL_REQUESTED', {
        contractor_id: contractorId,
        withdrawal_id: withdrawalId,
        amount,
        payment_method: paymentMethod.type,
        transaction_id: transactionId
      });
      
      logger.info('Withdrawal requested', {
        contractor_id: contractorId,
        amount,
        withdrawal_id: withdrawalId
      });
      
      return withdrawalRequest;
      
    } catch (error) {
      logger.error('Failed to request withdrawal', {
        contractor_id: contractorId,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: contractorId });
    }
  }
  
  /**
   * Get wallet transaction history
   */
  async getTransactionHistory(
    contractorId: string,
    filters: {
      transaction_type?: 'credit' | 'debit';
      reference_type?: string;
      status?: string;
      page?: number;
      limit?: number;
      start_date?: Date;
      end_date?: Date;
    } = {}
  ): Promise<{ transactions: WalletTransaction[]; total: number; page: number; limit: number }> {
    const timer = performanceLogger.startTimer('get_transaction_history');
    
    try {
      const { page = 1, limit = 20 } = filters;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE cw.contractor_id = $1';
      const queryParams: any[] = [contractorId];
      let paramIndex = 2;
      
      if (filters.transaction_type) {
        whereClause += ` AND wt.transaction_type = $${paramIndex}`;
        queryParams.push(filters.transaction_type);
        paramIndex++;
      }
      
      if (filters.reference_type) {
        whereClause += ` AND wt.reference_type = $${paramIndex}`;
        queryParams.push(filters.reference_type);
        paramIndex++;
      }
      
      if (filters.status) {
        whereClause += ` AND wt.status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }
      
      if (filters.start_date) {
        whereClause += ` AND wt.created_at >= $${paramIndex}`;
        queryParams.push(filters.start_date);
        paramIndex++;
      }
      
      if (filters.end_date) {
        whereClause += ` AND wt.created_at <= $${paramIndex}`;
        queryParams.push(filters.end_date);
        paramIndex++;
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM wallet_transactions wt 
        JOIN contractor_wallets cw ON wt.wallet_id = cw.id 
        ${whereClause}
      `;
      const countResult = await database.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      // Get transactions
      const transactionsQuery = `
        SELECT wt.*, cw.contractor_id 
        FROM wallet_transactions wt 
        JOIN contractor_wallets cw ON wt.wallet_id = cw.id 
        ${whereClause}
        ORDER BY wt.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const transactionsResult = await database.query(transactionsQuery, queryParams);
      
      const transactions = transactionsResult.rows.map(row => this.formatTransaction(row));
      
      logger.debug('Transaction history retrieved', {
        contractor_id: contractorId,
        count: transactions.length,
        total,
        page
      });
      
      return { transactions, total, page, limit };
      
    } catch (error) {
      logger.error('Failed to get transaction history', {
        contractor_id: contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw handleDatabaseError(error);
    } finally {
      timer.end({ contractor_id: contractorId });
    }
  }
  
  /**
   * Update payment methods
   */
  async updatePaymentMethods(
    contractorId: string,
    paymentMethods: PaymentMethod[]
  ): Promise<void> {
    const timer = performanceLogger.startTimer('update_payment_methods');
    
    try {
      const wallet = await this.getOrCreateWallet(contractorId);
      
      // Validate payment methods
      this.validatePaymentMethods(paymentMethods);
      
      // Update wallet with payment methods
      await database.query(`
        UPDATE contractor_wallets 
        SET payment_methods = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [JSON.stringify(paymentMethods), wallet.id]);
      
      // Audit log
      auditLogger.financial('PAYMENT_METHODS_UPDATED', {
        contractor_id: contractorId,
        wallet_id: wallet.id,
        methods_count: paymentMethods.length
      });
      
      logger.info('Payment methods updated', {
        contractor_id: contractorId,
        methods_count: paymentMethods.length
      });
      
    } catch (error) {
      logger.error('Failed to update payment methods', {
        contractor_id: contractorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: contractorId });
    }
  }
  
  // Private helper methods
  
  private async createTransaction(
    walletId: string,
    contractorId: string,
    type: 'credit' | 'debit',
    amount: number,
    description: string,
    referenceType: string,
    referenceId: string,
    status: string = 'pending',
    client: any = database
  ): Promise<string> {
    const query = `
      INSERT INTO wallet_transactions (
        wallet_id, transaction_type, amount, description,
        reference_type, reference_id, status, processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const processedAt = status === 'completed' ? new Date() : null;
    
    const result = await client.query(query, [
      walletId, type, amount, description,
      referenceType, referenceId, status, processedAt
    ]);
    
    return result.rows[0].id;
  }
  
  private validatePaymentMethods(methods: PaymentMethod[]): void {
    if (methods.length === 0) {
      throw new BusinessRuleError('At least one payment method is required', 'NO_PAYMENT_METHODS');
    }
    
    const primaryMethods = methods.filter(m => m.is_primary);
    if (primaryMethods.length !== 1) {
      throw new BusinessRuleError('Exactly one primary payment method is required', 'INVALID_PRIMARY_METHOD');
    }
    
    methods.forEach(method => {
      if (method.type === 'bank_transfer') {
        if (!method.account_number || !method.bank_name || !method.beneficiary_name) {
          throw new BusinessRuleError('Bank transfer method requires complete bank details', 'INCOMPLETE_BANK_DETAILS');
        }
      }
    });
  }
  
  private formatWallet(row: any): ContractorWallet {
    return {
      id: row.id,
      contractor_id: row.contractor_id,
      balance: parseFloat(row.current_balance || 0),
      pending_balance: parseFloat(row.pending_balance || 0),
      total_earned: parseFloat(row.total_earned || 0),
      total_commission_paid: parseFloat(row.total_commission_paid || 0),
      total_penalties: parseFloat(row.total_penalties || 0),
      bank_account_details: row.bank_account_details,
      payment_methods: row.payment_methods || [],
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  
  private formatTransaction(row: any): WalletTransaction {
    return {
      id: row.id,
      wallet_id: row.wallet_id,
      contractor_id: row.contractor_id || '', // May not be directly stored in transactions table
      transaction_type: row.transaction_type,
      amount: parseFloat(row.amount),
      description: row.description,
      reference_type: row.reference_type,
      reference_id: row.reference_id,
      status: row.status,
      processed_at: row.processed_at,
      created_at: row.created_at
    };
  }
}

export const walletService = new WalletService();