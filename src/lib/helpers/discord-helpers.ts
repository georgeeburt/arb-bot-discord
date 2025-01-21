import { client } from '../../bot.js';
import { EmbedBuilder } from 'discord.js';
import logger from '../utils/logger.js';

const sendTradeNotification = async (embed: EmbedBuilder) => {
  try {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID as string);
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
