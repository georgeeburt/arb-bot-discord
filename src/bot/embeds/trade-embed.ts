import { EmbedBuilder } from 'discord.js';
import fetchUsdProfit from '../../lib/services/fetch-usd-profit.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { formatSolscanUrl } from '../../lib/helpers/solana-helpers.js';
import type { TradeDetails } from '../../../types/index.js';

export const tradeEmbed = async ({
  signature,
  solBalance,
  wSolBalance,
  solProfit,
  usdcProfit,
  tradeTime,
  block
}: TradeDetails) => {
  return new EmbedBuilder()
    .setTitle('🔮 Arbitrage Trade Detected 🔮')
    .setColor('#3914B7')
    .setDescription(
      `[View Transaction on Solscan](${formatSolscanUrl(signature)})`
    )
    .addFields(
      {
        name: 'Total Profit',
        value: `\`${solProfit < 0.001 ? solProfit.toFixed(8) : solProfit.toFixed(4)} SOL | ($${(await fetchUsdProfit(solProfit))?.toFixed(3)})\``
      },
      ...(usdcProfit
        ? [{ name: 'USDC Profit', value: `\`${usdcProfit} USDC\`` }]
        : []),
      { name: 'Transaction Signature', value: `\`${signature}\`` },
      {
        name: 'SOL Balance',
        value: `\`${(Number(solBalance) / LAMPORTS_PER_SOL).toFixed(4)} SOL\``,
        inline: true
      },
      {
        name: 'wSOL Balance',
        value: `\`${wSolBalance.toFixed(4)} wSOL\``,
        inline: true
      },
      { name: 'Block', value: `\`${block}\``, inline: true },
      { name: 'Time', value: `\`${tradeTime}\``, inline: true }
    )
    .setFooter({ text: '🧱 Made by @0xarii' })
    .setTimestamp();
};
