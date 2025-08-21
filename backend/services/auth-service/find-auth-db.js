const pg = require('pg');

// Try different possible database names
const possibleDbs = [
  'auth_service_db',
  'rabhan_auth',
  'contractor_service_db', 
  'user_service_db',
  'rabhan_users',
  'postgres'
];

async function findAuthDatabase() {
  for (const dbName of possibleDbs) {
    try {
      console.log(`Trying database: ${dbName}...`);
      
      const pool = new pg.Pool({
        host: 'localhost',
        port: 5432,
        database: dbName,
        user: 'postgres',
        password: '12345'
      });
      
      // Check for contractor-related tables
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE '%contractor%' OR table_name LIKE '%user%')
        ORDER BY table_name;
      `);
      
      if (result.rows.length > 0) {
        console.log(`✅ Found database: ${dbName}`);
        console.log('Available tables:', result.rows.map(r => r.table_name).join(', '));
        
        // Try to get contractor data
        for (const row of result.rows) {
          const tableName = row.table_name;
          try {
            if (tableName.includes('contractor') || tableName === 'users') {
              const dataResult = await pool.query(`SELECT id, email, first_name, last_name FROM ${tableName} LIMIT 3`);
              if (dataResult.rows.length > 0) {
                console.log(`\n📋 Sample data from ${tableName}:`);
                dataResult.rows.forEach((record, index) => {
                  console.log(`${index + 1}. Email: ${record.email} | Name: ${record.first_name} ${record.last_name}`);
                });
              }
            }
          } catch (e) {
            // Table might not have the expected columns
          }
        }
      }
      
      await pool.end();
      
    } catch (error) {
      console.log(`❌ ${dbName}: ${error.message}`);
    }
  }
}

findAuthDatabase();