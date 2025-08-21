const { database } = require('./dist/config/database.config.js');
const fs = require('fs');

async function runMigration() {
  try {
    console.log('Running contractor assignments table migration...');
    
    const sql = fs.readFileSync('./migrations/create-contractor-assignments.sql', 'utf8');
    await database.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('Created table: contractor_quote_assignments');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    process.exit(0);
  }
}

runMigration();