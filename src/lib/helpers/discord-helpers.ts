import { EmbedBuilder, REST, Routes, Channel } from 'discord.js';
import { trackCommand } from '../../commands/track.js';
import { untrackCommand } from '../../commands/untrack.js';
import { client } from '../../bot.js';
import { helpCommand } from '../../commands/help.js';
import logger from '../utils/logger.js';

export const sendTradeNotification = async (
  embed: EmbedBuilder,
  channel: Channel
) => {
  try {
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

export const registerCommands = async () => {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN as string);
  try {
    const commands = [
      trackCommand.toJSON(),
      untrackCommand.toJSON(),
      helpCommand.toJSON()
    ];
    if (client.user?.id) {
      await rest.put(Routes.applicationCommands(client.user.id), {
        body: commands
      });
      logger.info('Commands registered successfully');
    } else {
      logger.error('Bot user ID is missing');
    }
  } catch (error) {
    logger.error(`Error registering commands: ${error}`);
  }
};
