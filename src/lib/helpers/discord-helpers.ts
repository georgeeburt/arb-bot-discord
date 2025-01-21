import { client } from '../../bot.js';
import logger from '../utils/logger.js';

const sendTradeNotification = async (tradeDetails: string) => {
  try {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID as string);
    if (!channel) {
      logger.fatal('Discord channel not found!');
      return;
    }
    if (channel.isTextBased() && 'send' in channel) {
      await channel.send({
        content: `🚨 **Arbitrage Trade Detected!** 🚨\n${tradeDetails}`,
        allowedMentions: { parse: [] }
      });
    }
  } catch (error) {
    logger.error(`Failed to send notification: ${error}`);
  }
};

export default sendTradeNotification;
