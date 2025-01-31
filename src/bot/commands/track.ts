import { PublicKey } from '@solana/web3.js';
import {
  SlashCommandBuilder,
  CommandInteraction,
  TextBasedChannel
} from 'discord.js';
import {
  addUserSubscription,
  getUserSubscription
} from '../../lib/helpers/db-helpers.js';
import { monitorTrades } from '../../lib/helpers/solana-helpers.js';
import logger from '../../lib/utils/logger.js';

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
        content: `Invalid Solana wallet address provided`
      });
    }
  }

  try {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    const channel = interaction.channel;
    const userId = interaction.user.id;
    const userData = await getUserSubscription(userId);

    if (userData) {
      return await interaction.reply({
        content: `You are already tracking wallet: \`${userData.walletAddress}\``
      });
    }

    const isDmTracking = guildId === null;

    await interaction.deferReply();

    try {
      const subscriptionId = await monitorTrades(
        walletAddressToTrack,
        channel as TextBasedChannel
      );

      await addUserSubscription({
        userId,
        walletAddress: walletAddressToTrack,
        subscriptionId,
        guildId,
        channelId,
        isDmTracking
      });

      await interaction.followUp({
        content: `Tracking initated: \`${walletAddressToTrack}\``
      });

      logger.info(
        `User [${userId}] started tracking wallet: ${walletAddressToTrack}`
      );
    } catch (error) {
      logger.error(`Error setting up trade monitoring: ${error}`);
      await interaction.editReply({
        content: 'There was an error setting up wallet tracking'
      });
    }
  } catch (error) {
    logger.error(`Error in track command handler: ${error}`);

    if (!interaction.replied) {
      return await interaction.reply({
        content: `There was an error tracking the wallet: ${error}`
      });
    }
  }
};
