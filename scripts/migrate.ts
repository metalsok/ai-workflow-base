import { Pool } from 'pg';
import { migrate } from '../apps/api/src/database/migrate.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await migrate(pool);
  console.log('Database migrations are up to date.');
} finally {
  await pool.end();
}
