import { drizzle } from 'drizzle-orm/node-postgres';
import { trackedWallets } from './schema.js';
import postgres from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL as string;
const { Pool } = postgres;

const pool = new Pool({
  connectionString: dbUrl
})

const db = drizzle(pool, {
  schema: { trackedWallets }
});

export default db;
