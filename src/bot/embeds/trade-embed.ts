import { EmbedBuilder } from 'discord.js';
import { formatSolscanUrl } from '../../lib/helpers/solana-helpers.js';
import fetchSolPrice from '../../lib/services/fetch-usd-profit.js';
import type { TradeDetails } from '../../../types/index.js';

export const tradeEmbed = async ({
  signature,
  solBalance,
  wSolBalance,
  solProfit,
  usdcProfit,
  tradeTime,
  block,
  provider
}: TradeDetails) => {
  const solPrice = (await fetchSolPrice()) as number;
  return new EmbedBuilder()
    .setTitle('🔮 Arbitrage Trade Detected 🔮')
    .setColor('#3914B7')
    .setDescription(
      `[View Transaction on Solscan](${formatSolscanUrl(signature)})`
    )
    .addFields(
      {
        name: 'Total Profit',
        value: `\`${(solProfit || 0) < 0.001 ? (solProfit || 0).toFixed(8) : (solProfit || 0).toFixed(4)} SOL | ($${(solPrice * solProfit).toFixed(4)})\``
      },
      ...(usdcProfit
        ? [{ name: 'USDC Profit', value: `\`${usdcProfit} USDC\`` }]
        : []),
      { name: 'Transaction Signature', value: `\`${signature}\`` },
      {
        name: 'Provider',
        value: `\`${provider}\``,
        inline: true
      },
      {
        name: 'SOL Balance',
        value: `\`${solBalance.toFixed(4)} SOL | $${(solBalance * solPrice).toFixed(4)}\``,
        inline: true
      },
      {
        name: 'wSOL Balance',
        value: `\`${wSolBalance.toFixed(4)} wSOL | ($${(solPrice * wSolBalance).toFixed(4)})\``,
        inline: true
      },
      { name: 'Block', value: `\`${block}\``, inline: true },
      { name: 'Time', value: `\`${tradeTime}\``, inline: true }
    )
    .setFooter({ text: '🧱 Made by @0xarii' })
    .setTimestamp();
};
