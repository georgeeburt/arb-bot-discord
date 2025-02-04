export type SubscriptionInfo = {
  subscriptionId: number;
  users: Set<string>;
};

export type UserTrackingData = {
  userId: string;
  walletAddress: string;
  subscriptionId: number;
  isDmTracking: boolean;
  guildId: string | null;
  channelId?: string | null;
};

export type TradeDetails = {
  signature: string;
  solBalance: string | number;
  wSolBalance: number;
  solProfit: number;
  usdcProfit?: number;
  tradeTime: string;
  block: number;
  isNextBlockArb?: boolean;
  isFastArb?: boolean;
  isTemporalArb?: boolean;
};
