
import { query } from './lib/db';

async function checkSchema() {
  try {
    console.log('--- REVIEWS TABLE ---');
    const reviews: any = await query('DESCRIBE reviews');
    console.table(reviews);
    
    console.log('\n--- SUGGESTIONS TABLE ---');
    const suggestions: any = await query('DESCRIBE suggestions');
    console.table(suggestions);
    
    process.exit(0);
  } catch (err) {
    console.error('Schema check failed:', err);
    process.exit(1);
  }
}

checkSchema();
