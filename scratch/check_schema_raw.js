
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
});

async function check() {
  const [reviews] = await pool.execute('DESCRIBE reviews');
  console.log('REVIEWS:');
  console.table(reviews);
  
  const [suggestions] = await pool.execute('DESCRIBE suggestions');
  console.log('SUGGESTIONS:');
  console.table(suggestions);
  
  process.exit(0);
}

check();
