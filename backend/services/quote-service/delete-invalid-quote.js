const { database } = require('./dist/config/database.config.js');

async function deleteInvalidQuote() {
  try {
    console.log('=== Deleting Invalid Quote ===');
    console.log('Quote ID to delete: caac6d0c-01cd-4073-a220-6490f198a52b');
    console.log('Contractor ID: 2ee36c55-6dce-4e08-a3e0-35935fcddae1 (not in selected list)');
    
    const deleteResult = await database.query('DELETE FROM contractor_quotes WHERE id = $1 AND contractor_id = $2', [
      'caac6d0c-01cd-4073-a220-6490f198a52b',
      '2ee36c55-6dce-4e08-a3e0-35935fcddae1'
    ]);
    
    console.log('Rows deleted:', deleteResult.rowCount);
    
    // Verify deletion
    console.log('\n=== Verifying Deletion ===');
    const verifyResult = await database.query('SELECT COUNT(*) FROM contractor_quotes WHERE request_id = $1', ['ac9ae8cb-599a-4368-8784-1a16de5aeeb1']);
    console.log('Remaining quotes for this request:', verifyResult.rows[0].count);
    
    if (deleteResult.rowCount > 0) {
      console.log('\n✅ Invalid quote successfully deleted!');
    } else {
      console.log('\n❌ No quote was deleted (may have already been removed)');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

deleteInvalidQuote();