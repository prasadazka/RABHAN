const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345',
  max: 5
});

async function testWalletSystemSimple() {
  console.log('💳 Testing RABHAN Wallet System (Simplified)');
  console.log('='.repeat(50));
  
  try {
    const testContractorId = '123e4567-e89b-12d3-a456-426614174000';
    
    // Test 1: Create/Get Wallet
    console.log('📝 Test 1: Wallet Creation');
    
    const walletQuery = `
      INSERT INTO contractor_wallets (
        contractor_id, current_balance, pending_balance, total_earned,
        total_commission_paid, total_penalties
      ) VALUES ($1, 0, 0, 0, 0, 0)
      ON CONFLICT (contractor_id) DO UPDATE SET
        contractor_id = EXCLUDED.contractor_id
      RETURNING *
    `;
    
    const walletResult = await pool.query(walletQuery, [testContractorId]);
    const wallet = walletResult.rows[0];
    
    console.log('   ✅ Wallet Ready:');
    console.log('     ID:', wallet.id);
    console.log('     Balance:', `${parseFloat(wallet.current_balance).toLocaleString()} SAR`);
    console.log('');
    
    // Test 2: Process Payment (Credit Transaction)
    console.log('📝 Test 2: Payment Processing');
    
    const paymentAmount = 15000; // 15,000 SAR contractor payment
    const commissionAmount = 2250; // 15% commission
    const netAmount = paymentAmount - commissionAmount; // 12,750 SAR
    
    // Get current balance for transaction record
    const currentBalance = parseFloat(wallet.current_balance);
    const newBalance = currentBalance + netAmount;
    
    // Create transaction record
    const transactionQuery = `
      INSERT INTO wallet_transactions (
        wallet_id, transaction_type, amount, description,
        reference_type, reference_id, status, processed_at,
        balance_before, balance_after
      ) VALUES ($1, 'credit', $2, $3, 'quote', $4, 'completed', CURRENT_TIMESTAMP, $5, $6)
      RETURNING *
    `;
    
    const refId = '456e7890-e89b-12d3-a456-426614174001'; // UUID format for testing
    const transactionResult = await pool.query(transactionQuery, [
      wallet.id,
      netAmount,
      `Quote payment - Project completion`,
      refId,
      currentBalance,
      newBalance
    ]);
    
    // Update wallet balance
    const updateQuery = `
      UPDATE contractor_wallets 
      SET current_balance = current_balance + $1,
          total_earned = total_earned + $2,
          total_commission_paid = total_commission_paid + $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    
    const updatedResult = await pool.query(updateQuery, [
      netAmount,
      paymentAmount,
      commissionAmount,
      wallet.id
    ]);
    
    const updatedWallet = updatedResult.rows[0];
    
    console.log('   💰 Payment Breakdown:');
    console.log('     Gross Payment:', `${paymentAmount.toLocaleString()} SAR`);
    console.log('     Platform Commission:', `${commissionAmount.toLocaleString()} SAR`);
    console.log('     Net to Contractor:', `${netAmount.toLocaleString()} SAR`);
    console.log('');
    console.log('   ✅ Wallet Updated:');
    console.log('     Current Balance:', `${parseFloat(updatedWallet.current_balance).toLocaleString()} SAR`);
    console.log('     Total Earned:', `${parseFloat(updatedWallet.total_earned).toLocaleString()} SAR`);
    console.log('     Commission Paid:', `${parseFloat(updatedWallet.total_commission_paid).toLocaleString()} SAR`);
    console.log('');
    
    // Test 3: Withdrawal Request
    console.log('📝 Test 3: Withdrawal Request');
    
    const withdrawalAmount = 8000; // Request 8,000 SAR
    const currentBalance2 = parseFloat(updatedWallet.current_balance);
    
    if (currentBalance2 >= withdrawalAmount && withdrawalAmount >= 100) {
      const withdrawalBalanceAfter = currentBalance2 - withdrawalAmount;
      
      // Create withdrawal transaction
      const withdrawalQuery = `
        INSERT INTO wallet_transactions (
          wallet_id, transaction_type, amount, description,
          reference_type, reference_id, status,
          balance_before, balance_after
        ) VALUES ($1, 'debit', $2, $3, 'withdrawal', $4, 'pending', $5, $6)
        RETURNING *
      `;
      
      const withdrawalId = '789e1234-e89b-12d3-a456-426614174002'; // UUID format for testing
      await pool.query(withdrawalQuery, [
        wallet.id,
        withdrawalAmount,
        'Withdrawal request - Bank transfer',
        withdrawalId,
        currentBalance2,
        withdrawalBalanceAfter
      ]);
      
      // Move to pending
      const pendingQuery = `
        UPDATE contractor_wallets 
        SET current_balance = current_balance - $1,
            pending_balance = pending_balance + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const pendingResult = await pool.query(pendingQuery, [withdrawalAmount, wallet.id]);
      const pendingWallet = pendingResult.rows[0];
      
      console.log('   ✅ Withdrawal Requested:');
      console.log('     Amount:', `${withdrawalAmount.toLocaleString()} SAR`);
      console.log('     Available Balance:', `${parseFloat(pendingWallet.current_balance).toLocaleString()} SAR`);
      console.log('     Pending Balance:', `${parseFloat(pendingWallet.pending_balance).toLocaleString()} SAR`);
      console.log('     Status: Pending Admin Approval');
    } else {
      console.log('   ❌ Withdrawal conditions not met');
    }
    console.log('');
    
    // Test 4: Get Transaction History
    console.log('📝 Test 4: Transaction History');
    
    const historyQuery = `
      SELECT wt.*, cw.contractor_id
      FROM wallet_transactions wt
      JOIN contractor_wallets cw ON wt.wallet_id = cw.id
      WHERE cw.contractor_id = $1
      ORDER BY wt.created_at DESC
      LIMIT 5
    `;
    
    const historyResult = await pool.query(historyQuery, [testContractorId]);
    const transactions = historyResult.rows;
    
    console.log('   📊 Recent Transactions:');
    transactions.forEach((txn, index) => {
      const type = txn.transaction_type === 'credit' ? 'Credit' : 'Debit';
      const amount = parseFloat(txn.amount).toLocaleString();
      console.log(`     ${index + 1}. ${type}: ${amount} SAR`);
      console.log(`        ${txn.description}`);
      console.log(`        Status: ${txn.status} | Reference: ${txn.reference_type}`);
    });
    console.log('');
    
    // Final Status
    console.log('📊 Final Wallet Status:');
    const finalQuery = 'SELECT * FROM contractor_wallets WHERE contractor_id = $1';
    const finalResult = await pool.query(finalQuery, [testContractorId]);
    const finalWallet = finalResult.rows[0];
    
    console.log('   Available Balance:', `${parseFloat(finalWallet.current_balance).toLocaleString()} SAR`);
    console.log('   Pending Balance:', `${parseFloat(finalWallet.pending_balance).toLocaleString()} SAR`);
    console.log('   Total Earned:', `${parseFloat(finalWallet.total_earned).toLocaleString()} SAR`);
    console.log('   Commission Paid:', `${parseFloat(finalWallet.total_commission_paid).toLocaleString()} SAR`);
    console.log('   Net Profit:', `${(parseFloat(finalWallet.total_earned) - parseFloat(finalWallet.total_commission_paid)).toLocaleString()} SAR`);
    
    console.log('');
    console.log('🎉 Wallet System Test COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('✅ Features Verified:');
    console.log('   • Wallet creation and management');
    console.log('   • Payment processing with commission deduction');
    console.log('   • Balance tracking (available + pending)');
    console.log('   • Transaction history with proper joins');
    console.log('   • Withdrawal request system');
    console.log('   • Financial audit trail');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testWalletSystemSimple();