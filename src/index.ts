import { REST, Routes } from 'discord.js';
import { trackCommand, track } from './commands/track.js';
import { untrackCommand, untrack } from './commands/untrack.js';
import { client } from './bot.js';
import logger from './lib/utils/logger.js';

const rest = new REST().setToken(process.env.DISCORD_TOKEN as string);

client.once('ready', async () => {
  try {
    logger.info(`Bot logged in as ${client.user?.tag}`);
    const commands = [trackCommand.toJSON(), untrackCommand.toJSON()];

    await rest.put(Routes.applicationCommands(client.user!.id), {
      body: commands
    });
  } catch (error) {
    logger.error(`Error registering commands: ${error}`);
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
  }
});

process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled promise rejection: ${error}`);
});

client.login(process.env.DISCORD_TOKEN);
