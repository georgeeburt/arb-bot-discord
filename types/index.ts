export type SubscriptionInfo = {
  subscriptionId: number;
  users: Set<string>;
};

export type UserTrackingData = {
  userId: string;
  walletAddress: string;
  websocketId: number;
  isDmTracking: boolean;
  guildId: string | null;
  channelId?: string | null;
};

export type TradeDetails = {
  signature: string;
  solBalance: string | number;
  wSolBalance: number;
  solProfit: string | number;
  usdcProfit?: string | number;
  tradeTime: string;
  block: number;
};
