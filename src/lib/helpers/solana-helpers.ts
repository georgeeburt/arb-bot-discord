import {
  PublicKey,
  ParsedTransactionWithMeta,
  ParsedInstruction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import connection from '../utils/solana.js';
import { NATIVE_MINT } from '@solana/spl-token';
import BASE_MINTS from '../constants/base-mints.js';
import { SMB_PROGRAM_ID } from '../constants/custom-programs.js';
import { PROVIDERS } from '../constants/provider-accounts.js';
import { sendTradeNotification } from './discord-helpers.js';
import { tradeEmbed } from '../../bot/embeds/trade-embed.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';
import type { DMChannel, Channel } from 'discord.js';
import { ProviderName } from '../../../types/index.js';
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
        const provider = getArbProvider(transaction);
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
          block: transaction.slot,
          provider
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
  const postSolBalance = transaction.meta?.postBalances[0] as number;

  const initialWrappedSolBalance = Number(
    transaction.meta?.preTokenBalances?.find(
      (balance) => balance.mint === NATIVE_MINT.toString()
    )?.uiTokenAmount.amount
  );
  const postWrappedSolBalance = Number(
    transaction.meta?.postTokenBalances?.find(
      (balance) => balance.mint === NATIVE_MINT.toString()
    )?.uiTokenAmount.amount
  );

  const initialUSDCBalance = Number(
    transaction.meta?.preTokenBalances?.find(
      (balance) => balance.mint === BASE_MINTS.usdc
    )
  );
  const postUSDCBalance = Number(
    transaction.meta?.postTokenBalances?.find(
      (balance) => balance.mint === BASE_MINTS.usdc
    )
  );

  const provider = getArbProvider(transaction);

  if (!initialUSDCBalance || !postUSDCBalance) {
    return (
      postSolBalance / LAMPORTS_PER_SOL +
      postWrappedSolBalance / LAMPORTS_PER_SOL -
      (initialSolBalance / LAMPORTS_PER_SOL +
        initialWrappedSolBalance / LAMPORTS_PER_SOL) +
      (provider === 'Jito' ? 0.001 : 0)
    );
  } else {
    return {
      solProfit:
        postSolBalance / LAMPORTS_PER_SOL +
        postWrappedSolBalance / LAMPORTS_PER_SOL -
        (initialSolBalance / LAMPORTS_PER_SOL +
          initialWrappedSolBalance / LAMPORTS_PER_SOL) +
        (provider === 'Jito' ? 0.001 : 0),
      usdcProfit: postUSDCBalance - initialUSDCBalance
    };
  }
};

export const getArbProvider = (
  transaction: ParsedTransactionWithMeta
): ProviderName => {
  const instructions = getAllInstructions(transaction);

  for (const provider in PROVIDERS) {
    const providerAccounts = PROVIDERS[provider as ProviderName].accounts;

    if (
      instructions.some((ix) => {
        if (
          'parsed' in ix &&
          (ix as ParsedInstruction).parsed?.type === 'transfer'
        ) {
          const { destination } = (ix as ParsedInstruction).parsed.info;
          return providerAccounts.has(destination);
        }
        return false;
      })
    ) {
      return provider as ProviderName;
    }
  }
  return 'Jito';
};

export const formatSolscanUrl = (signature: string) => {
  return `<https://solscan.io/tx/${signature}>`;
};
