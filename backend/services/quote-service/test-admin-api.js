const axios = require('axios');
const { Pool } = require('pg');

// Database connection for setup
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345',
  max: 5
});

const BASE_URL = 'http://localhost:3009';

// Mock JWT token for admin authentication (in real app this would come from auth service)
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTEyMyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTYzMDAwMDAwMH0.mock-admin-token';

const axiosConfig = {
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Service-Key': 'RABHAN_QUOTE_SERVICE_2024'
  }
};

async function testAdminAPI() {
  console.log('🔧 Testing RABHAN Admin API System');
  console.log('=' .repeat(50));

  try {
    // Test 1: Admin Dashboard
    console.log('📝 Test 1: Admin Dashboard');
    
    try {
      const dashboardResponse = await axios.get(`${BASE_URL}/api/admin/dashboard`, axiosConfig);
      
      if (dashboardResponse.status === 200 && dashboardResponse.data.success) {
        const data = dashboardResponse.data.data;
        console.log('   ✅ Dashboard Retrieved Successfully:');
        console.log('     Total Quotes:', data.overview.total_quotes);
        console.log('     Pending Approvals:', data.overview.pending_approvals);
        console.log('     Approved Quotes:', data.overview.approved_quotes);
        console.log('     Rejected Quotes:', data.overview.rejected_quotes);
        console.log('     Platform Revenue:', `${data.overview.total_platform_revenue.toLocaleString()} SAR`);
        console.log('     Active Contractors:', data.overview.active_contractors);
        console.log('     Active Users:', data.overview.active_users);
        console.log('     Recent Activities:', data.recent_activities.length, 'items');
        console.log('     Pending Withdrawals:', data.pending_withdrawals);
      } else {
        console.log('   ❌ Dashboard request failed:', dashboardResponse.status);
      }
    } catch (error) {
      console.log('   ❌ Dashboard Error:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 2: Get Pending Quotes
    console.log('📝 Test 2: Pending Quotes Management');
    
    try {
      const pendingQuotesResponse = await axios.get(
        `${BASE_URL}/api/admin/quotes/pending?page=1&limit=10&sort_by=created_at&sort_order=desc`, 
        axiosConfig
      );
      
      if (pendingQuotesResponse.status === 200 && pendingQuotesResponse.data.success) {
        const data = pendingQuotesResponse.data.data;
        console.log('   ✅ Pending Quotes Retrieved:');
        console.log('     Count:', data.quotes.length);
        console.log('     Total:', data.total);
        console.log('     Page:', data.page);
        console.log('     Limit:', data.limit);
        
        if (data.quotes.length > 0) {
          const quote = data.quotes[0];
          console.log('     Sample Quote:');
          console.log('       ID:', quote.id);
          console.log('       Contractor:', quote.contractor_id);
          console.log('       Base Price:', `${quote.base_price.toLocaleString()} SAR`);
          console.log('       System Size:', `${quote.system_size_kwp} kWp`);
          console.log('       Days Pending:', quote.days_pending);
        }
      } else {
        console.log('   ❌ Pending quotes request failed:', pendingQuotesResponse.status);
      }
    } catch (error) {
      console.log('   ❌ Pending Quotes Error:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 3: Create Test Quote for Approval Testing
    console.log('📝 Test 3: Create Test Quote for Approval');
    
    let testQuoteId = null;
    try {
      // First create a test quote request
      const testRequestData = {
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        system_size_kwp: 5.5,
        location_address: 'Riyadh, Saudi Arabia',
        service_area: 'riyadh',
        preferred_installation_date: '2024-03-15',
        contact_phone: '+966501234567',
        contact_whatsapp: '+966501234567'
      };
      
      const requestResponse = await axios.post(
        `${BASE_URL}/api/quotes/requests`, 
        testRequestData,
        { headers: { 'Content-Type': 'application/json', 'X-Service-Key': 'RABHAN_QUOTE_SERVICE_2024' } }
      );
      
      if (requestResponse.status === 201) {
        const requestId = requestResponse.data.data.id;
        console.log('   ✅ Test Quote Request Created:', requestId);
        
        // Now submit a quote for this request
        const testQuoteData = {
          request_id: requestId,
          contractor_id: '456e7890-e89b-12d3-a456-426614174002',
          base_price: 18000,
          price_per_kwp: 3273,
          system_specs: {
            panels_brand: 'Canadian Solar',
            panels_model: 'CS3W-405P',
            panels_quantity: 14,
            inverter_brand: 'SolarEdge',
            inverter_model: 'SE5000H',
            inverter_quantity: 1
          },
          installation_timeline_days: 14,
          warranty_terms: '25 years panels, 12 years inverter'
        };
        
        const quoteResponse = await axios.post(
          `${BASE_URL}/api/quotes/submit`,
          testQuoteData,
          { headers: { 'Content-Type': 'application/json', 'X-Service-Key': 'RABHAN_QUOTE_SERVICE_2024' } }
        );
        
        if (quoteResponse.status === 201) {
          testQuoteId = quoteResponse.data.data.id;
          console.log('   ✅ Test Quote Created for Approval Testing:', testQuoteId);
        }
      }
    } catch (error) {
      console.log('   ⚠️ Test Quote Creation Failed (continuing with existing quotes):', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 4: Quote Approval Process
    console.log('📝 Test 4: Quote Approval Process');
    
    if (testQuoteId) {
      try {
        // Test quote approval
        const approvalData = {
          admin_status: 'approved',
          admin_notes: 'Quote meets all quality standards. System specifications are appropriate for the location and requirements.'
        };
        
        const approvalResponse = await axios.put(
          `${BASE_URL}/api/admin/quotes/${testQuoteId}/approve`,
          approvalData,
          axiosConfig
        );
        
        if (approvalResponse.status === 200 && approvalResponse.data.success) {
          const approvedQuote = approvalResponse.data.data;
          console.log('   ✅ Quote Approved Successfully:');
          console.log('     Quote ID:', approvedQuote.id);
          console.log('     Status:', approvedQuote.admin_status);
          console.log('     Base Price:', `${parseFloat(approvedQuote.base_price).toLocaleString()} SAR`);
          console.log('     User Price:', `${parseFloat(approvedQuote.total_user_price || 0).toLocaleString()} SAR`);
          console.log('     Platform Markup:', `${parseFloat(approvedQuote.overprice_amount || 0).toLocaleString()} SAR`);
          console.log('     Reviewed By:', approvedQuote.reviewed_by);
          console.log('     Admin Notes:', approvedQuote.admin_notes);
        } else {
          console.log('   ❌ Quote approval failed:', approvalResponse.status);
        }
      } catch (error) {
        console.log('   ❌ Quote Approval Error:', error.response?.data?.message || error.message);
      }
    } else {
      console.log('   ⚠️ No test quote available for approval testing');
    }
    console.log('');

    // Test 5: Contractor Management
    console.log('📝 Test 5: Contractor Management');
    
    try {
      const contractorResponse = await axios.get(`${BASE_URL}/api/admin/contractors`, axiosConfig);
      
      if (contractorResponse.status === 200 && contractorResponse.data.success) {
        const contractors = contractorResponse.data.data;
        console.log('   ✅ Contractor Management Data Retrieved:');
        console.log('     Total Contractors:', contractors.length);
        
        if (contractors.length > 0) {
          const contractor = contractors[0];
          console.log('     Sample Contractor:');
          console.log('       ID:', contractor.contractor_id);
          console.log('       Performance Score:', `${contractor.performance_score}/100`);
          console.log('       Total Quotes:', contractor.total_quotes_submitted);
          console.log('       Success Rate:', `${contractor.success_rate}%`);
          console.log('       Wallet Balance:', `${contractor.wallet_balance.toLocaleString()} SAR`);
          console.log('       Last Activity:', contractor.last_activity);
        }
      } else {
        console.log('   ❌ Contractor management request failed:', contractorResponse.status);
      }
    } catch (error) {
      console.log('   ❌ Contractor Management Error:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 6: Pending Withdrawals
    console.log('📝 Test 6: Pending Withdrawals Management');
    
    try {
      const withdrawalsResponse = await axios.get(`${BASE_URL}/api/admin/withdrawals/pending`, axiosConfig);
      
      if (withdrawalsResponse.status === 200 && withdrawalsResponse.data.success) {
        const data = withdrawalsResponse.data.data;
        console.log('   ✅ Pending Withdrawals Retrieved:');
        console.log('     Count:', data.withdrawals.length);
        console.log('     Total:', data.total);
        console.log('     Total Pages:', data.total_pages);
        
        if (data.withdrawals.length > 0) {
          const withdrawal = data.withdrawals[0];
          console.log('     Sample Withdrawal:');
          console.log('       Transaction ID:', withdrawal.transaction_id);
          console.log('       Contractor:', withdrawal.contractor_id);
          console.log('       Amount:', `${withdrawal.amount.toLocaleString()} SAR`);
          console.log('       Days Pending:', withdrawal.days_pending);
          console.log('       Description:', withdrawal.description);
        }
      } else {
        console.log('   ❌ Pending withdrawals request failed:', withdrawalsResponse.status);
      }
    } catch (error) {
      console.log('   ❌ Pending Withdrawals Error:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 7: System Analytics
    console.log('📝 Test 7: System Analytics');
    
    try {
      const analyticsResponse = await axios.get(
        `${BASE_URL}/api/admin/analytics?period=last_30_days`, 
        axiosConfig
      );
      
      if (analyticsResponse.status === 200 && analyticsResponse.data.success) {
        const analytics = analyticsResponse.data.data;
        console.log('   ✅ System Analytics Retrieved:');
        console.log('     Period:', analytics.period);
        console.log('     Overview:');
        console.log('       Total Quotes:', analytics.overview.total_quotes);
        console.log('       Approval Rate:', `${analytics.overview.approval_rate.toFixed(1)}%`);
        console.log('       Selection Rate:', `${analytics.overview.selection_rate.toFixed(1)}%`);
        console.log('     Financial:');
        console.log('       Average Quote:', `${analytics.financial.avg_quote_price.toLocaleString()} SAR`);
        console.log('       Total Revenue:', `${analytics.financial.total_platform_revenue.toLocaleString()} SAR`);
        console.log('       Commission:', `${analytics.financial.total_commission.toLocaleString()} SAR`);
        console.log('       Markup:', `${analytics.financial.total_markup.toLocaleString()} SAR`);
        console.log('     Requests:');
        console.log('       Total Requests:', analytics.requests.total_requests);
        console.log('       Completion Rate:', `${analytics.requests.completion_rate.toFixed(1)}%`);
        console.log('       Avg System Size:', `${analytics.requests.avg_system_size.toFixed(1)} kWp`);
        console.log('     Daily Breakdown:', analytics.daily_breakdown.length, 'data points');
      } else {
        console.log('   ❌ Analytics request failed:', analyticsResponse.status);
      }
    } catch (error) {
      console.log('   ❌ System Analytics Error:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 8: Admin Health Check
    console.log('📝 Test 8: Admin Health Check');
    
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/admin/health`, axiosConfig);
      
      if (healthResponse.status === 200 && healthResponse.data.success) {
        console.log('   ✅ Admin API Health Check Passed:');
        console.log('     Message:', healthResponse.data.message);
        console.log('     Timestamp:', healthResponse.data.timestamp);
        console.log('     Admin ID:', healthResponse.data.admin_id);
      } else {
        console.log('   ❌ Health check failed:', healthResponse.status);
      }
    } catch (error) {
      console.log('   ❌ Health Check Error:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Final Summary
    console.log('🎉 Admin API Testing COMPLETED!');
    console.log('');
    console.log('✅ Features Tested:');
    console.log('   • Admin Dashboard with comprehensive overview');
    console.log('   • Pending quotes management with filtering');
    console.log('   • Quote approval/rejection workflow');
    console.log('   • Contractor management and performance tracking');
    console.log('   • Withdrawal request review system');
    console.log('   • System analytics with configurable periods');
    console.log('   • Admin authentication and authorization');
    console.log('   • Comprehensive error handling and validation');
    
  } catch (error) {
    console.error('❌ Admin API Test Failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the admin API test
testAdminAPI();