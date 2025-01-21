import logger from './logger.js';
import type { SubscriptionInfo } from '../../../types/index.js';

class SubscriptionManager {
  private activeSubscriptions = new Map<string, SubscriptionInfo>();

  addSubscription(wallet: string, userId: string, subscriptionId: number) {
    const existingSubscription = this.activeSubscriptions.get(wallet);

    if (existingSubscription) {
      existingSubscription.users.add(userId);
      return existingSubscription.subscriptionId;
    } else {
      this.activeSubscriptions.set(wallet, {
        subscriptionId,
        users: new Set([userId])
      });
      return subscriptionId;
    }
  }

  removeUser(wallet: string, userId: string) {
    const subscription = this.activeSubscriptions.get(wallet);
    if (!subscription) {
      logger.warn(`No subscription found for wallet: ${wallet}`);
      return false;
    }

    subscription.users.delete(userId);

    if (subscription.users.size === 0) {
      return this.activeSubscriptions.delete(wallet);
    }
    return true;
  }

  getSubscription(wallet: string) {
    const subscription = this.activeSubscriptions.get(wallet);
    return subscription?.subscriptionId;
  }

  getSubScriptionUsers(wallet: string) {
    return Array.from(this.activeSubscriptions.get(wallet)?.users || []);
  }

  isWalletSubscribed(wallet: string) {
    return this.activeSubscriptions.has(wallet);
  }

  isUserSubscribed(wallet: string, userId: string) {
    return this.activeSubscriptions.get(wallet)?.users.has(userId) || false;
  }

  getUserCount(wallet: string) {
    return this.activeSubscriptions.get(wallet)?.users.size || 0;
  }
}

export const subscriptionManager = new SubscriptionManager();
