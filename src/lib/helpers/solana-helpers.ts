import {
  PublicKey,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta
} from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { NATIVE_MINT } from '@solana/spl-token';
import { DEX_PROGRAM_IDS } from '../constants/dex-program-constants.js';
import sendTradeNotification from './discord-helpers.js';
import connection from '../utils/solana.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';
import { subscriptionManager } from '../utils/subscription-manager.js';
import { tradeEmbed } from '../utils/embedUtils.js';

dotenv.config();

const lastSignatures = new Map<string, string>();

export const monitorTrades = async (pubKey: string) => {
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
            solBalance: await connection.getBalance(publicKey),
            wSolBalance: await getWrappedSolBalance(pubKey),
            tradeTime: new Date().toLocaleTimeString(),
            block: transaction.slot
          });

          await sendTradeNotification(arbEmbed);
        }
      } catch (error) {
        logger.error(`Error processing transaction: ${error}`);
      }
    });
    return subscriptionId;
  } catch (error) {
    logger.error(`Error setting up account monitoring: ${error}`);
    setTimeout(() => monitorTrades(pubKey), 5000);
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

export const getWrappedSolBalance = async (pubKey: string) => {
  const publicKey = new PublicKey(pubKey);
  const associatedTokenAddress = await getAssociatedTokenAddress(
    NATIVE_MINT,
    publicKey
  );

  const tokenAccountInfo = await connection.getAccountInfo(
    associatedTokenAddress
  );

  let wrappedSolBalance = 0;

  if (tokenAccountInfo) {
    wrappedSolBalance = tokenAccountInfo.lamports;
  }

  return wrappedSolBalance;
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

  if (dexInteractions.length > 0) {
    return true;
  }

  return false;
};

export const formatSolscanUrl = (signature: string) => {
  return `<https://solscan.io/tx/${signature}>`;
};
