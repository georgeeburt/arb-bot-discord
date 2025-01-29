import {
  PublicKey,
  ParsedTransactionWithMeta,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { DMChannel, Channel } from 'discord.js';
import BASE_MINTS from '../constants/base-mint-constants.js';
import { SMB_PROGRAM_ID } from '../constants/program-constants.js';
import { sendTradeNotification } from './discord-helpers.js';
import connection from '../utils/solana.js';
import { tradeEmbed } from '../embeds/trade-embed.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const lastSignatures = new Map<string, string>();

export const monitorTrades = async (
  pubKey: string,
  channel: DMChannel | Channel
) => {
  const publicKey = new PublicKey(pubKey);

  try {
    const subscriptionId = connection.onAccountChange(publicKey, async () => {
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
          return;
        }

        const isArb = checkIfArbTrade(transaction);
        logger.info(`Is arbitrage: ${isArb}`);

        if (isArb) {
          const arbProfit = calculateArbProfit(transaction);

          const solProfit = typeof arbProfit === 'object' ? arbProfit.solProfit : arbProfit;
          const usdcProfit = typeof arbProfit === 'object' ? arbProfit.usdcProfit : undefined;

          const arbEmbed = tradeEmbed({
            signature: lastSignature,
            solBalance: transaction.meta?.postBalances[0] as number,
            wSolBalance: transaction.meta?.postTokenBalances?.find(
              (balance) => balance.mint === NATIVE_MINT.toString()
            )?.uiTokenAmount.uiAmount as number,
            solProfit,
            usdcProfit,
            tradeTime: new Date().toLocaleTimeString(),
            block: transaction.slot
          });

          await sendTradeNotification(arbEmbed, channel);
        }
      } catch (error) {
        logger.error(`Error processing transaction: ${error}`);
      }
    });
    return subscriptionId;
  } catch (error) {
    logger.error(`Error setting up account monitoring: ${error}`);
    setTimeout(() => monitorTrades(pubKey, channel), 5000);
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
    return false;
  }

  const allInstructions = getAllInstructions(transaction);

  // Get unique program IDs
  const programIds = allInstructions
    .map((ix) => ix.programId.toString())
    .filter((value, index, self) => self.indexOf(value) === index);

  // Check for DEX interactions
  const isSMBArb = programIds.includes(SMB_PROGRAM_ID);

  if (isSMBArb && transaction.meta.err === null) {
    return true;
  }

  return false;
};

export const calculateArbProfit = (transaction: ParsedTransactionWithMeta) => {
  const initialSolBalance = transaction.meta?.preBalances[0] as number;
  const initialWrappedSolBalance = Number(
    transaction.meta?.preTokenBalances?.find(
      (balance) => balance.mint === NATIVE_MINT.toString()
    )?.uiTokenAmount.amount
  );
  const initialUSDCBalance = Number(
    transaction.meta?.preTokenBalances?.find(
      (balance) => balance.mint === BASE_MINTS.usdc
    )
  );

  const postSolBalance = transaction.meta?.postBalances[0] as number;
  const postWrappedSolBalance = Number(
    transaction.meta?.postTokenBalances?.find(
      (balance) => balance.mint === NATIVE_MINT.toString()
    )?.uiTokenAmount.amount
  );
  const postUSDCBalance = Number(
    transaction.meta?.postTokenBalances?.find(
      (balance) => balance.mint === BASE_MINTS.usdc
    )
  );

  if (!initialUSDCBalance || !postUSDCBalance) {
    return (
      (postSolBalance +
        postWrappedSolBalance -
        initialSolBalance -
        initialWrappedSolBalance) /
      LAMPORTS_PER_SOL
    );
  } else {
    return {
      solProfit:
        postSolBalance +
        postWrappedSolBalance -
        initialSolBalance -
        initialWrappedSolBalance,
      usdcProfit: postUSDCBalance - initialUSDCBalance
    };
  }
};

export const formatSolscanUrl = (signature: string) => {
  return `<https://solscan.io/tx/${signature}>`;
};
