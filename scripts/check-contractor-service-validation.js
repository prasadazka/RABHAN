const { Client } = require('pg');

async function checkContractorServiceValidation() {
  const contractorClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'rabhan_contractors'
  });

  const authClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'rabhan_auth'
  });

  try {
    await contractorClient.connect();
    await authClient.connect();
    
    const email = 'prasad@azkashine.com';
    const userId = 'd6f7a99e-fb23-4173-ada2-5848c51f5ece';
    
    console.log('🔍 COMPREHENSIVE CONTRACTOR REGISTRATION CONFLICT ANALYSIS');
    console.log('='.repeat(70));
    console.log(`📧 Email: ${email}`);
    console.log(`👤 User ID: ${userId}`);
    console.log('');
    
    // 1. Check auth database constraints and indexes
    console.log('1️⃣  AUTH DATABASE CONSTRAINTS & INDEXES');
    console.log('-'.repeat(50));
    
    const authConstraintsQuery = `
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass OR conrelid = 'contractors'::regclass
      ORDER BY conrelid, conname
    `;
    
    const authConstraints = await authClient.query(authConstraintsQuery);
    console.log('📋 Auth database constraints:');
    authConstraints.rows.forEach(row => {
      console.log(`  ${row.constraint_type === 'u' ? '🔑' : '📏'} ${row.constraint_name}: ${row.definition}`);
    });
    
    // 2. Check contractor service constraints and indexes
    console.log('\n2️⃣  CONTRACTOR SERVICE CONSTRAINTS & INDEXES');
    console.log('-'.repeat(50));
    
    const contractorConstraintsQuery = `
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'contractors'::regclass
      ORDER BY conname
    `;
    
    const contractorConstraints = await contractorClient.query(contractorConstraintsQuery);
    console.log('📋 Contractor service constraints:');
    contractorConstraints.rows.forEach(row => {
      console.log(`  ${row.constraint_type === 'u' ? '🔑' : '📏'} ${row.constraint_name}: ${row.definition}`);
    });
    
    // 3. Check for existing records by email in contractor service
    console.log('\n3️⃣  EMAIL CONFLICT CHECK IN CONTRACTOR SERVICE');
    console.log('-'.repeat(50));
    
    const emailCheckQuery = `
      SELECT id, user_id, email, business_name, status, created_at 
      FROM contractors 
      WHERE email = $1
    `;
    
    const emailCheck = await contractorClient.query(emailCheckQuery, [email]);
    
    if (emailCheck.rows.length > 0) {
      console.log('⚠️  CONFLICT FOUND: Email exists in contractor service');
      emailCheck.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. User ID: ${row.user_id}`);
        console.log(`      Email: ${row.email}`);
        console.log(`      Business: ${row.business_name || 'N/A'}`);
        console.log(`      Status: ${row.status || 'N/A'}`);
        console.log(`      Created: ${row.created_at}`);
        console.log('');
      });
    } else {
      console.log('✅ No email conflict in contractor service');
    }
    
    // 4. Check for user_id conflict in contractor service
    console.log('4️⃣  USER_ID CONFLICT CHECK IN CONTRACTOR SERVICE');
    console.log('-'.repeat(50));
    
    const userIdCheckQuery = `
      SELECT * FROM contractors WHERE user_id = $1
    `;
    
    const userIdCheck = await contractorClient.query(userIdCheckQuery, [userId]);
    
    if (userIdCheck.rows.length > 0) {
      console.log('⚠️  CONFLICT FOUND: User ID exists in contractor service');
      console.log(JSON.stringify(userIdCheck.rows[0], null, 2));
    } else {
      console.log('✅ No user_id conflict in contractor service');
    }
    
    // 5. Check user role and type in auth service
    console.log('\n5️⃣  USER ROLE & TYPE CHECK IN AUTH SERVICE');
    console.log('-'.repeat(50));
    
    const userDetailsQuery = `
      SELECT id, email, role, user_type, status, created_at
      FROM users 
      WHERE email = $1
    `;
    
    const userDetails = await authClient.query(userDetailsQuery, [email]);
    
    if (userDetails.rows.length > 0) {
      const user = userDetails.rows[0];
      console.log('👤 Current user details:');
      console.log(`   Role: ${user.role}`);
      console.log(`   User Type: ${user.user_type}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Created: ${user.created_at}`);
      
      if (user.role === 'CONTRACTOR') {
        console.log('⚠️  User already has CONTRACTOR role');
      } else if (user.role === 'USER') {
        console.log('ℹ️  User currently has USER role (this might be the issue)');
      }
    }
    
    // 6. Summary and recommendations
    console.log('\n6️⃣  SUMMARY & RECOMMENDATIONS');
    console.log('-'.repeat(50));
    
    if (userDetails.rows.length > 0) {
      const user = userDetails.rows[0];
      
      if (user.role === 'USER' && user.user_type === 'HOMEOWNER') {
        console.log('🎯 ROOT CAUSE IDENTIFIED:');
        console.log('   The user exists with role=USER and user_type=HOMEOWNER');
        console.log('   Contractor registration is trying to register them again as CONTRACTOR');
        console.log('');
        console.log('💡 SOLUTIONS:');
        console.log('   1. Update existing user role from USER to CONTRACTOR');
        console.log('   2. Update user_type from HOMEOWNER to BUSINESS');
        console.log('   3. Create contractor record in both auth and contractor services');
        console.log('   4. Or implement role upgrade logic instead of re-registration');
      }
    }
    
  } catch (err) {
    console.error('❌ Analysis failed:', err.message);
  } finally {
    await contractorClient.end();
    await authClient.end();
  }
}

// Run the analysis
checkContractorServiceValidation();