import { EmbedBuilder } from 'discord.js';

export const helpEmbed = () => {
  return new EmbedBuilder()
    .setTitle('🔮 Arbi Help 🔮')
    .setColor('#3914B7')
    .setDescription(
      'Welcome to Arbi Arbitrage Bot! Below, you’ll find help sections that provide a deeper understanding of the bot and guide you on tracking arbs.'
    )
    .setFields(
      {
        name: '🚫 Bot Restrictions',
        value:
          'Only one user can track a wallet for arbitrage opportunities at a time. If you are already tracking a wallet, you must untrack it by using the `/untrack` command before tracking a new one.'
      },
      {
        name: '∕ Commands Usage',
        value: `**\`/track <wallet address>\`** - The track command starts tracking the specified Solana wallet address for successful arbitrage lands.

          **\`/untrack\`** - The untrack command untracks the currently tracked wallet. You will need to use this command before tracking a new wallet.

          **\`/help\`** - The help command displays the help embed with all the necessary information about the bot.`
      }
    )
    .setFooter({ text: '🧱 Made by @0xarii' })
    .setTimestamp();
};
