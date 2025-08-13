import { Response } from 'express';
import { walletService } from '../services/wallet.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger, performanceLogger } from '../utils/logger';
import { asyncHandler } from '../middleware/error.middleware';

export class WalletController {
  
  /**
   * Get contractor wallet details
   */
  getWallet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_wallet');
    
    try {
      const contractorId = req.user!.id;
      const wallet = await walletService.getOrCreateWallet(contractorId);
      
      res.json({
        success: true,
        message: 'Wallet retrieved successfully',
        data: {
          wallet
        }
      });
      
    } catch (error) {
      logger.error('Get wallet API error', {
        contractor_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: req.user?.id });
    }
  });
  
  /**
   * Get wallet transaction history
   */
  getTransactionHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_transaction_history');
    
    try {
      const contractorId = req.user!.id;
      const filters = {
        transaction_type: req.query.transaction_type as 'credit' | 'debit',
        reference_type: req.query.reference_type as string,
        status: req.query.status as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined
      };
      
      const result = await walletService.getTransactionHistory(contractorId, filters);
      
      res.json({
        success: true,
        message: 'Transaction history retrieved successfully',
        data: {
          transactions: result.transactions,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            pages: Math.ceil(result.total / result.limit)
          }
        }
      });
      
    } catch (error) {
      logger.error('Get transaction history API error', {
        contractor_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: req.user?.id });
    }
  });
  
  /**
   * Request withdrawal
   */
  requestWithdrawal = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_request_withdrawal');
    
    try {
      const contractorId = req.user!.id;
      const { amount, payment_method } = req.body;
      
      const withdrawalRequest = await walletService.requestWithdrawal(
        contractorId,
        amount,
        payment_method
      );
      
      res.status(201).json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        data: {
          withdrawal_request: withdrawalRequest,
          processing_note: 'Your withdrawal request will be processed within 3-5 business days'
        }
      });
      
      logger.info('Withdrawal requested via API', {
        contractor_id: contractorId,
        amount,
        payment_method: payment_method.type
      });
      
    } catch (error) {
      logger.error('Request withdrawal API error', {
        contractor_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: req.user?.id });
    }
  });
  
  /**
   * Update payment methods
   */
  updatePaymentMethods = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_update_payment_methods');
    
    try {
      const contractorId = req.user!.id;
      const { payment_methods } = req.body;
      
      await walletService.updatePaymentMethods(contractorId, payment_methods);
      
      res.json({
        success: true,
        message: 'Payment methods updated successfully'
      });
      
      logger.info('Payment methods updated via API', {
        contractor_id: contractorId,
        methods_count: payment_methods.length
      });
      
    } catch (error) {
      logger.error('Update payment methods API error', {
        contractor_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: req.user?.id });
    }
  });
  
  /**
   * Process quote payment (Admin only - called when user pays invoice)
   */
  processQuotePayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_process_quote_payment');
    
    try {
      const { quote_id, invoice_id } = req.body;
      
      const transaction = await walletService.processQuotePayment(quote_id, invoice_id);
      
      res.json({
        success: true,
        message: 'Quote payment processed successfully',
        data: {
          transaction
        }
      });
      
      logger.info('Quote payment processed via API', {
        admin_id: req.user!.id,
        quote_id,
        invoice_id,
        transaction_id: transaction.id
      });
      
    } catch (error) {
      logger.error('Process quote payment API error', {
        admin_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ admin_id: req.user?.id });
    }
  });
  
  /**
   * Process penalty (Admin only)
   */
  processPenalty = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_process_penalty');
    
    try {
      const { contractor_id, amount, reason, reference_id } = req.body;
      
      const transaction = await walletService.processPenalty(
        contractor_id,
        amount,
        reason,
        reference_id
      );
      
      res.json({
        success: true,
        message: 'Penalty processed successfully',
        data: {
          transaction
        }
      });
      
      logger.info('Penalty processed via API', {
        admin_id: req.user!.id,
        contractor_id,
        amount,
        reason
      });
      
    } catch (error) {
      logger.error('Process penalty API error', {
        admin_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ admin_id: req.user?.id });
    }
  });
  
  /**
   * Get wallet analytics (role-based)
   */
  getWalletAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_wallet_analytics');
    
    try {
      const userRole = req.user!.role;
      const userId = req.user!.id;
      
      let analytics = {};
      
      if (userRole === 'admin') {
        // Platform-wide wallet analytics
        analytics = {
          total_contractor_balances: 0,
          total_pending_withdrawals: 0,
          total_payments_processed: 0,
          total_penalties_collected: 0,
          active_wallets: 0,
          withdrawal_statistics: {
            pending_count: 0,
            approved_count: 0,
            completed_count: 0,
            rejected_count: 0
          }
        };
      } else if (userRole === 'contractor') {
        // Get contractor's wallet
        const wallet = await walletService.getOrCreateWallet(userId);
        
        // Get recent transactions
        const recentTransactions = await walletService.getTransactionHistory(userId, {
          page: 1,
          limit: 5
        });
        
        analytics = {
          current_balance: wallet.balance,
          pending_balance: wallet.pending_balance,
          total_earned: wallet.total_earned,
          total_commission_paid: wallet.total_commission_paid,
          total_penalties: wallet.total_penalties,
          net_earnings: wallet.total_earned - wallet.total_commission_paid - wallet.total_penalties,
          recent_transactions: recentTransactions.transactions,
          earnings_breakdown: {
            gross_earnings: wallet.total_earned,
            commission_deductions: wallet.total_commission_paid,
            penalty_deductions: wallet.total_penalties,
            net_earnings: wallet.balance + wallet.pending_balance
          }
        };
      }
      
      res.json({
        success: true,
        message: 'Wallet analytics retrieved successfully',
        data: {
          analytics,
          user_role: userRole,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Get wallet analytics API error', {
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });
  
  /**
   * Get specific contractor wallet (Admin only)
   */
  getContractorWallet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_contractor_wallet');
    
    try {
      const { contractor_id } = req.params;
      
      const wallet = await walletService.getOrCreateWallet(contractor_id);
      const transactionHistory = await walletService.getTransactionHistory(contractor_id, {
        page: 1,
        limit: 10
      });
      
      res.json({
        success: true,
        message: 'Contractor wallet retrieved successfully',
        data: {
          wallet,
          recent_transactions: transactionHistory.transactions,
          total_transactions: transactionHistory.total
        }
      });
      
    } catch (error) {
      logger.error('Get contractor wallet API error', {
        admin_id: req.user?.id,
        contractor_id: req.params.contractor_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ contractor_id: req.params.contractor_id });
    }
  });
  
  /**
   * Get wallet summary
   */
  getWalletSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timer = performanceLogger.startTimer('controller_get_wallet_summary');
    
    try {
      const userRole = req.user!.role;
      const userId = req.user!.id;
      
      if (userRole === 'contractor') {
        const wallet = await walletService.getOrCreateWallet(userId);
        
        res.json({
          success: true,
          message: 'Wallet summary retrieved successfully',
          data: {
            summary: {
              available_balance: wallet.balance,
              pending_balance: wallet.pending_balance,
              total_earned: wallet.total_earned,
              can_withdraw: wallet.balance >= 100, // Minimum withdrawal check
              payment_methods_configured: (wallet.payment_methods || []).length > 0
            }
          }
        });
      } else {
        res.json({
          success: true,
          message: 'Wallet summary not available for this role',
          data: {
            summary: {
              message: 'Wallet functionality is only available for contractors'
            }
          }
        });
      }
      
    } catch (error) {
      logger.error('Get wallet summary API error', {
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      timer.end({ user_id: req.user?.id });
    }
  });
}

export const walletController = new WalletController();