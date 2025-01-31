import db from '../drizzle/drizzle-service.js';
import { client } from '../../bot.js';
import { and, eq } from 'drizzle-orm';
import connection from '../utils/solana.js';
import { subscriptions, websocketConnections } from '../drizzle/schema.js';
import { monitorTrades } from './solana-helpers.js';
import logger from '../utils/logger.js';
import type { UserTrackingData } from '../../../types/index.js';
import type { TextBasedChannel } from 'discord.js';

export const getUserSubscription = async (userId: string) => {
  try {
    return await db.query.subscriptions.findFirst({
      where: (fields, { eq }) => eq(fields.userId, userId)
    });
  } catch (error) {
    logger.error(`Error finding user data: ${error}`);
    return null;
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
  logger.info('Starting websocket subscription restoration...');

  try {
    if (!client.isReady()) {
      logger.info('Waiting for Discord client to be ready...');
      await Promise.race([
        new Promise((resolve) => client.once('ready', resolve)),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Discord client ready timeout')),
            30000
          )
        )
      ]);
    }

    const allSubscriptions = await db.query.subscriptions.findMany();

    if (allSubscriptions.length === 0) {
      logger.info('No existing subscriptions found to restore');
      return;
    }

    logger.info(`Found ${allSubscriptions.length} subscriptions to restore`);

    const results = {
      success: 0,
      failed: 0,
      channelNotFound: 0,
      userNotFound: 0,
      invalidChannel: 0
    };

    const batchSize = 8;
    for (let i = 0; i < allSubscriptions.length; i += batchSize) {
      const batch = allSubscriptions.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (subscription) => {
          try {
            let channel: TextBasedChannel;

            if (subscription.isDmTracking) {
              try {
                const user = await client.users.fetch(subscription.userId);
                channel = await user.createDM();
              } catch (error) {
                results.userNotFound++;
                logger.error(
                  `Failed to fetch user ${subscription.userId} for DM subscription: ${error instanceof Error ? error.message : error}`
                );
                return;
              }
            } else {
              try {
                const fetchedChannel = await client.channels.fetch(
                  subscription.channelId as string
                );

                if (!fetchedChannel) {
                  results.channelNotFound++;
                  logger.error(`Channel ${subscription.channelId} not found`);
                  return;
                }

                if (!fetchedChannel.isTextBased()) {
                  results.invalidChannel++;
                  logger.error(
                    `Channel ${subscription.channelId} is not a text channel`
                  );
                  return;
                }

                channel = fetchedChannel;
              } catch (error) {
                results.channelNotFound++;
                logger.error(
                  `Failed to fetch channel ${subscription.channelId}: ${error instanceof Error ? error.message : error}`
                );
                return;
              }
            }

            const subscriptionId = await monitorTrades(
              subscription.walletAddress,
              channel
            );

            if (subscriptionId) {
              await db
                .update(websocketConnections)
                .set({ websocketId: subscriptionId.subscriptionId })
                .where(
                  eq(
                    websocketConnections.walletAddress,
                    subscription.walletAddress
                  )
                );
            }

            results.success++;

            return subscriptionId;
          } catch (error) {
            results.failed++;
            logger.error(
              `Failed to restore websocket for wallet ${subscription.walletAddress}: ${error instanceof Error ? error.message : error}`
            );
          }
        })
      );

      if (i + batchSize < allSubscriptions.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    logger.info('Websocket restoration complete');
  } catch (error) {
    logger.error(
      `Critical error in websocket restoration: ${error instanceof Error ? error.message : error}`
    );
    throw error;
  }
};
