import { CommandInteraction, EmbedBuilder } from 'discord.js';
import logger from '../utils/logger.js';

const sendTradeNotification = async (
  embed: EmbedBuilder,
  interaction: CommandInteraction
) => {
  try {
    const channel = interaction.channel;
    if (!channel) {
      logger.fatal('Discord channel not found!');
      return;
    }
    if (channel.isTextBased() && 'send' in channel) {
      await channel.send({
        embeds: [embed]
      });
    }
  } catch (error) {
    logger.error(`Failed to send notification: ${error}`);
  }
};

export default sendTradeNotification;
