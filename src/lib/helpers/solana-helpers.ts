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
import { tradeEmbed } from '../../bot/embeds/trade-embed.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

export const monitorTrades = async (
  pubKey: string,
  channel: DMChannel | Channel
) => {
  const publicKey = new PublicKey(pubKey);
  const processedSignatures = new Set<string>();

  const processTransaction = async (signature: string) => {
    if (processedSignatures.has(signature)) return;

    try {
      const transaction = await connection.getParsedTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!transaction || !transaction.meta) return;

      const isArb = checkIfArbTrade(transaction);
      if (isArb) {
        const arbProfit = calculateArbProfit(transaction);

        const arbEmbed = tradeEmbed({
          signature,
          solBalance: transaction.meta.postBalances[0] as number,
          wSolBalance: transaction.meta.postTokenBalances?.find(
            (balance) => balance.mint === NATIVE_MINT.toString()
          )?.uiTokenAmount.uiAmount as number,
          solProfit:
            typeof arbProfit === 'object' ? arbProfit.solProfit : arbProfit,
          usdcProfit:
            typeof arbProfit === 'object' ? arbProfit.usdcProfit : undefined,
          tradeTime: new Date(
            transaction.blockTime! * 1000
          ).toLocaleTimeString(),
          block: transaction.slot
        });

        await sendTradeNotification(await arbEmbed, channel);
        processedSignatures.add(signature);
      }
    } catch (error) {
      logger.error(`Transaction processing error: ${error}`);
    }
  };

  const subscriptionId = connection.onAccountChange(
    publicKey,
    async () => {
      try {
        const signatures = await connection.getSignaturesForAddress(publicKey, {
          limit: 10
        });

        const newSignatures = signatures.filter(
          (sig) =>
            sig.signature !== undefined &&
            !processedSignatures.has(sig.signature)
        );

        if (newSignatures.length > 0) {
          for (const signature of newSignatures.reverse()) {
            await processTransaction(signature.signature!);
          }
        }
      } catch (error) {
        logger.error(`Account change error: ${error}`);
      }
    },
    { commitment: 'confirmed' }
  );

  logger.info(
    `Started monitoring trades for ${pubKey}, subscription ID: ${subscriptionId}`
  );

  return subscriptionId;
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
      (postSolBalance + postWrappedSolBalance + 0.001) / LAMPORTS_PER_SOL -
      (initialSolBalance - initialWrappedSolBalance) / LAMPORTS_PER_SOL
    );
  } else {
    return {
      solProfit:
        (postSolBalance + postWrappedSolBalance + 0.001) / LAMPORTS_PER_SOL -
        (initialSolBalance - initialWrappedSolBalance) / LAMPORTS_PER_SOL,
      usdcProfit: postUSDCBalance - initialUSDCBalance
    };
  }
};

export const formatSolscanUrl = (signature: string) => {
  return `<https://solscan.io/tx/${signature}>`;
};
