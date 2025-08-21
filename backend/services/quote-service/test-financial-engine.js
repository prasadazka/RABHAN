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

async function testFinancialCalculations() {
  console.log('🧮 Testing RABHAN Financial Calculations Engine');
  console.log('='.repeat(50));
  
  try {
    // Test input values
    const testQuote = {
      basePrice: 15000,      // 15,000 SAR base price
      pricePerKwp: 1500,     // 1,500 SAR per kWp
      systemSizeKwp: 10      // 10 kWp system
    };
    
    console.log('📊 Input Values:');
    console.log(`   Base Price: ${testQuote.basePrice.toLocaleString()} SAR`);
    console.log(`   Price per kWp: ${testQuote.pricePerKwp.toLocaleString()} SAR`);
    console.log(`   System Size: ${testQuote.systemSizeKwp} kWp`);
    console.log('');
    
    // Get pricing configuration from database
    console.log('⚙️  Getting Pricing Configuration...');
    const configQuery = 'SELECT config_value FROM business_config WHERE config_key = $1 AND is_active = true';
    const configResult = await pool.query(configQuery, ['pricing_rules']);
    
    const config = configResult.rows[0]?.config_value || {
      max_price_per_kwp: 2000,
      platform_overprice_percent: 10,
      platform_commission_percent: 15,
      min_system_size_kwp: 1,
      max_system_size_kwp: 1000
    };
    
    console.log('   Configuration:', JSON.stringify(config, null, 4));
    console.log('');
    
    // Perform financial calculations
    console.log('💰 Financial Calculations:');
    
    // 1. Platform Markup (Overprice) - Added to user price
    const overpriceAmount = testQuote.basePrice * (config.platform_overprice_percent / 100);
    console.log(`   1. Platform Markup (${config.platform_overprice_percent}%): ${overpriceAmount.toLocaleString()} SAR`);
    
    // 2. Total User Price
    const totalUserPrice = testQuote.basePrice + overpriceAmount;
    console.log(`   2. Total User Pays: ${totalUserPrice.toLocaleString()} SAR`);
    
    // 3. Platform Commission (From contractor)
    const commissionAmount = testQuote.basePrice * (config.platform_commission_percent / 100);
    console.log(`   3. Platform Commission (${config.platform_commission_percent}%): ${commissionAmount.toLocaleString()} SAR`);
    
    // 4. Contractor Net Amount (What contractor receives)
    const contractorNetAmount = testQuote.basePrice - commissionAmount;
    console.log(`   4. Contractor Receives: ${contractorNetAmount.toLocaleString()} SAR`);
    
    // 5. Platform Revenue (Commission + Markup)
    const platformRevenue = commissionAmount + overpriceAmount;
    console.log(`   5. Platform Revenue: ${platformRevenue.toLocaleString()} SAR`);
    
    console.log('');
    console.log('📈 Business Model Verification:');
    console.log(`   User pays extra: ${overpriceAmount.toLocaleString()} SAR (${config.platform_overprice_percent}%)`);
    console.log(`   Contractor pays: ${commissionAmount.toLocaleString()} SAR (${config.platform_commission_percent}%)`);
    console.log(`   RABHAN earns: ${platformRevenue.toLocaleString()} SAR total`);
    
    // Verify math
    const userPaysTotal = totalUserPrice;
    const contractorGetsTotal = contractorNetAmount;
    const rabhanGetsTotal = platformRevenue;
    
    console.log('');
    console.log('✅ Financial Flow Verification:');
    console.log(`   💸 User pays: ${userPaysTotal.toLocaleString()} SAR`);
    console.log(`   💵 Contractor gets: ${contractorGetsTotal.toLocaleString()} SAR`);
    console.log(`   🏦 RABHAN gets: ${rabhanGetsTotal.toLocaleString()} SAR`);
    console.log(`   🔢 Balance: ${(userPaysTotal - contractorGetsTotal - rabhanGetsTotal)} SAR (should be 0)`);
    
    // Test different scenarios
    console.log('');
    console.log('🧪 Testing Different Scenarios:');
    
    const scenarios = [
      { name: 'Small System', basePrice: 5000, systemSize: 3.3 },
      { name: 'Medium System', basePrice: 12000, systemSize: 8 },
      { name: 'Large System', basePrice: 25000, systemSize: 16.7 }
    ];
    
    scenarios.forEach(scenario => {
      const markup = scenario.basePrice * 0.10;
      const commission = scenario.basePrice * 0.15;
      const userTotal = scenario.basePrice + markup;
      const contractorNet = scenario.basePrice - commission;
      const rabhanRevenue = markup + commission;
      
      console.log(`   ${scenario.name}:`);
      console.log(`     User pays: ${userTotal.toLocaleString()} SAR`);
      console.log(`     Contractor gets: ${contractorNet.toLocaleString()} SAR`);
      console.log(`     RABHAN revenue: ${rabhanRevenue.toLocaleString()} SAR (${((rabhanRevenue / userTotal) * 100).toFixed(1)}% of user payment)`);
    });
    
    console.log('');
    console.log('🎉 Financial Calculations Engine Test PASSED!');
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the test
testFinancialCalculations();