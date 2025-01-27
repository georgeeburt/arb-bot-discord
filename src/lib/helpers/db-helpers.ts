import db from '../drizzle/drizzle-service.js';
import { and, eq } from 'drizzle-orm';
import { subscriptions, websocketConnections } from '../drizzle/schema.js';
import connection from '../utils/solana.js';
import { client } from '../../bot.js';
import logger from '../utils/logger.js';
import type { UserTrackingData } from '../../../types/index.js';
import { monitorTrades } from './solana-helpers.js';
import { TextBasedChannel } from 'discord.js';

export const getUserSubscription = async (userId: string) => {
  try {
    return await db.query.subscriptions.findFirst({
      where: (fields, { eq }) => eq(fields.userId, userId)
    });
  } catch (error) {
    logger.error(`Error finding user data: ${error}`);
  }
};

export const addUserSubscription = async ({
  userId,
  walletAddress,
  guildId,
  channelId,
  isDmTracking,
  websocketId
}: UserTrackingData) => {
  try {
    await db
      .insert(subscriptions)
      .values({
        userId,
        walletAddress,
        guildId,
        channelId,
        isDmTracking
      })
      .onConflictDoUpdate({
        target: [subscriptions.userId, subscriptions.walletAddress],
        set: {
          walletAddress,
          guildId,
          channelId,
          isDmTracking
        }
      });

    const isWalletTracked = await db.query.websocketConnections.findFirst({
      where: eq(websocketConnections.walletAddress, walletAddress)
    });

    if (isWalletTracked) {
      return;
    } else {
      await db
        .insert(websocketConnections)
        .values({
          walletAddress,
          websocketId
        })
        .onConflictDoNothing();
    }
  } catch (error) {
    logger.error(`Error tracking wallet: ${error}`);
  }
};

export const removeUserSubscription = async (
  userId: string,
  walletAddress: string
) => {
  try {
    await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.walletAddress, walletAddress)
        )
      );

    const isStillTracked = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.walletAddress, walletAddress)
    });

    if (!isStillTracked) {
      const websocketConnection = await db
        .delete(websocketConnections)
        .where(eq(websocketConnections.walletAddress, walletAddress))
        .returning();

      connection.removeAccountChangeListener(
        websocketConnection[0].websocketId
      );
    }
  } catch (error) {
    logger.error(`Error untracking wallet: ${error}`);
  }
};

export const restoreWebsocketSubscriptions = async () => {
  if (!client.isReady()) {
    await new Promise((resolve) => client.once('ready', resolve));
  }

  const allSubscriptions = await db.query.subscriptions.findMany();

  for (const subscription of allSubscriptions) {
    try {
      let channel: TextBasedChannel;

      if (subscription.isDmTracking) {
        const user = await client.users.fetch(subscription.userId);
        channel = await user.createDM();
      } else {
        const fetchedChannel = await client.channels.fetch(
          subscription.channelId as string
        );
        if (!fetchedChannel?.isTextBased()) {
          throw new Error('Not a text channel');
        }
        channel = fetchedChannel;
      }

      await monitorTrades(subscription.walletAddress, channel);

      logger.info(
        `Restored websocket subscription for ${subscription.walletAddress}`
      );
    } catch (error) {
      logger.error(
        `Websocket restoration failed for ${subscription.walletAddress}: ${error}`
      );
    }
  }
};
