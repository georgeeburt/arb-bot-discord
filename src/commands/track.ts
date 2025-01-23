import { PublicKey } from '@solana/web3.js';
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { monitorTrades } from '../lib/helpers/solana-helpers.js';
import { getUserData, trackWallet } from '../lib/helpers/db-helpers.js';
import { subscriptionManager } from '../lib/utils/subscription-manager.js';
import connection from '../lib/utils/solana.js';
import logger from '../lib/utils/logger.js';

export const trackCommand = new SlashCommandBuilder()
  .setName('track')
  .setDescription('Track a Solana address for arbitrage trades')
  .addStringOption((option) =>
    option
      .setName('wallet')
      .setDescription('Solana wallet to track')
      .setRequired(true)
  );

export const track = async (interaction: CommandInteraction) => {
  const walletAddressToTrack = interaction.options.get('wallet')
    ?.value as string;
  const userId = interaction.user.id;

  if (!walletAddressToTrack) {
    await interaction.reply({
      content: 'Please provide a solana wallet address to track'
    });
    return;
  } else {
    try {
      PublicKey.isOnCurve(walletAddressToTrack);
    } catch (error) {
      return await interaction.reply({
        content: 'Invalid Solana wallet address provided'
      });
    }
  }

  try {
    const userData = await getUserData(userId);

    if (userData) {
      return await interaction.reply({
        content: `You are already tracking wallet: \`${userData.walletAddress}\``
      });
    }

    await interaction.deferReply();

    try {
      if (subscriptionManager.isWalletSubscribed(walletAddressToTrack)) {
        const existingSubId =
          subscriptionManager.getSubscription(walletAddressToTrack);
        if (existingSubId) {
          subscriptionManager.addSubscription(
            walletAddressToTrack,
            userId,
            existingSubId
          );
          logger.info(
            `Reused existing subscription for wallet: ${walletAddressToTrack}`
          );
        }
      } else {
        const newSubId = await monitorTrades(walletAddressToTrack, interaction);
        subscriptionManager.addSubscription(
          walletAddressToTrack,
          userId,
          newSubId as number
        );

        await trackWallet(userId, walletAddressToTrack);
        await interaction.followUp({
          content: `Tracking initated: \`${walletAddressToTrack}\``
        });
      }
    } catch (error) {
      logger.error(`Error setting up trade monitoring: ${error}`);
      await interaction.editReply({
        content: 'There was an error setting up wallet tracking'
      });

      if (subscriptionManager.isWalletSubscribed(walletAddressToTrack)) {
        const subId = subscriptionManager.getSubscription(walletAddressToTrack);
        if (subId) {
          await connection.removeAccountChangeListener(subId);
          subscriptionManager.removeUser(walletAddressToTrack, userId);
        }
      }
    }
  } catch (error) {
    logger.error(`Error in track command handler: ${error}`);

    // Check if initial reply was made
    if (!interaction.replied) {
      return await interaction.reply({
        content: `There was an error tracking the wallet: ${error}`
      });
    }
  }
};
