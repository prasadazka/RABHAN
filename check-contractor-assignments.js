const { Pool } = require('pg');

async function checkDatabase() {
  // Check quote service database
  const quotePool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'quote_service_db',
    user: 'postgres',
    password: '12345'
  });

  // Check auth database  
  const authPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_auth',
    user: 'postgres',
    password: '12345'
  });

  try {
    console.log('=== Quote Service DB Tables ===');
    const tablesResult = await quotePool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log('Tables:', tablesResult.rows.map(r => r.table_name));

    console.log('\n=== contractor_quotes table structure ===');
    const contractorQuotesStructure = await quotePool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'contractor_quotes' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    contractorQuotesStructure.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    console.log('\n=== Sample contractor_quotes data ===');
    const sampleData = await quotePool.query('SELECT * FROM contractor_quotes LIMIT 3');
    console.log('Sample records count:', sampleData.rows.length);
    if (sampleData.rows.length > 0) {
      console.log('First record:', sampleData.rows[0]);
    }

    console.log('\n=== Contractors table structure ===');
    const contractorStructure = await authPool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'contractors' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    contractorStructure.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    console.log('\n=== Available Contractors from Auth DB ===');
    const contractorsResult = await authPool.query(`
      SELECT id, email, first_name, last_name, company_name, phone, status
      FROM contractors 
      LIMIT 10
    `);
    
    console.log('\n=== Contractor Status Values ===');
    const statusValues = await authPool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM contractors 
      GROUP BY status
      ORDER BY count DESC
    `);
    console.log('Status distribution:', statusValues.rows);
    console.log('Available contractors:', contractorsResult.rows);

    console.log('\n=== contractor_quote_assignments table structure ===');
    const assignmentStructure = await quotePool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'contractor_quote_assignments' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    assignmentStructure.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    console.log('\n=== Sample contractor_quote_assignments data ===');
    const assignmentData = await quotePool.query('SELECT * FROM contractor_quote_assignments LIMIT 3');
    console.log('Sample assignment records count:', assignmentData.rows.length);
    if (assignmentData.rows.length > 0) {
      console.log('First assignment record:', assignmentData.rows[0]);
    }

    console.log('\n=== Quote without assignments ===');
    const quoteResult = await quotePool.query(`
      SELECT id, user_id, status, service_area, system_size_kwp
      FROM quote_requests 
      WHERE id = 'fd0a9edc-7ba5-444c-9164-f5782c742879'
    `);
    console.log('Quote details:', quoteResult.rows[0]);

  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await quotePool.end();
    await authPool.end();
  }
}

checkDatabase();