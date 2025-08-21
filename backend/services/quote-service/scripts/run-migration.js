const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'quote_service_db'
  });

  try {
    await client.connect();
    console.log('✅ Connected to quote_service_db');

    // Read and execute migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_create_quote_tables_simplified.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');

    // Execute the entire migration as one transaction
    await client.query('BEGIN');
    console.log('🚀 Starting migration transaction...');

    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅ Migration completed successfully!');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed, rolled back:', err.message);
      throw err;
    }

    // Check created tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📊 Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    // Check business config
    const configResult = await client.query(
      `SELECT config_key, config_value FROM business_config WHERE is_active = true`
    );

    console.log('\n⚙️ Business Configuration:');
    configResult.rows.forEach(row => {
      console.log(`  - ${row.config_key}:`, row.config_value);
    });

  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();