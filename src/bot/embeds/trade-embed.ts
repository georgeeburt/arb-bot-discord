import { EmbedBuilder } from 'discord.js';
import { formatSolscanTransactionUrl } from '../../lib/helpers/solana-helpers.js';
import fetchSolPrice from '../../lib/services/fetch-sol-price.js';
import type { TradeDetails } from '../../../types/index.js';

export const tradeEmbed = async ({
  signature,
  solBalance,
  wSolBalance,
  solProfit,
  usdcBalance,
  usdcProfit,
  tradeTime,
  block,
  provider,
  isFlashLoan,
  memo
}: TradeDetails) => {
  const solPrice = ((await fetchSolPrice()) as number) || 0;
  const usdSolWalletValue = (solBalance ?? 0) * solPrice;
  const usdWSolWalletValue = (wSolBalance ?? 0) * solPrice;
  const usdProfitValue = solProfit ? solProfit * solPrice : 0;

  return new EmbedBuilder()
    .setTitle('🔮 Arbitrage Trade Detected 🔮')
    .setColor('#3914B7')
    .setDescription(
      `[View Transaction on Solscan](${formatSolscanTransactionUrl(signature)})`
    )
    .setThumbnail(
      isFlashLoan ? 'https://www.imghippo.com/i/ddaZ6071xdI.png' : null
    )
    .addFields(
      ...(solProfit
        ? [
            {
              name: 'Total Profit',
              value: `\`${(solProfit ?? 0) < 0.001 ? (solProfit ?? 0).toFixed(8) : (solProfit ?? 0).toFixed(4)} SOL | ($${usdProfitValue < 1 ? usdProfitValue.toFixed(4) : usdProfitValue.toFixed(2)})\``
            }
          ]
        : []),
      ...(usdcProfit
        ? [
            {
              name: 'USDC Profit',
              value: `\`${(usdcProfit ?? 0) < 1 ? (usdcProfit ?? 0).toFixed(4) : (usdcProfit ?? 0).toFixed(2)} USDC\``
            }
          ]
        : []),
      {
        name: 'SOL Balance',
        value: `\`${(solBalance ?? 0).toFixed(4)} SOL | $${(usdSolWalletValue ?? 0) < 1 ? (usdSolWalletValue ?? 0).toFixed(4) : (usdSolWalletValue ?? 0).toFixed(2)}\``,
        inline: true
      },
      ...(wSolBalance > 0
        ? [
            {
              name: 'wSOL Balance',
              value: `\`${(wSolBalance ?? 0).toFixed(4)} wSOL | ($${(usdWSolWalletValue ?? 0) < 1 ? (usdWSolWalletValue ?? 0).toFixed(4) : (usdWSolWalletValue ?? 0).toFixed(2)})\``,
              inline: true
            }
          ]
        : []),
      ...(usdcBalance > 0
        ? [
            {
              name: 'USDC Balance',
              value: `\`${usdcBalance.toFixed(2)} USDC\``,
              inline: true
            }
          ]
        : []),
      ...(memo ? [{ name: 'Memo', value: `\`${memo}\``, inline: true }] : []),
      {
        name: 'Provider',
        value: `\`${provider}\``,
        inline: true
      },
      {
        name: 'SOL Price',
        value: `\`$${solPrice.toFixed(2)}\``,
        inline: true
      },
      { name: 'Block', value: `\`${block}\``, inline: true },
      { name: 'Time', value: `\`${tradeTime}\``, inline: true }
    )
    .setFooter({ text: '🧱 Built by @0xarii' })
    .setTimestamp();
};
