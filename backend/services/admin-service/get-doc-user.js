const fetch = require('node-fetch');

async function getDocumentUser(documentId) {
  try {
    // Get all users and their documents to find which user owns this document
    const response = await fetch('http://localhost:3003/api/documents/admin/user/all');
    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getDocumentUser('a9858389-ff7e-4d74-9395-20bbec85907a');