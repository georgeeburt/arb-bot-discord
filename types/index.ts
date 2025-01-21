export type SubscriptionInfo = {
  subscriptionId: number;
  users: Set<string>;
}

export type TradeDetails = {
  signature: string;
  solBalance: number;
  wSolBalance: number;
  tradeTime: string;
  block: number;
}
