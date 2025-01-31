import { EmbedBuilder } from 'discord.js';

export const helpEmbed = () => {
  return new EmbedBuilder()
    .setTitle('🔮 Arbi Help 🔮')
    .setColor('#3914B7')
    .setDescription(
      'Welcome to Arbi Bot! Below you can find the different help sections for a deeper understanding of the bot.'
    )
    .setFields(
      {
        name: '🚫 Bot Restrictions',
        value:
          'Only one user can track a wallet for arbitrage opportunities at a time. If you are already tracking a wallet, you must untrack it by using the `/untrack` command before tracking a new one.'
      },
      {
        name: '∕ Commands',
        value:
          '`/track <wallet address>` - The track command starts tracking the specified Solana wallet address for successfuly arbitrage opportunities.\n\n`/untrack` - The untrack command untracks the currently tracked wallet.'
      }
    )
    .setFooter({ text: '🧱 Made by @0xarii' })
    .setTimestamp();
};
