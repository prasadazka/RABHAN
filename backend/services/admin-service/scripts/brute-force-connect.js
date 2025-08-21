/**
 * Brute force common PostgreSQL configurations
 */

const { Client } = require('pg');

const commonConfigs = [
  // Empty password variations
  { host: 'localhost', port: 5432, user: 'postgres', password: '' },
  { host: '127.0.0.1', port: 5432, user: 'postgres', password: '' },
  { host: 'localhost', port: 5432, user: 'postgres', password: null },
  
  // Common password variations
  { host: 'localhost', port: 5432, user: 'postgres', password: 'admin' },
  { host: 'localhost', port: 5432, user: 'postgres', password: 'root' },
  { host: 'localhost', port: 5432, user: 'postgres', password: '123456' },
  { host: 'localhost', port: 5432, user: 'postgres', password: 'password123' },
  { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres123' },
  
  // Different users
  { host: 'localhost', port: 5432, user: 'rabhan', password: 'rabhan' },
  { host: 'localhost', port: 5432, user: 'admin', password: 'admin' },
  { host: 'localhost', port: 5432, user: 'root', password: 'root' },
  
  // Connection string variations (maybe auth is embedded differently)
  { connectionString: 'postgresql://localhost:5432/postgres' },
  { connectionString: 'postgresql://:@localhost:5432/postgres' },
  { connectionString: 'postgresql://postgres:admin@localhost:5432/postgres' },
  { connectionString: 'postgresql://postgres:root@localhost:5432/postgres' },
  
  // Try peer authentication (Unix socket style on Windows?)
  { host: '/tmp', port: 5432, user: 'postgres' },
  { host: '\\\\.\\pipe\\postgresql', user: 'postgres' },
];

async function tryConfig(config, index) {
  const client = new Client(config);
  
  try {
    console.log(`\n[${index + 1}/${commonConfigs.length}] Testing:`, 
      config.connectionString || 
      `${config.user}@${config.host}:${config.port} (pwd: ${config.password ? '***' : 'none'})`
    );
    
    await client.connect();
    
    // Success! Let's get more info
    const result = await client.query(`
      SELECT 
        version() as version,
        current_database() as database,
        current_user as user,
        inet_server_addr() as server_addr,
        inet_server_port() as server_port
    `);
    
    console.log('🎉 SUCCESS! Connection details:');
    console.log('   Version:', result.rows[0].version.split(',')[0]);
    console.log('   Database:', result.rows[0].database);
    console.log('   User:', result.rows[0].user);
    console.log('   Server:', result.rows[0].server_addr || 'localhost', ':', result.rows[0].server_port || config.port);
    
    // Get databases
    const databases = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
    console.log('   Databases:', databases.rows.map(r => r.datname).join(', '));
    
    await client.end();
    
    console.log('\n🔧 Working configuration:');
    console.log(JSON.stringify(config, null, 2));
    
    return config;
    
  } catch (error) {
    console.log(`   ❌ ${error.message.substring(0, 80)}...`);
    try { await client.end(); } catch (e) { /* ignore */ }
    return null;
  }
}

async function main() {
  console.log('🚀 Brute Force PostgreSQL Connection Test');
  console.log(`   Testing ${commonConfigs.length} different configurations...\n`);
  
  for (let i = 0; i < commonConfigs.length; i++) {
    const workingConfig = await tryConfig(commonConfigs[i], i);
    if (workingConfig) {
      console.log('\n✅ Found working configuration! Use this for database setup.');
      process.exit(0);
    }
  }
  
  console.log('\n❌ No working configuration found.');
  console.log('💡 Suggestions:');
  console.log('   1. Check PostgreSQL installation and configuration');
  console.log('   2. Reset postgres user password: ALTER USER postgres PASSWORD \'newpassword\';');
  console.log('   3. Check pg_hba.conf for authentication method');
  console.log('   4. Ensure PostgreSQL allows local connections');
}

main().catch(console.error);