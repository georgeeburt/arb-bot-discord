import { boolean, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const trackedWallets = pgTable('tracked_wallets', {
  userId: varchar('user_id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 45 }).notNull(),
  isTracking: boolean('is_tracking').default(true),
  trackingStart: timestamp('tracking_start').defaultNow()
});
