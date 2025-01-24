import {
  PublicKey,
  ParsedTransactionWithMeta,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { CommandInteraction } from 'discord.js';
import { DEX_PROGRAM_IDS } from '../constants/dex-program-constants.js';
import sendTradeNotification from './discord-helpers.js';
import connection from '../utils/solana.js';
import { subscriptionManager } from '../utils/subscription-manager.js';
import { tradeEmbed } from '../utils/embedUtils.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const lastSignatures = new Map<string, string>();

export const monitorTrades = async (
  pubKey: string,
  interaction: CommandInteraction
) => {
  const publicKey = new PublicKey(pubKey);

  try {
    const subscriptionId = connection.onAccountChange(publicKey, async () => {
      if (!subscriptionManager.isWalletSubscribed(pubKey)) {
        return;
      }

      try {
        const signatures = await connection.getSignaturesForAddress(publicKey, {
          limit: 1
        });

        const lastSignature = signatures[0].signature;

        if (
          !signatures.length ||
          lastSignature === lastSignatures.get(pubKey)
        ) {
          return;
        }

        lastSignatures.set(pubKey, lastSignature);
        logger.info(`\nProcessing new transaction: ${lastSignature}`);

        const transaction = await connection.getParsedTransaction(
          lastSignature,
          {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          }
        );

        if (!transaction) {
          logger.info(`No transaction data found for ${lastSignature}`);
          return;
        }

        const isArb = checkIfArbTrade(transaction);
        logger.info(`Is arbitrage: ${isArb}`);

        if (isArb) {
          const arbEmbed = tradeEmbed({
            signature: lastSignature,
            solBalance: transaction.meta?.postBalances[0] as number,
            wSolBalance: transaction.meta?.postTokenBalances?.find(
              (balance) => balance.mint === NATIVE_MINT.toString()
            )?.uiTokenAmount.uiAmount as number,
            profit: calculateArbProfit(transaction),
            tradeTime: new Date().toLocaleTimeString(),
            block: transaction.slot
          });

          await sendTradeNotification(arbEmbed, interaction);
        }
      } catch (error) {
        logger.error(`Error processing transaction: ${error}`);
      }
    });
    return subscriptionId;
  } catch (error) {
    logger.error(`Error setting up account monitoring: ${error}`);
    setTimeout(() => monitorTrades(pubKey, interaction), 5000);
  }
};

export const getAllInstructions = (transaction: ParsedTransactionWithMeta) => {
  const instructions = [];

  // Add main instructions
  if (transaction.transaction?.message?.instructions) {
    instructions.push(...transaction.transaction.message.instructions);
  }

  // Add inner instructions
  if (transaction.meta?.innerInstructions) {
    transaction.meta.innerInstructions.forEach((inner) => {
      instructions.push(...inner.instructions);
    });
  }

  return instructions;
};

export const checkIfArbTrade = (transaction: ParsedTransactionWithMeta) => {
  if (!transaction?.meta) {
    logger.info('No transaction metadata found');
    return false;
  }

  const allInstructions = getAllInstructions(transaction);

  // Get unique program IDs
  const programIds = allInstructions
    .map((ix) => ix.programId.toString())
    .filter((value, index, self) => self.indexOf(value) === index);

  logger.info(`All program IDs found: ${programIds}`);

  // Check for DEX interactions
  const dexInteractions = programIds.filter((id) =>
    Object.values(DEX_PROGRAM_IDS).includes(id)
  );

  logger.info(`DEX interactions found: ${dexInteractions}`);

  if (dexInteractions.length > 0 && transaction.meta.err === null) {
    return true;
  }

  return false;
};

export const calculateArbProfit = (transaction: ParsedTransactionWithMeta) => {
  const initialSolBalance = transaction.meta?.preBalances[0] as number;
  let initialWrappedSolBalance = Number(
    transaction.meta?.preTokenBalances?.find(
      (balance) => balance.mint === NATIVE_MINT.toString()
    )?.uiTokenAmount.amount
  );

  const postSolBalance = transaction.meta?.postBalances[0] as number;
  const postWrappedSolBalance = Number(
    transaction.meta?.postTokenBalances?.find(
      (balance) => balance.mint === NATIVE_MINT.toString()
    )?.uiTokenAmount.amount
  );
  return (
    (postSolBalance +
      postWrappedSolBalance -
      initialSolBalance -
      initialWrappedSolBalance) /
    LAMPORTS_PER_SOL
  );
};

export const formatSolscanUrl = (signature: string) => {
  return `<https://solscan.io/tx/${signature}>`;
};
