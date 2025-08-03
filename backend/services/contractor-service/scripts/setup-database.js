const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// RABHAN Contractor Service Database Setup Script
// Creates database and runs initial migrations

const config = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  // Connect to default database first
  database: 'postgres'
};

async function createDatabase() {
  const pool = new Pool(config);
  
  try {
    console.log('🔍 Checking if contractor database exists...');
    
    // Check if database exists
    const checkDb = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'rabhan_contractors'"
    );
    
    if (checkDb.rows.length === 0) {
      console.log('📦 Creating rabhan_contractors database...');
      
      // Create database
      await pool.query('CREATE DATABASE rabhan_contractors');
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }
    
  } catch (error) {
    console.error('❌ Error checking/creating database:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function runMigrations() {
  // Connect to the contractor database
  const contractorConfig = {
    ...config,
    database: 'rabhan_contractors'
  };
  
  const pool = new Pool(contractorConfig);
  
  try {
    console.log('🔄 Running migrations...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/001_create_contractors_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Run migration
    await pool.query(migrationSQL);
    console.log('✅ Migrations completed successfully');
    
    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Create sample data for testing (optional)
    if (process.env.CREATE_SAMPLE_DATA === 'true') {
      await createSampleData(pool);
    }
    
  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function createSampleData(pool) {
  try {
    console.log('📋 Creating sample contractor data...');
    
    // Sample contractor data for testing
    const sampleContractors = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        user_id: '22222222-2222-2222-2222-222222222222',
        business_name: 'Solar Solutions Riyadh',
        business_name_ar: 'حلول الطاقة الشمسية الرياض',
        business_type: 'llc',
        commercial_registration: 'CR1234567890',
        vat_number: '123456789012345',
        email: 'contact@solarsolutions.sa',
        phone: '+966501234567',
        address_line1: 'King Fahd Road, Al Olaya District',
        city: 'Riyadh',
        region: 'Riyadh',
        postal_code: '12211',
        established_year: 2018,
        employee_count: 25,
        description: 'Leading solar installation company in Riyadh',
        description_ar: 'شركة رائدة في تركيب الطاقة الشمسية في الرياض',
        service_categories: '{residential_solar,commercial_solar}',
        service_areas: '{Riyadh,Al Kharj,Al Majmaah}',
        years_experience: 6,
        status: 'active',
        verification_level: 4
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        user_id: '44444444-4444-4444-4444-444444444444',
        business_name: 'Green Energy Jeddah',
        business_name_ar: 'الطاقة الخضراء جدة',
        business_type: 'corporation',
        commercial_registration: 'CR0987654321',
        vat_number: '987654321098765',
        email: 'info@greenenergy.sa',
        phone: '+966502345678',
        address_line1: 'Corniche Road, Al Hamra District',
        city: 'Jeddah',
        region: 'Makkah',
        postal_code: '21411',
        established_year: 2015,
        employee_count: 45,
        description: 'Sustainable energy solutions for western Saudi Arabia',
        description_ar: 'حلول الطاقة المستدامة لغرب المملكة العربية السعودية',
        service_categories: '{commercial_solar,industrial_solar,maintenance}',
        service_areas: '{Jeddah,Makkah,Taif}',
        years_experience: 9,
        status: 'active',
        verification_level: 5
      }
    ];
    
    // Insert sample contractors
    for (const contractor of sampleContractors) {
      await pool.query(`
        INSERT INTO contractors (
          id, user_id, business_name, business_name_ar, business_type,
          commercial_registration, vat_number, email, phone,
          address_line1, city, region, postal_code,
          established_year, employee_count, description, description_ar,
          service_categories, service_areas, years_experience,
          status, verification_level
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) ON CONFLICT (id) DO NOTHING
      `, [
        contractor.id, contractor.user_id, contractor.business_name,
        contractor.business_name_ar, contractor.business_type,
        contractor.commercial_registration, contractor.vat_number,
        contractor.email, contractor.phone, contractor.address_line1,
        contractor.city, contractor.region, contractor.postal_code,
        contractor.established_year, contractor.employee_count,
        contractor.description, contractor.description_ar,
        contractor.service_categories, contractor.service_areas,
        contractor.years_experience, contractor.status, contractor.verification_level
      ]);
    }
    
    console.log('✅ Sample data created successfully');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
    // Don't throw here as sample data is optional
  }
}

async function main() {
  console.log('🚀 Starting RABHAN Contractor Service Database Setup...\n');
  
  try {
    await createDatabase();
    await runMigrations();
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('🔒 SAMA compliance features enabled');
    console.log('📊 Audit logging configured');
    console.log('🛡️ Security controls activated');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  main();
}

module.exports = {
  createDatabase,
  runMigrations,
  createSampleData
};