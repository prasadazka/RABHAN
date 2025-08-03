const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Run verification status migration for contractor service
const config = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '12345',
  database: 'rabhan_contractors'
};

async function runVerificationMigration() {
  const pool = new Pool(config);
  
  try {
    console.log('🚀 Running contractor verification status migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/002_add_verification_status.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Run migration
    await pool.query(migrationSQL);
    console.log('✅ Verification status migration completed successfully');
    
    // Verify changes
    console.log('🔍 Verifying migration results...');
    
    // Check if verification_status column was added
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'contractors' 
        AND column_name = 'verification_status'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ verification_status column added successfully');
      console.log(`   Type: ${columnCheck.rows[0].data_type}`);
      console.log(`   Default: ${columnCheck.rows[0].column_default}`);
    } else {
      console.log('⚠️ verification_status column not found');
    }
    
    // Check function creation
    const functionCheck = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'calculate_contractor_verification_status'
        AND routine_type = 'FUNCTION'
    `);
    
    if (functionCheck.rows.length > 0) {
      console.log('✅ calculate_contractor_verification_status function created');
    } else {
      console.log('⚠️ calculate_contractor_verification_status function not found');
    }
    
    // Check trigger creation
    const triggerCheck = await pool.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'contractor_verification_update_trigger'
    `);
    
    if (triggerCheck.rows.length > 0) {
      console.log('✅ contractor_verification_update_trigger created');
    } else {
      console.log('⚠️ contractor_verification_update_trigger not found');
    }
    
    // Show contractor verification status summary
    const statusSummary = await pool.query(`
      SELECT 
        verification_status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
      FROM contractors 
      GROUP BY verification_status
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Contractor Verification Status Summary:');
    statusSummary.rows.forEach(row => {
      console.log(`   ${row.verification_status}: ${row.count} (${row.percentage}%)`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Restart contractor service to load new verification functionality');
    console.log('   2. Test verification endpoints');
    console.log('   3. Integrate with document service for full verification workflow');
    
  } catch (error) {
    console.error('❌ Error running verification migration:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runVerificationMigration()
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runVerificationMigration };