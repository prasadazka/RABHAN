const { Pool } = require("pg");
require("dotenv").config();

async function checkCategories() {
  const client = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:12345@localhost:5432/rabhan_document"
  });

  try {
    console.log("Checking document categories in database:");
    
    const result = await client.query(`
      SELECT id, name, description, is_active, required_for_role,
             allowed_formats, max_file_size_mb
      FROM document_categories 
      ORDER BY required_for_role, name
    `);
    
    if (result.rows.length === 0) {
      console.log("No document categories found in database.");
      return;
    }
    
    console.log(`Found ${result.rows.length} document categories:`);
    console.log("");
    
    result.rows.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name}`);
      console.log(`   ID: ${cat.id}`);
      console.log(`   Description: ${cat.description}`);
      console.log(`   Active: ${cat.is_active ? "Yes" : "No"}`);
      console.log(`   Required for: ${cat.required_for_role}`);
      console.log(`   Max size: ${cat.max_file_size_mb}MB`);
      console.log(`   Formats: ${cat.allowed_formats ? cat.allowed_formats.join(", ") : "N/A"}`);
      console.log("");
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

checkCategories();
