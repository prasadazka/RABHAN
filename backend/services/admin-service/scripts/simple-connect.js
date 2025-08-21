/**
 * Simple connection test with explicit null password
 */

const { Client } = require('pg');

async function simpleConnect() {
  console.log('🔧 Trying NULL password connection...\n');
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: null  // Explicitly null
  });
  
  try {
    await client.connect();
    console.log('✅ Connected successfully with NULL password!');
    
    const result = await client.query('SELECT current_database(), current_user');
    console.log('📊 Current database:', result.rows[0].current_database);
    console.log('👤 Current user:', result.rows[0].current_user);
    
    await client.end();
    return true;
  } catch (error) {
    console.log('❌ NULL password failed:', error.message);
  }
  
  // Try with undefined password
  console.log('\n🔧 Trying undefined password...\n');
  
  const client2 = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres'
    // No password property at all
  });
  
  try {
    await client2.connect();
    console.log('✅ Connected successfully with no password property!');
    
    const result = await client2.query('SELECT current_database(), current_user');
    console.log('📊 Current database:', result.rows[0].current_database);
    console.log('👤 Current user:', result.rows[0].current_user);
    
    await client2.end();
    return true;
  } catch (error) {
    console.log('❌ No password property failed:', error.message);
  }
  
  return false;
}

simpleConnect().catch(console.error);