import { EmbedBuilder } from 'discord.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { TradeDetails } from '../../../types/index.js';
import { formatSolscanUrl } from '../helpers/solana-helpers.js';

export const tradeEmbed = ({
  signature,
  solBalance,
  wSolBalance,
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
      { name: 'Transaction Signature', value: `\`${signature}\`` },
      { name: 'Block', value: `\`${block}\``, inline: true },
      { name: 'Time', value: `\`${tradeTime}\``, inline: true },
      {
        name: 'SOL Balance',
        value: `\`${(solBalance / LAMPORTS_PER_SOL).toFixed(4)}\``,
        inline: true
      },
      {
        name: 'wSOL Balance',
        value: `\`${(wSolBalance / LAMPORTS_PER_SOL).toFixed(4)}\``,
        inline: true
      }
    )
    .setFooter({ text: 'Made by @0xarii' })
    .setTimestamp();
};
