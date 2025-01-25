import { drizzle } from 'drizzle-orm/node-postgres';
import { subscriptions, websocketConnections } from './schema.js';
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

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

const db = drizzle(pool, {
  schema: { subscriptions, websocketConnections }
});

export default db;
