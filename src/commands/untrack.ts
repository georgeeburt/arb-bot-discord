import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getUserData, untrackWallet } from '../lib/helpers/db-helpers.js';
import { subscriptionManager } from '../lib/utils/subscription-manager.js';
import connection from '../lib/utils/solana.js';
import logger from '../lib/utils/logger.js';

export const untrackCommand = new SlashCommandBuilder()
  .setName('untrack')
  .setDescription('Stop tracking the current tracked wallet');

export const untrack = async (interaction: CommandInteraction) => {
  const userId = interaction.user.id;

  try {
    const userData = await getUserData(userId);

    if (!userData) {
      return await interaction.reply({
        content:
          'You are currently not tracking any wallet.\nUse `/track <wallet address>` to start tracking a wallet'
      });
    }

    await interaction.deferReply();

    const walletAddress = userData.walletAddress;

    try {
      if (subscriptionManager.isWalletSubscribed(walletAddress)) {
        const userCount = subscriptionManager.getUserCount(walletAddress);

        if (userCount === 1) {
          const subId = subscriptionManager.getSubscription(walletAddress);
          if (subId) {
            await connection.removeAccountChangeListener(subId);
          }
        }

        subscriptionManager.removeUser(walletAddress, userId);
        logger.info(
          `Removed user ${userId} from subscription for wallet: ${walletAddress}`
        );
      }

      await untrackWallet(userId);

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
