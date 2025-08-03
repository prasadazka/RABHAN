#!/usr/bin/env node

const { Client } = require('pg');

async function checkUsers() {
  console.log('🔍 Checking users in auth database...\n');
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_auth',
    user: 'postgres',
    password: '12345'
  });

  try {
    await client.connect();
    
    // Check users in auth database
    const usersResult = await client.query(`
      SELECT id, email, first_name, last_name, role, user_type, status, email_verified, phone_verified, sama_verified
      FROM users 
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No users found in auth database');
    } else {
      console.log(`✅ Found ${usersResult.rows.length} users in auth database:`);
      console.log('Email\t\t\t\t\tName\t\t\tRole\t\tUser Type\tStatus');
      console.log('-'.repeat(100));
      
      usersResult.rows.forEach(user => {
        const email = user.email.padEnd(35);
        const name = `${user.first_name} ${user.last_name}`.padEnd(20);
        const role = user.role.padEnd(12);
        const userType = user.user_type.padEnd(12);
        const status = user.status;
        console.log(`${email}\t${name}\t${role}\t${userType}\t${status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUsers().catch(console.error);