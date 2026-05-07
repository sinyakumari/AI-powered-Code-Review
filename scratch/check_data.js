const { query } = require('./lib/db');

async function checkData() {
  try {
    const suggestions = await query('SELECT status FROM suggestions LIMIT 5');
    console.log('Suggestions status sample:', suggestions);
    const reviews = await query('SELECT language FROM reviews LIMIT 5');
    console.log('Reviews language sample:', reviews);
  } catch (err) {
    console.error(err);
  }
}

checkData();
