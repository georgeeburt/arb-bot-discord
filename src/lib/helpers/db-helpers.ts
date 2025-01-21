import db from '../drizzle/drizzle-service.js';
import { eq } from 'drizzle-orm';
import { trackedWallets } from '../drizzle/schema.js';
import logger from '../utils/logger.js';

export const getUserData = async (userId: string) => {
  try {
    return await db.query.trackedWallets.findFirst({
      where: eq(trackedWallets.userId, userId)
    });
  } catch (error) {
    logger.error(`Error finding user data: ${error}`);
  }
};

export const trackWallet = async (userId: string, walletAddress: string) => {
  try {
    return await db.insert(trackedWallets).values({
      userId,
      walletAddress
    });
  } catch (error) {
    logger.error(`Error tracking wallet: ${error}`);
  }
};

export const untrackWallet = async (userId: string) => {
  try {
    const data = await db
      .delete(trackedWallets)
      .where(eq(trackedWallets.userId, userId))
      .returning();

    return data;
  } catch (error) {
    logger.error(`Error untracking wallet: ${error}`);
  }
};
