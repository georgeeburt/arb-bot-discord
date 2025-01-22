import { drizzle } from 'drizzle-orm/node-postgres';
import { trackedWallets } from './schema.js';
import postgres from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl =
  process.env.NODE_ENV === 'production'
    ? process.env.DATABASE_URL
    : 'postgresql://postgres@localhost:5432/arbi';
const { Pool } = postgres;

const pool = new Pool({
  connectionString: dbUrl
});

const db = drizzle(pool, {
  schema: { trackedWallets }
});

export default db;
