const { database } = require('./dist/config/database.config.js');

async function checkStatus() {
  try {
    const result = await database.query(`
      SELECT status, 
             (SELECT COUNT(*) FROM contractor_quotes cq WHERE cq.request_id = qr.id) as actual_quote_count 
      FROM quote_requests qr 
      WHERE id = $1
    `, ['ac9ae8cb-599a-4368-8784-1a16de5aeeb1']);
    
    console.log('Database status:', result.rows[0].status);
    console.log('Actual quote count:', result.rows[0].actual_quote_count);
    
    if (result.rows[0].status === 'quotes_received' && result.rows[0].actual_quote_count === '0') {
      console.log('\n❌ ISSUE: Status shows "quotes_received" but actual count is 0');
      console.log('✅ FIXING: Updating status to "pending"');
      
      await database.query('UPDATE quote_requests SET status = $1 WHERE id = $2', ['pending', 'ac9ae8cb-599a-4368-8784-1a16de5aeeb1']);
      console.log('Status updated successfully!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkStatus();