const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345'
});

async function checkTables() {
  try {
    console.log('🔍 Checking Database Tables...');
    
    // Check what tables exist
    const tablesQuery = `
      SELECT table_name, table_schema
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const result = await pool.query(tablesQuery);
    
    if (result.rows.length === 0) {
      console.log('❌ No tables found in database');
    } else {
      console.log('✅ Existing Tables:');
      result.rows.forEach(row => {
        console.log(`   • ${row.table_name}`);
      });
    }
    
    // Check specifically for wallet tables
    console.log('\n🔍 Checking Wallet Tables...');
    
    const walletTables = ['contractor_wallets', 'wallet_transactions'];
    
    for (const tableName of walletTables) {
      try {
        const checkQuery = `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `;
        
        const columns = await pool.query(checkQuery, [tableName]);
        
        if (columns.rows.length === 0) {
          console.log(`❌ Table '${tableName}' does not exist`);
        } else {
          console.log(`✅ Table '${tableName}' exists with columns:`);
          columns.rows.forEach(col => {
            console.log(`     ${col.column_name} (${col.data_type})`);
          });
        }
      } catch (error) {
        console.log(`❌ Error checking table '${tableName}':`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();