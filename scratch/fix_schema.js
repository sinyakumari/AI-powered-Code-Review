const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    console.log('Adding github_id column...');
    await connection.execute('ALTER TABLE users ADD COLUMN github_id VARCHAR(255) DEFAULT NULL AFTER email');
    console.log('Success: github_id column added.');

    console.log('Updating password column to allow NULL...');
    await connection.execute('ALTER TABLE users MODIFY COLUMN password VARCHAR(255) DEFAULT NULL');
    console.log('Success: password column updated.');
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('Info: github_id column already exists.');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    await connection.end();
  }
}

fixSchema();
