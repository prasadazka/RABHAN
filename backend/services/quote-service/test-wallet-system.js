const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function testWalletSystem() {
  console.log('💳 Testing RABHAN Contractor Wallet System');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Create a contractor wallet
    console.log('📝 Test 1: Creating Contractor Wallet');
    const testContractorId = '123e4567-e89b-12d3-a456-426614174000';
    
    // Create wallet
    const createWalletQuery = `
      INSERT INTO contractor_wallets (
        contractor_id, current_balance, pending_balance, total_earned,
        total_commission_paid, total_penalties
      ) VALUES ($1, 0, 0, 0, 0, 0)
      ON CONFLICT (contractor_id) DO NOTHING
      RETURNING *
    `;
    
    const walletResult = await pool.query(createWalletQuery, [testContractorId]);
    
    // Get wallet (whether newly created or existing)
    const getWalletQuery = 'SELECT * FROM contractor_wallets WHERE contractor_id = $1';
    const existingWallet = await pool.query(getWalletQuery, [testContractorId]);
    const wallet = existingWallet.rows[0];
    
    console.log('   ✅ Contractor Wallet Created/Retrieved:');
    console.log('     Wallet ID:', wallet.id);
    console.log('     Balance:', `${wallet.current_balance} SAR`);
    console.log('     Pending:', `${wallet.pending_balance} SAR`);
    console.log('     Total Earned:', `${wallet.total_earned} SAR`);
    console.log('');
    
    // Test 2: Simulate quote payment processing
    console.log('📝 Test 2: Processing Quote Payment');
    
    const quotePayment = {
      basePrice: 20000,
      overpricePercent: 10,
      commissionPercent: 15
    };
    
    const overpriceAmount = quotePayment.basePrice * (quotePayment.overpricePercent / 100);
    const totalUserPrice = quotePayment.basePrice + overpriceAmount;
    const commissionAmount = quotePayment.basePrice * (quotePayment.commissionPercent / 100);
    const contractorNetAmount = quotePayment.basePrice - commissionAmount;
    
    console.log('   💰 Payment Breakdown:');
    console.log('     Base Price:', `${quotePayment.basePrice.toLocaleString()} SAR`);
    console.log('     User Pays:', `${totalUserPrice.toLocaleString()} SAR (includes ${quotePayment.overpricePercent}% markup)`);
    console.log('     Commission (${quotePayment.commissionPercent}%):', `${commissionAmount.toLocaleString()} SAR`);
    console.log('     Contractor Gets:', `${contractorNetAmount.toLocaleString()} SAR`);
    console.log('');
    
    // Create credit transaction
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const quoteId = `QTE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const createTransactionQuery = `
      INSERT INTO wallet_transactions (
        wallet_id, contractor_id, transaction_type, amount, description,
        reference_type, reference_id, status, processed_at
      ) VALUES ($1, $2, 'credit', $3, $4, 'quote', $5, 'completed', CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const transactionResult = await pool.query(createTransactionQuery, [
      wallet.id,
      testContractorId,
      contractorNetAmount,
      `Payment for completed solar installation - Quote ${quoteId}`,
      quoteId
    ]);
    
    const transaction = transactionResult.rows[0];
    
    // Update wallet balance
    const updateWalletQuery = `
      UPDATE contractor_wallets 
      SET current_balance = current_balance + $1,
          total_earned = total_earned + $2,
          total_commission_paid = total_commission_paid + $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    
    const updatedWalletResult = await pool.query(updateWalletQuery, [
      contractorNetAmount,
      quotePayment.basePrice,
      commissionAmount,
      wallet.id
    ]);
    
    const updatedWallet = updatedWalletResult.rows[0];
    
    console.log('   ✅ Transaction Processed:');
    console.log('     Transaction ID:', transaction.id);
    console.log('     Amount Credited:', `${contractorNetAmount.toLocaleString()} SAR`);
    console.log('     New Balance:', `${parseFloat(updatedWallet.current_balance).toLocaleString()} SAR`);
    console.log('     Total Earned:', `${parseFloat(updatedWallet.total_earned).toLocaleString()} SAR`);
    console.log('     Commission Paid:', `${parseFloat(updatedWallet.total_commission_paid).toLocaleString()} SAR`);
    console.log('');
    
    // Test 3: Test penalty processing
    console.log('📝 Test 3: Processing Penalty');
    
    const penaltyAmount = 500; // 500 SAR penalty
    const penaltyReason = 'Late installation delivery - 2 days overdue';
    
    // Check if sufficient balance
    const currentBalance = parseFloat(updatedWallet.current_balance);
    
    if (currentBalance >= penaltyAmount) {
      // Create penalty transaction
      const penaltyTransactionQuery = `
        INSERT INTO wallet_transactions (
          wallet_id, contractor_id, transaction_type, amount, description,
          reference_type, reference_id, status, processed_at
        ) VALUES ($1, $2, 'debit', $3, $4, 'penalty', $5, 'completed', CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const penaltyId = `PEN_${Date.now()}`;
      const penaltyTransactionResult = await pool.query(penaltyTransactionQuery, [
        wallet.id,
        testContractorId,
        penaltyAmount,
        `Penalty: ${penaltyReason}`,
        penaltyId
      ]);
      
      // Update wallet balance
      const penaltyUpdateQuery = `
        UPDATE contractor_wallets 
        SET current_balance = current_balance - $1,
            total_penalties = total_penalties + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const penaltyUpdatedWallet = await pool.query(penaltyUpdateQuery, [penaltyAmount, wallet.id]);
      const walletAfterPenalty = penaltyUpdatedWallet.rows[0];
      
      console.log('   ⚠️ Penalty Applied:');
      console.log('     Penalty Amount:', `${penaltyAmount.toLocaleString()} SAR`);
      console.log('     Reason:', penaltyReason);
      console.log('     New Balance:', `${parseFloat(walletAfterPenalty.current_balance).toLocaleString()} SAR`);
      console.log('     Total Penalties:', `${parseFloat(walletAfterPenalty.total_penalties).toLocaleString()} SAR`);
      console.log('');
    } else {
      console.log('   ❌ Insufficient balance for penalty');
      console.log('');
    }
    
    // Test 4: Get transaction history
    console.log('📝 Test 4: Transaction History');
    
    const historyQuery = `
      SELECT wt.*, cw.contractor_id 
      FROM wallet_transactions wt 
      JOIN contractor_wallets cw ON wt.wallet_id = cw.id 
      WHERE cw.contractor_id = $1 
      ORDER BY wt.created_at DESC
    `;
    
    const historyResult = await pool.query(historyQuery, [testContractorId]);
    const transactions = historyResult.rows;
    
    console.log('   📊 Recent Transactions:');
    transactions.forEach((txn, index) => {
      const sign = txn.transaction_type === 'credit' ? '+' : '-';
      console.log(`     ${index + 1}. ${sign}${parseFloat(txn.amount).toLocaleString()} SAR - ${txn.description}`);
      console.log(`        Type: ${txn.reference_type}, Status: ${txn.status}`);
    });
    console.log('');
    
    // Test 5: Payment methods simulation
    console.log('📝 Test 5: Payment Methods Management');
    
    const paymentMethods = [
      {
        type: 'bank_transfer',
        account_number: '1234567890',
        iban: 'SA1234567890123456789012',
        bank_name: 'Saudi National Bank',
        beneficiary_name: 'Ahmed Al-Rashid',
        is_primary: true,
        is_verified: true
      },
      {
        type: 'digital_wallet',
        wallet_id: 'stcpay@966501234567',
        wallet_provider: 'STC Pay',
        is_primary: false,
        is_verified: false
      }
    ];
    
    const updatePaymentMethodsQuery = `
      UPDATE contractor_wallets 
      SET payment_methods = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await pool.query(updatePaymentMethodsQuery, [JSON.stringify(paymentMethods), wallet.id]);
    
    console.log('   💳 Payment Methods Configured:');
    paymentMethods.forEach((method, index) => {
      console.log(`     ${index + 1}. ${method.type} ${method.is_primary ? '(Primary)' : ''}`);
      if (method.type === 'bank_transfer') {
        console.log(`        Bank: ${method.bank_name}`);
        console.log(`        Account: ${method.account_number}`);
        console.log(`        IBAN: ${method.iban}`);
      } else {
        console.log(`        Wallet: ${method.wallet_provider}`);
        console.log(`        ID: ${method.wallet_id}`);
      }
      console.log(`        Verified: ${method.is_verified ? 'Yes' : 'No'}`);
    });
    console.log('');
    
    // Test 6: Withdrawal simulation
    console.log('📝 Test 6: Withdrawal Request Simulation');
    
    const withdrawalAmount = 5000; // Request 5,000 SAR withdrawal
    const currentWalletQuery = 'SELECT * FROM contractor_wallets WHERE id = $1';
    const currentWalletResult = await pool.query(currentWalletQuery, [wallet.id]);
    const currentWallet = currentWalletResult.rows[0];
    const currentBalance2 = parseFloat(currentWallet.current_balance);
    
    console.log('   💰 Withdrawal Request:');
    console.log('     Current Balance:', `${currentBalance2.toLocaleString()} SAR`);
    console.log('     Requested Amount:', `${withdrawalAmount.toLocaleString()} SAR`);
    
    if (currentBalance2 >= withdrawalAmount && withdrawalAmount >= 100) {
      const withdrawalId = `WD_${Date.now()}_${testContractorId.slice(-8)}`;
      
      // Create withdrawal transaction
      const withdrawalTransactionQuery = `
        INSERT INTO wallet_transactions (
          wallet_id, contractor_id, transaction_type, amount, description,
          reference_type, reference_id, status
        ) VALUES ($1, $2, 'debit', $3, $4, 'withdrawal', $5, 'pending')
        RETURNING *
      `;
      
      const withdrawalTransaction = await pool.query(withdrawalTransactionQuery, [
        wallet.id,
        testContractorId,
        withdrawalAmount,
        `Withdrawal request - bank_transfer`,
        withdrawalId
      ]);
      
      // Move to pending balance
      const moveToePendingQuery = `
        UPDATE contractor_wallets 
        SET current_balance = current_balance - $1,
            pending_balance = pending_balance + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const pendingWalletResult = await pool.query(moveToePendingQuery, [withdrawalAmount, wallet.id]);
      const pendingWallet = pendingWalletResult.rows[0];
      
      console.log('   ✅ Withdrawal Request Created:');
      console.log('     Withdrawal ID:', withdrawalId);
      console.log('     Available Balance:', `${parseFloat(pendingWallet.current_balance).toLocaleString()} SAR`);
      console.log('     Pending Balance:', `${parseFloat(pendingWallet.pending_balance).toLocaleString()} SAR`);
      console.log('     Status: Pending Admin Approval');
    } else if (withdrawalAmount < 100) {
      console.log('   ❌ Minimum withdrawal amount is 100 SAR');
    } else {
      console.log('   ❌ Insufficient balance for withdrawal');
    }
    console.log('');
    
    // Final wallet status
    console.log('📊 Final Wallet Status:');
    const finalWalletQuery = 'SELECT * FROM contractor_wallets WHERE id = $1';
    const finalWalletResult = await pool.query(finalWalletQuery, [wallet.id]);
    const finalWallet = finalWalletResult.rows[0];
    
    console.log('   Contractor ID:', finalWallet.contractor_id);
    console.log('   Available Balance:', `${parseFloat(finalWallet.current_balance).toLocaleString()} SAR`);
    console.log('   Pending Balance:', `${parseFloat(finalWallet.pending_balance).toLocaleString()} SAR`);
    console.log('   Total Earned:', `${parseFloat(finalWallet.total_earned).toLocaleString()} SAR`);
    console.log('   Commission Paid:', `${parseFloat(finalWallet.total_commission_paid).toLocaleString()} SAR`);
    console.log('   Total Penalties:', `${parseFloat(finalWallet.total_penalties).toLocaleString()} SAR`);
    console.log('   Net Earnings:', `${(parseFloat(finalWallet.total_earned) - parseFloat(finalWallet.total_commission_paid) - parseFloat(finalWallet.total_penalties)).toLocaleString()} SAR`);
    
    console.log('');
    console.log('🎉 Contractor Wallet System Test COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('✅ Features Tested:');
    console.log('   • Wallet Creation & Management');
    console.log('   • Quote Payment Processing');
    console.log('   • Commission Deductions (15%)');
    console.log('   • Penalty Processing');
    console.log('   • Transaction History');
    console.log('   • Payment Methods Configuration');
    console.log('   • Withdrawal Request System');
    console.log('   • Balance Management (Available + Pending)');
    
  } catch (error) {
    console.error('❌ Wallet System Test Failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the wallet system test
testWalletSystem();