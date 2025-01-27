import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { helpEmbed } from "../lib/embeds/help-embed.js";

export const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Get help with tracking arbs");

export const help = async (interaction: CommandInteraction) => {

  interaction.reply({ embeds: [helpEmbed()] });
};
