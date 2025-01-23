export type SubscriptionInfo = {
  subscriptionId: number;
  users: Set<string>;
};

export type TradeDetails = {
  signature: string;
  solBalance: string | number;
  wSolBalance: number;
  profit: string | number;
  tradeTime: string;
  block: number;
};
