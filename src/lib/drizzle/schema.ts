import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  varchar
} from 'drizzle-orm/pg-core';

export const websocketConnections = pgTable('websocket_connections', {
  walletAddress: varchar('wallet_address', { length: 45 }).primaryKey(),
  websocketId: integer('connection_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull()
});

export const subscriptions = pgTable(
  'subscriptions',
  {
    userId: varchar('user_id', { length: 255 }).notNull(),
    walletAddress: varchar('wallet_address', { length: 45 }).notNull(),
    guildId: varchar('server_id', { length: 255 }),
    channelId: varchar('channel_id', { length: 255 }),
    isDmTracking: boolean('is_dm_tracking').notNull(),
    trackingStart: timestamp('tracking_start').defaultNow().notNull()
  },
  (table) => [primaryKey({ columns: [table.userId, table.walletAddress] })]
);
