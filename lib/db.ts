import mysql from 'mysql2/promise';

/**
 * MySQL Connection Configuration
 * Uses environment variables from .env.local
 */
let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

/**
 * Reusable Query Function
 * @param sql - SQL query string
 * @param params - Array of parameters for the query
 * @returns Query results
 */
export async function query<T>(sql: string, params?: any[]): Promise<T> {
  try {
    const [results] = await getPool().execute(sql, params);
    return results as T;
  } catch (error: any) {
    console.error('Database Query Error:', error.message);
    throw error;
  }
}

export { getPool as pool };
export default getPool;
