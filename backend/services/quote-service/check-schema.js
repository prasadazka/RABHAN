const pg = require('pg');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345'
});

async function checkSchema() {
  try {
    console.log('Checking quote service database schema...\n');
    
    // Get all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Available Tables:');
    tables.rows.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    
    // Check each table's structure and sample data
    for (const table of tables.rows) {
      const tableName = table.table_name;
      console.log(`\n📊 Table: ${tableName}`);
      
      // Get column information
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      
      console.log('   Columns:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      
      // Get row count
      const count = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`   Rows: ${count.rows[0].count}`);
      
      // Show sample data if there are rows
      if (parseInt(count.rows[0].count) > 0) {
        const sample = await pool.query(`SELECT * FROM ${tableName} LIMIT 3`);
        console.log('   Sample data:');
        sample.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(row, null, 2).replace(/\n/g, '\n      ')}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();