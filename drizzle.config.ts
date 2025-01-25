import dotenv from 'dotenv';
import type { Config } from 'drizzle-kit';

dotenv.config();

const config: Config = {
  schema: './src/lib/drizzle/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
};

export default config;
