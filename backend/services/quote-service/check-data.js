const { database } = require('./dist/config/database.config.js');

async function checkData() {
  try {
    console.log('=== Quote Request Details ===');
    const requestResult = await database.query('SELECT selected_contractors FROM quote_requests WHERE id = $1', ['ac9ae8cb-599a-4368-8784-1a16de5aeeb1']);
    console.log('Selected contractors in request:', requestResult.rows[0].selected_contractors);
    
    console.log('\n=== All Quotes for this Request ===');
    const quotesResult = await database.query('SELECT id, contractor_id, base_price, created_at FROM contractor_quotes WHERE request_id = $1', ['ac9ae8cb-599a-4368-8784-1a16de5aeeb1']);
    console.log('Submitted quotes:');
    quotesResult.rows.forEach(quote => {
      console.log(`  Quote ID: ${quote.id}`);
      console.log(`  Contractor ID: ${quote.contractor_id}`);
      console.log(`  Base Price: ${quote.base_price}`);
      console.log(`  Created: ${quote.created_at}`);
      console.log('');
    });
    
    console.log('=== Checking if quote contractors match selected contractors ===');
    const selectedContractors = requestResult.rows[0].selected_contractors;
    const quoteContractors = quotesResult.rows.map(q => q.contractor_id);
    
    console.log('Selected contractors:', selectedContractors);
    console.log('Quote contractors:', quoteContractors);
    
    const matches = quoteContractors.filter(qc => selectedContractors.includes(qc));
    const mismatches = quoteContractors.filter(qc => !selectedContractors.includes(qc));
    
    console.log('Matching contractors:', matches);
    console.log('Non-matching contractors:', mismatches);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkData();