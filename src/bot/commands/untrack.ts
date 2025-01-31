import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import {
  getUserSubscription,
  removeUserSubscription
} from '../../lib/helpers/db-helpers.js';
import logger from '../../lib/utils/logger.js';

export const untrackCommand = new SlashCommandBuilder()
  .setName('untrack')
  .setDescription('Stop tracking the current tracked wallet');

export const untrack = async (interaction: CommandInteraction) => {
  const userId = interaction.user.id;

  try {
    const userData = await getUserSubscription(userId);

    if (!userData) {
      return await interaction.reply({
        content:
          'You are currently not tracking any wallet.\nUse `/track <wallet address>` to start tracking a wallet'
      });
    }

    await interaction.deferReply();

    const walletAddress = userData.walletAddress;

    try {
      await removeUserSubscription(userId, walletAddress);

      logger.info(`User [${userId}] stopped tracking wallet: ${walletAddress}`);
      return await interaction.editReply({
        content: `Successfully stopped tracking wallet: \`${walletAddress}\``
      });
    } catch (error) {
      logger.error(`Error in untrack operation: ${error}`);
      await interaction.editReply({
        content: 'There was an error stopping the wallet tracking'
      });
    }
  } catch (error) {
    logger.error(`Error untracking wallet: ${error}`);
    await interaction.reply({
      content: 'There was an error stopping the wallet tracking'
    });
  }
};
