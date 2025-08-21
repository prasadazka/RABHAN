const { Pool } = require('pg');
require('dotenv').config();

async function testQuoteResponse() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const userId = '4fc43fb0-fabb-41e5-b708-083e23cc9e62';
    
    // Simulate the exact service query and formatting
    const query = `
      SELECT qr.*, 
             (SELECT COUNT(*) FROM contractor_quotes cq WHERE cq.request_id = qr.id) as quote_count,
             (SELECT COUNT(*) FROM contractor_quotes cq WHERE cq.request_id = qr.id AND cq.admin_status = 'approved') as approved_quote_count
      FROM quote_requests qr 
      WHERE user_id = $1
      ORDER BY created_at desc
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, 10, 0]);
    
    console.log('Raw database result:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Apply the formatting function logic
    const formatted = result.rows.map(row => {
      const propertyDetails = typeof row.property_details === 'string' 
        ? JSON.parse(row.property_details) 
        : row.property_details || {};

      return {
        id: row.id,
        user_id: row.user_id,
        property_details: propertyDetails,
        system_size_kwp: parseFloat(row.system_size_kwp),
        location_address: row.location_address,
        service_area: row.service_area,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        // Frontend expected fields
        preferred_installation_date: propertyDetails.preferred_installation_date || row.created_at,
        contact_phone: propertyDetails.contact_phone || '',
        quotes_count: row.quote_count || 0,
        approved_quote_count: row.approved_quote_count || 0
      };
    });
    
    console.log('\nFormatted response for frontend:');
    console.log(JSON.stringify({
      success: true,
      data: {
        requests: formatted,
        total: result.rows.length,
        page: 1,
        limit: 10
      }
    }, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testQuoteResponse();