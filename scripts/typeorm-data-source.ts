import { createDataSource } from '../apps/api/src/database/data-source.js';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
export default createDataSource(process.env.DATABASE_URL);
