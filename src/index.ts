import { track } from './commands/track.js';
import { untrack } from './commands/untrack.js';
import { client } from './bot.js';
import { restoreWebsocketSubscriptions } from './lib/helpers/db-helpers.js';
import { registerCommands } from './lib/helpers/discord-helpers.js';
import logger from './lib/utils/logger.js';
import { help } from './commands/help.js';

client.once('ready', async () => {
  try {
    logger.info(`Bot logged in as ${client.user?.tag}`);
    await registerCommands();
  } catch (error) {
    logger.error(`Error registering commands: ${error}`);
  }
  try {
    await restoreWebsocketSubscriptions();
  } catch (error) {
    logger.error(`Error restoring websocket subscriptions: ${error}`);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  switch (interaction.commandName) {
    case 'track':
      await track(interaction);
      break;
    case 'untrack':
      await untrack(interaction);
      break;
    case 'help':
      await help(interaction);
  }
});

process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled promise rejection: ${error}`);
});

client.login(process.env.DISCORD_TOKEN);
