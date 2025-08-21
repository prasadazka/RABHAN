const { DatabaseConfig } = require('./dist/config/database.config');

async function getDocOwner(documentId) {
  const db = DatabaseConfig.getInstance();
  await db.connect();
  
  const result = await db.query(
    'SELECT auth_user_id FROM documents WHERE id = $1', 
    [documentId]
  );
  
  if (result.rows[0]) {
    console.log('Document owner user ID:', result.rows[0].auth_user_id);
  } else {
    console.log('Document not found');
  }
  
  await db.close();
}

getDocOwner('a9858389-ff7e-4d74-9395-20bbec85907a').catch(console.error);