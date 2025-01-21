import db from '../drizzle/drizzle-service.js';
import { eq } from 'drizzle-orm';
import { trackedWallets } from '../drizzle/schema.js';
import logger from '../utils/logger.js';

export const getUserData = async (userId: string) => {
  try {
    const userData = await db.query.trackedWallets.findFirst({
      where: eq(trackedWallets.userId, userId)
    });

    if (userData) {
      return userData;
    } else {
      return null;
    }
  } catch (error) {
    logger.error(`Error finding user data: ${error}`);
  }
};

export const trackWallet = async (
  userId: string,
  walletAddress: string
) => {
  try {
    await db.insert(trackedWallets).values({
      userId,
      walletAddress
    });
  } catch (error) {
    logger.error(`Error tracking wallet: ${error}`);
  }
};
