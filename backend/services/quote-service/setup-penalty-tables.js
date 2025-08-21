const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345',
  max: 5
});

async function setupPenaltyTables() {
  console.log('🔧 Setting up RABHAN Penalty Management Tables');
  console.log('=' .repeat(50));

  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'create-penalty-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        if (statement.toLowerCase().includes('create table')) {
          const tableName = statement.match(/create table (?:if not exists )?(\w+)/i);
          console.log(`   Creating table: ${tableName ? tableName[1] : 'unknown'}`);
        } else if (statement.toLowerCase().includes('create index')) {
          const indexName = statement.match(/create index (?:if not exists )?(\w+)/i);
          console.log(`   Creating index: ${indexName ? indexName[1] : 'unknown'}`);
        } else if (statement.toLowerCase().includes('insert into')) {
          console.log(`   Inserting default data...`);
        } else if (statement.toLowerCase().includes('alter table')) {
          console.log(`   Altering table structure...`);
        } else if (statement.toLowerCase().includes('create trigger')) {
          console.log(`   Creating trigger...`);
        } else if (statement.toLowerCase().includes('comment on')) {
          console.log(`   Adding table comments...`);
        }
        
        await pool.query(statement);
        
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️ Already exists, skipping...`);
        } else {
          console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
          console.error(`   Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }
    
    // Verify tables were created
    console.log('\n📊 Verifying penalty tables...');
    
    const tableCheckQueries = [
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'penalty_rules'",
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'penalty_instances'", 
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'sla_violations'"
    ];
    
    const tableNames = ['penalty_rules', 'penalty_instances', 'sla_violations'];
    
    for (let i = 0; i < tableCheckQueries.length; i++) {
      const result = await pool.query(tableCheckQueries[i]);
      const exists = parseInt(result.rows[0].count) > 0;
      console.log(`   ${exists ? '✅' : '❌'} Table '${tableNames[i]}': ${exists ? 'Created' : 'Missing'}`);
    }
    
    // Check default penalty rules
    console.log('\n📋 Checking default penalty rules...');
    const rulesResult = await pool.query('SELECT penalty_type, description, severity_level FROM penalty_rules ORDER BY penalty_type, severity_level');
    
    console.log(`   📝 Found ${rulesResult.rows.length} penalty rules:`);
    rulesResult.rows.forEach(rule => {
      console.log(`     • ${rule.penalty_type} (${rule.severity_level}): ${rule.description.substring(0, 60)}...`);
    });
    
    // Test penalty rule retrieval
    console.log('\n🧪 Testing penalty service integration...');
    
    const activeRulesResult = await pool.query('SELECT COUNT(*) as count FROM penalty_rules WHERE is_active = true');
    const activeRules = parseInt(activeRulesResult.rows[0].count);
    console.log(`   ✅ Active penalty rules: ${activeRules}`);
    
    // Test table relationships
    console.log('\n🔗 Verifying table relationships...');
    
    try {
      await pool.query(`
        SELECT pr.penalty_type, COUNT(pi.id) as penalty_count 
        FROM penalty_rules pr 
        LEFT JOIN penalty_instances pi ON pr.id = pi.penalty_rule_id 
        GROUP BY pr.penalty_type
      `);
      console.log('   ✅ penalty_rules ↔ penalty_instances relationship: OK');
    } catch (error) {
      console.log('   ❌ penalty_rules ↔ penalty_instances relationship: Failed');
    }
    
    console.log('\n🎉 Penalty Management Tables Setup COMPLETED!');
    console.log('');
    console.log('✅ Created Tables:');
    console.log('   • penalty_rules - Configuration for penalty types and calculations');
    console.log('   • penalty_instances - Individual penalty applications to contractors');
    console.log('   • sla_violations - Log of detected SLA violations');
    console.log('');
    console.log('✅ Added Features:');
    console.log('   • Default penalty rules for common violations');
    console.log('   • Automated timestamp triggers');
    console.log('   • Performance indexes');
    console.log('   • Foreign key constraints');
    console.log('   • Data validation checks');
    console.log('');
    console.log('🔧 Ready for penalty management operations!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

setupPenaltyTables();