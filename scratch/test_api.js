const fetch = require('node-fetch');

async function testHistoryFetch() {
  const token = 'YOUR_TEST_TOKEN'; // I don't have a token, so this will fail auth.
  // But I can check if the server is responding at least.
  try {
    const res = await fetch('http://localhost:3000/api/review/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Response:', data);
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

testHistoryFetch();
