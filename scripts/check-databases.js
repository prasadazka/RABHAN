const { Pool } = require('pg');

async function checkDatabases() {
  console.log('🔍 Checking available databases and tables...\n');

  // Connect to postgres default database to list all databases
  const postgresPool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '12345',
    port: 5432,
  });

  try {
    // List all databases
    console.log('1. Available databases:');
    const dbQuery = await postgresPool.query(`
      SELECT datname FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname
    `);
    
    dbQuery.rows.forEach((db, index) => {
      console.log(`   ${index + 1}. ${db.datname}`);
    });
    console.log();

    // Check specific databases we expect
    const expectedDatabases = ['rabhan_contractors', 'rabhan_user', 'rabhan_auth'];
    
    for (const dbName of expectedDatabases) {
      console.log(`2. Checking database: ${dbName}`);
      
      const dbExists = dbQuery.rows.some(row => row.datname === dbName);
      if (!dbExists) {
        console.log(`   ❌ Database ${dbName} does not exist\n`);
        continue;
      }
      
      console.log(`   ✅ Database ${dbName} exists`);
      
      // Connect to this database and check tables
      const specificPool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: dbName,
        password: '12345',
        port: 5432,
      });
      
      try {
        const tableQuery = await specificPool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        
        console.log(`   Tables in ${dbName}:`);
        if (tableQuery.rows.length === 0) {
          console.log('     (no tables found)');
        } else {
          tableQuery.rows.forEach((table, index) => {
            console.log(`     ${index + 1}. ${table.table_name}`);
          });
        }
        
        // Check specific table contents for important tables
        if (dbName === 'rabhan_contractors' && tableQuery.rows.some(t => t.table_name === 'contractors')) {
          const contractorCount = await specificPool.query('SELECT COUNT(*) FROM contractors');
          console.log(`     → contractors table has ${contractorCount.rows[0].count} records`);
        }
        
        if (dbName === 'rabhan_user' && tableQuery.rows.some(t => t.table_name === 'users')) {
          const userCount = await specificPool.query('SELECT COUNT(*) FROM users');
          console.log(`     → users table has ${userCount.rows[0].count} records`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error accessing ${dbName}: ${error.message}`);
      } finally {
        await specificPool.end();
      }
      
      console.log();
    }

  } catch (error) {
    console.error('❌ Failed to check databases:', error.message);
  } finally {
    await postgresPool.end();
  }
}

checkDatabases()
  .then(() => {
    console.log('🎉 Database check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database check failed:', error);
    process.exit(1);
  });