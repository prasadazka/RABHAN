const { Pool } = require('pg');

async function addContractorTypeFields() {
  console.log('🔧 Adding contractor type fields to contractors table...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_contractors',
    user: 'postgres',
    password: '12345'
  });
  
  try {
    // Check if columns already exist
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contractors' 
      AND column_name IN ('contractor_type', 'can_install', 'can_supply_only');
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('📋 Existing contractor type columns:', existingColumns);
    
    // Create enum type if it doesn't exist
    if (!existingColumns.includes('contractor_type')) {
      console.log('📝 Creating contractor_type enum...');
      await pool.query(`
        DO $$ BEGIN
          CREATE TYPE contractor_type_enum AS ENUM ('full_solar_contractor', 'solar_vendor_only');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      
      console.log('✅ Adding contractor_type column...');
      await pool.query(`
        ALTER TABLE contractors 
        ADD COLUMN contractor_type contractor_type_enum DEFAULT 'full_solar_contractor';
      `);
    }
    
    // Add can_install column
    if (!existingColumns.includes('can_install')) {
      console.log('✅ Adding can_install column...');
      await pool.query(`
        ALTER TABLE contractors 
        ADD COLUMN can_install BOOLEAN DEFAULT true;
      `);
    }
    
    // Add can_supply_only column
    if (!existingColumns.includes('can_supply_only')) {
      console.log('✅ Adding can_supply_only column...');
      await pool.query(`
        ALTER TABLE contractors 
        ADD COLUMN can_supply_only BOOLEAN DEFAULT false;
      `);
    }
    
    // Update existing contractors based on contractor_type
    console.log('🔄 Updating existing contractor capabilities...');
    await pool.query(`
      UPDATE contractors 
      SET 
        can_install = CASE 
          WHEN contractor_type = 'full_solar_contractor' THEN true 
          ELSE false 
        END,
        can_supply_only = CASE 
          WHEN contractor_type = 'solar_vendor_only' THEN true 
          ELSE false 
        END
      WHERE contractor_type IS NOT NULL;
    `);
    
    // Check the results
    const result = await pool.query(`
      SELECT 
        contractor_type,
        can_install,
        can_supply_only,
        COUNT(*) as count
      FROM contractors 
      GROUP BY contractor_type, can_install, can_supply_only
      ORDER BY contractor_type;
    `);
    
    console.log('');
    console.log('📊 Contractor type distribution:');
    result.rows.forEach(row => {
      console.log(`  ${row.contractor_type}: Install=${row.can_install}, Supply=${row.can_supply_only} (${row.count} contractors)`);
    });
    
    // Verify table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'contractors' 
      AND column_name IN ('contractor_type', 'can_install', 'can_supply_only')
      ORDER BY column_name;
    `);
    
    console.log('');
    console.log('✅ New contractor type fields added:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) - Default: ${col.column_default}`);
    });
    
    console.log('');
    console.log('🎯 Contractor type fields migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding contractor type fields:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  addContractorTypeFields().catch(console.error);
}

module.exports = { addContractorTypeFields };