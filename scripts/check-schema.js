#!/usr/bin/env node

const { Client } = require('pg');

async function checkSchema() {
  const databases = [
    { name: 'auth', db: 'rabhan_auth' },
    { name: 'user', db: 'rabhan_user' },
    { name: 'contractors', db: 'rabhan_contractors' }
  ];

  for (const database of databases) {
    console.log(`\n📊 ${database.name.toUpperCase()} DATABASE SCHEMA:`);
    console.log('='.repeat(50));
    
    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: database.db,
      user: 'postgres',
      password: '12345'
    });

    try {
      await client.connect();
      
      // Get table names
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public'
        ORDER BY table_name
      `);
      
      for (const table of tablesResult.rows) {
        console.log(`\n📋 Table: ${table.table_name}`);
        
        // Get column information
        const columnsResult = await client.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_schema='public' AND table_name=$1
          ORDER BY ordinal_position
        `, [table.table_name]);
        
        columnsResult.rows.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
      }
      
    } catch (error) {
      console.error(`❌ Error checking ${database.name}:`, error.message);
    } finally {
      await client.end();
    }
  }
}

checkSchema().catch(console.error);