
import { query } from '../lib/db';

async function migrate() {
  try {
    console.log('Altering reviews table columns to LONGTEXT...');
    await query('ALTER TABLE reviews MODIFY COLUMN code LONGTEXT');
    await query('ALTER TABLE reviews MODIFY COLUMN ai_reviewed_code LONGTEXT');
    
    console.log('Altering suggestions table columns to LONGTEXT...');
    await query('ALTER TABLE suggestions MODIFY COLUMN suggested_code LONGTEXT');
    await query('ALTER TABLE suggestions MODIFY COLUMN suggestion LONGTEXT');
    
    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
