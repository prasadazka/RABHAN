const { Pool } = require('pg');
const fs = require('fs');

async function dumpLocalQuotes() {
  try {
    console.log('🔄 Connecting to local quote database...');
    
    const localPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'quote_service_db',
      user: 'postgres',
      password: '12345'
    });
    
    // Get all quote requests
    console.log('📊 Extracting quote requests...');
    const quotesResult = await localPool.query(`
      SELECT * FROM quote_requests ORDER BY created_at
    `);
    
    // Get all contractor assignments  
    console.log('👥 Extracting contractor assignments...');
    const assignmentsResult = await localPool.query(`
      SELECT * FROM contractor_quote_assignments ORDER BY assigned_at
    `);
    
    // Get all contractor quotes
    console.log('💰 Extracting contractor quotes...');
    const contractorQuotesResult = await localPool.query(`
      SELECT * FROM contractor_quotes ORDER BY created_at
    `);
    
    console.log(`Found:
    - ${quotesResult.rows.length} quote requests
    - ${assignmentsResult.rows.length} contractor assignments  
    - ${contractorQuotesResult.rows.length} contractor quotes`);
    
    // Generate SQL insert statements
    let sqlContent = '-- Local Quote Data Export\n\n';
    
    // Quote requests
    if (quotesResult.rows.length > 0) {
      sqlContent += '-- Quote Requests\n';
      for (const row of quotesResult.rows) {
        const values = [
          `'${row.id}'`,
          `'${row.user_id}'`, 
          `'${JSON.stringify(row.property_details).replace(/'/g, "''")}'`,
          `'${JSON.stringify(row.electricity_consumption).replace(/'/g, "''")}'`,
          row.system_size_kwp,
          row.location_lat || 'NULL',
          row.location_lng || 'NULL', 
          row.location_address ? `'${row.location_address.replace(/'/g, "''")}'` : 'NULL',
          row.roof_size_sqm || 'NULL',
          row.service_area ? `'${row.service_area}'` : 'NULL',
          `'${row.status}'`,
          `'${JSON.stringify(row.inspection_dates || []).replace(/'/g, "''")}'`,
          row.selected_contractors && row.selected_contractors.length > 0 ? `ARRAY[${row.selected_contractors.map(c => `'${c}'`).join(',')}]::uuid[]` : 'ARRAY[]::uuid[]',
          row.max_contractors || 3,
          row.inspection_penalty_acknowledged || false,
          row.penalty_amount || 0,
          `'${row.created_at.toISOString()}'`,
          `'${row.updated_at.toISOString()}'`,
          row.cancelled_at ? `'${row.cancelled_at.toISOString()}'` : 'NULL',
          row.cancellation_reason ? `'${row.cancellation_reason.replace(/'/g, "''")}'` : 'NULL'
        ];
        
        sqlContent += `INSERT INTO quote_requests (id, user_id, property_details, electricity_consumption, system_size_kwp, location_lat, location_lng, location_address, roof_size_sqm, service_area, status, inspection_dates, selected_contractors, max_contractors, inspection_penalty_acknowledged, penalty_amount, created_at, updated_at, cancelled_at, cancellation_reason) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;\n`;
      }
      sqlContent += '\n';
    }
    
    // Contractor assignments
    if (assignmentsResult.rows.length > 0) {
      sqlContent += '-- Contractor Quote Assignments\n';
      for (const row of assignmentsResult.rows) {
        const values = [
          `'${row.request_id}'`,
          `'${row.contractor_id}'`,
          `'${row.status}'`,
          `'${row.assigned_at.toISOString()}'`,
          row.viewed_at ? `'${row.viewed_at.toISOString()}'` : 'NULL',
          row.responded_at ? `'${row.responded_at.toISOString()}'` : 'NULL',
          row.response_notes ? `'${row.response_notes.replace(/'/g, "''")}'` : 'NULL',
          `'${row.created_at.toISOString()}'`,
          `'${row.updated_at.toISOString()}'`
        ];
        
        sqlContent += `INSERT INTO contractor_quote_assignments (request_id, contractor_id, status, assigned_at, viewed_at, responded_at, response_notes, created_at, updated_at) VALUES (${values.join(', ')}) ON CONFLICT (request_id, contractor_id) DO NOTHING;\n`;
      }
      sqlContent += '\n';
    }
    
    // Contractor quotes  
    if (contractorQuotesResult.rows.length > 0) {
      sqlContent += '-- Contractor Quotes\n';
      for (const row of contractorQuotesResult.rows) {
        const values = [
          `'${row.id}'`,
          `'${row.request_id}'`,
          `'${row.contractor_id}'`,
          row.base_price,
          row.price_per_kwp,
          row.installation_timeline_days,
          row.system_specs ? `'${JSON.stringify(row.system_specs).replace(/'/g, "''")}'` : 'NULL',
          row.admin_status ? `'${row.admin_status}'` : 'NULL',
          `'${row.created_at.toISOString()}'`,
          `'${row.updated_at.toISOString()}'`
        ];
        
        sqlContent += `INSERT INTO contractor_quotes (id, request_id, contractor_id, base_price, price_per_kwp, installation_timeline_days, system_specs, admin_status, created_at, updated_at) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;\n`;
      }
    }
    
    // Write to file
    fs.writeFileSync('local_quotes_backup.sql', sqlContent);
    console.log('✅ Local quote data exported to local_quotes_backup.sql');
    
    await localPool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

dumpLocalQuotes();