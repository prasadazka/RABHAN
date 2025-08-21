const { Pool } = require('pg');

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
    // 1. Create penalty_rules table
    console.log('📝 Creating penalty_rules table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS penalty_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          penalty_type VARCHAR(50) NOT NULL CHECK (penalty_type IN (
              'late_installation', 'quality_issue', 'communication_failure', 
              'documentation_issue', 'custom'
          )),
          description TEXT NOT NULL,
          amount_calculation VARCHAR(20) NOT NULL CHECK (amount_calculation IN ('fixed', 'percentage', 'daily')),
          amount_value DECIMAL(10,2) NOT NULL CHECK (amount_value >= 0),
          maximum_amount DECIMAL(10,2) CHECK (maximum_amount >= 0),
          grace_period_hours INTEGER DEFAULT 0 CHECK (grace_period_hours >= 0),
          severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('minor', 'moderate', 'major', 'critical')),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ penalty_rules table created');

    // 2. Create penalty_instances table
    console.log('📝 Creating penalty_instances table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS penalty_instances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contractor_id UUID NOT NULL,
          quote_id UUID NOT NULL,
          penalty_rule_id UUID NOT NULL REFERENCES penalty_rules(id),
          penalty_type VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
              'pending', 'applied', 'disputed', 'waived', 'reversed'
          )),
          applied_at TIMESTAMP WITH TIME ZONE,
          applied_by VARCHAR(255),
          dispute_reason TEXT,
          resolution_notes TEXT,
          evidence JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ penalty_instances table created');

    // 3. Create sla_violations table
    console.log('📝 Creating sla_violations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sla_violations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          quote_id UUID NOT NULL,
          contractor_id UUID NOT NULL,
          violation_type VARCHAR(50) NOT NULL,
          violation_date TIMESTAMP WITH TIME ZONE NOT NULL,
          days_overdue INTEGER,
          severity_level VARCHAR(20) NOT NULL,
          auto_detected BOOLEAN DEFAULT false,
          penalty_applied BOOLEAN DEFAULT false,
          penalty_instance_id UUID REFERENCES penalty_instances(id),
          detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ sla_violations table created');

    // 4. Create indexes
    console.log('📝 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_penalty_instances_contractor_id ON penalty_instances(contractor_id)',
      'CREATE INDEX IF NOT EXISTS idx_penalty_instances_quote_id ON penalty_instances(quote_id)',
      'CREATE INDEX IF NOT EXISTS idx_penalty_instances_status ON penalty_instances(status)',
      'CREATE INDEX IF NOT EXISTS idx_penalty_instances_penalty_type ON penalty_instances(penalty_type)',
      'CREATE INDEX IF NOT EXISTS idx_penalty_instances_created_at ON penalty_instances(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_sla_violations_contractor_id ON sla_violations(contractor_id)',
      'CREATE INDEX IF NOT EXISTS idx_sla_violations_quote_id ON sla_violations(quote_id)',
      'CREATE INDEX IF NOT EXISTS idx_sla_violations_violation_type ON sla_violations(violation_type)',
      'CREATE INDEX IF NOT EXISTS idx_sla_violations_detected_at ON sla_violations(detected_at)',
      'CREATE INDEX IF NOT EXISTS idx_penalty_rules_penalty_type ON penalty_rules(penalty_type)',
      'CREATE INDEX IF NOT EXISTS idx_penalty_rules_is_active ON penalty_rules(is_active)'
    ];

    for (const indexSQL of indexes) {
      await pool.query(indexSQL);
    }
    console.log('   ✅ All indexes created');

    // 5. Add penalty tracking to contractor wallets
    console.log('📝 Adding penalty tracking to contractor_wallets...');
    try {
      await pool.query(`
        ALTER TABLE contractor_wallets 
        ADD COLUMN IF NOT EXISTS total_penalties DECIMAL(15,2) DEFAULT 0 CHECK (total_penalties >= 0)
      `);
      console.log('   ✅ total_penalties column added to contractor_wallets');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️ total_penalties column already exists');
      } else {
        throw error;
      }
    }

    // 6. Add penalty reference to wallet transactions
    console.log('📝 Adding penalty reference to wallet_transactions...');
    try {
      await pool.query(`
        ALTER TABLE wallet_transactions 
        ADD COLUMN IF NOT EXISTS penalty_instance_id UUID REFERENCES penalty_instances(id)
      `);
      console.log('   ✅ penalty_instance_id column added to wallet_transactions');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️ penalty_instance_id column already exists');
      } else {
        throw error;
      }
    }

    // 7. Insert default penalty rules
    console.log('📝 Inserting default penalty rules...');
    const defaultRules = [
      {
        penalty_type: 'late_installation',
        description: 'Penalty for installations that exceed the agreed timeline',
        amount_calculation: 'daily',
        amount_value: 100.00,
        maximum_amount: 2000.00,
        severity_level: 'moderate'
      },
      {
        penalty_type: 'late_installation',
        description: 'Major penalty for severely delayed installations (over 14 days)',
        amount_calculation: 'percentage',
        amount_value: 5.00,
        maximum_amount: 5000.00,
        severity_level: 'major'
      },
      {
        penalty_type: 'quality_issue',
        description: 'Penalty for poor workmanship or component failures within warranty period',
        amount_calculation: 'percentage',
        amount_value: 10.00,
        maximum_amount: 10000.00,
        severity_level: 'major'
      },
      {
        penalty_type: 'communication_failure',
        description: 'Penalty for not responding to customer inquiries within 24 hours',
        amount_calculation: 'fixed',
        amount_value: 250.00,
        maximum_amount: null,
        severity_level: 'minor'
      },
      {
        penalty_type: 'documentation_issue',
        description: 'Penalty for missing or incorrect installation documentation',
        amount_calculation: 'fixed',
        amount_value: 500.00,
        maximum_amount: null,
        severity_level: 'moderate'
      }
    ];

    for (const rule of defaultRules) {
      try {
        await pool.query(`
          INSERT INTO penalty_rules (penalty_type, description, amount_calculation, amount_value, maximum_amount, severity_level, is_active) 
          VALUES ($1, $2, $3, $4, $5, $6, true)
        `, [rule.penalty_type, rule.description, rule.amount_calculation, rule.amount_value, rule.maximum_amount, rule.severity_level]);
      } catch (error) {
        if (error.message.includes('duplicate')) {
          console.log(`   ⚠️ Rule for ${rule.penalty_type} (${rule.severity_level}) already exists`);
        } else {
          console.log(`   ❌ Failed to insert rule: ${error.message}`);
        }
      }
    }
    console.log('   ✅ Default penalty rules inserted');

    // 8. Verify setup
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

    // Check penalty rules
    console.log('\n📋 Checking penalty rules...');
    const rulesResult = await pool.query('SELECT penalty_type, description, severity_level FROM penalty_rules ORDER BY penalty_type, severity_level');
    
    console.log(`   📝 Found ${rulesResult.rows.length} penalty rules:`);
    rulesResult.rows.forEach(rule => {
      console.log(`     • ${rule.penalty_type} (${rule.severity_level}): ${rule.description.substring(0, 60)}...`);
    });

    console.log('\n🎉 Penalty Management Tables Setup COMPLETED!');
    console.log('');
    console.log('✅ Created Components:');
    console.log('   • penalty_rules table with 5 default rules');
    console.log('   • penalty_instances table for tracking applied penalties');
    console.log('   • sla_violations table for violation logging');
    console.log('   • Performance indexes for all tables');
    console.log('   • Enhanced contractor_wallets with penalty tracking');
    console.log('   • Linked wallet_transactions with penalty references');
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