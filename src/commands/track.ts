import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { monitorTrades } from '../lib/helpers/solana-helpers.js';
import { getUserData, trackWallet } from '../lib/helpers/db-helpers.js';
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
  const walletAddressToTrack = interaction.options.get('wallet')?.value;
  const userId = interaction.user.id;

  if (!walletAddressToTrack) {
    await interaction.reply({
      content: 'Please provide a solana wallet address to track'
    });
    return;
  }

  try {
    const userData = await getUserData(userId);

    if (userData) {
      return await interaction.reply({
        content: `You are already tracking the following wallet: ${userData.walletAddress}`
      });
    } else {
      logger.info(
        `Starting trade monitoring for address: ${walletAddressToTrack} by user: ${userId}`
      );

      await trackWallet(userId, walletAddressToTrack as string);

      await interaction.reply({
        content: `Tracking initated: ${walletAddressToTrack}`
      });

      await monitorTrades(walletAddressToTrack as string);
    }


  } catch (error) {
    logger.error(`Error tracking wallet: ${error}`);

    // Check if initial reply was made
    if (interaction.replied) {
      await interaction.followUp({
        content: 'There was an error tracking the wallet'
      });
    } else {
      await interaction.reply({
        content: 'There was an error tracking the wallet'
      });
    }
  }
};
