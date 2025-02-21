import {
  PublicKey,
  ParsedTransactionWithMeta,
  ParsedInstruction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import connection from '../services/solana.js';
import { NATIVE_MINT } from '@solana/spl-token';
import BASE_MINTS from '../constants/base-mints.js';
import {
  KAMINO_PROGRAM_ID,
  MEMO_PROGRAM_ID,
  SMB_PROGRAM_ID
} from '../constants/custom-programs.js';
import { PROVIDERS } from '../constants/provider-accounts.js';
import { sendTradeNotification } from './discord-helpers.js';
import { tradeEmbed } from '../../bot/embeds/trade-embed.js';
import fetchSolPrice from '../services/fetch-sol-price.js';
import logger from '../utils/logger.js';
import type { DMChannel, Channel } from 'discord.js';
import type { ProviderName } from '../../../types/index.js';
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
        let reimbursement: number | undefined;
        let provider = getArbProvider(transaction);
        const solPrice = (await fetchSolPrice()) || 0;
        if (!provider) {
          const isUsingSeperateTip = await isUsingSeperateTipTransaction(
            transaction,
            pubKey
          );

          if (isUsingSeperateTip?.isSeperateTip) {
            reimbursement = isUsingSeperateTip.tipAmount;
            provider = 'Jito';
          }
        }

        provider = provider ?? 'RPC';

        const arbProfit = await calculateArbProfit(
          transaction,
          reimbursement,
          solPrice
        );

        const isFlashLoan = checkIsFlashLoan(transaction);

        const memo = checkMemo(transaction);

        const arbEmbed = tradeEmbed({
          signature,
          solBalance: transaction.meta.postBalances[0] / LAMPORTS_PER_SOL,
          solPrice,
          wSolBalance: transaction.meta.postTokenBalances?.find(
            (balance) => balance.mint === NATIVE_MINT.toString()
          )?.uiTokenAmount.uiAmount as number,
          solProfit:
            typeof arbProfit === 'object' ? arbProfit.solProfit : undefined,
          usdcBalance: transaction.meta.postTokenBalances?.find(
            (balance) => balance.mint === BASE_MINTS.usdc
          )?.uiTokenAmount.uiAmount as number,
          usdcProfit:
            typeof arbProfit === 'object' ? arbProfit.usdcProfit : undefined,
          tradeTime: new Date(
            transaction.blockTime! * 1000
          ).toLocaleTimeString(),
          block: transaction.slot,
          provider,
          isFlashLoan,
          memo
        });

        await sendTradeNotification(await arbEmbed, channel);
        processedSignatures.add(signature);
      } else return;
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
  if (!transaction?.meta) return false;

  const allInstructions = getAllInstructions(transaction);

  // Get unique program IDs
  const programIds = allInstructions
    .map((ix) => ix.programId.toString())
    .filter((value, index, self) => self.indexOf(value) === index);

  // Check for DEX interactions
  const isSMBArb = programIds.includes(SMB_PROGRAM_ID);

  return isSMBArb && transaction.meta.err === null;
};

export const calculateArbProfit = async (
  transaction: ParsedTransactionWithMeta,
  reimbursement: number | undefined,
  solPrice: number | undefined
) => {
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
    )?.uiTokenAmount.amount
  );
  const postUSDCBalance = Number(
    transaction.meta?.postTokenBalances?.find(
      (balance) => balance.mint === BASE_MINTS.usdc
    )?.uiTokenAmount.amount
  );

  if (
    initialUSDCBalance === postUSDCBalance ||
    !initialUSDCBalance ||
    !postUSDCBalance
  )
    return {
      solProfit:
        postSolBalance / LAMPORTS_PER_SOL +
        postWrappedSolBalance / LAMPORTS_PER_SOL -
        (initialSolBalance / LAMPORTS_PER_SOL +
          initialWrappedSolBalance / LAMPORTS_PER_SOL) +
        (reimbursement ? reimbursement : 0.000995),
      usdcProfit: 0
    };
  else {
    const usdcDifference = (postUSDCBalance - initialUSDCBalance) / 1_000_000;
    const solSpent = (initialSolBalance - postSolBalance) / LAMPORTS_PER_SOL;
    const solSpentInUsd = solPrice ? solSpent * solPrice : 0;
    const reimbursementInUsd =
      solPrice !== undefined && reimbursement !== undefined
        ? reimbursement * solPrice
        : 0.000995 * (solPrice ?? 1);

    return {
      solProfit: 0,
      usdcProfit: usdcDifference - solSpentInUsd + reimbursementInUsd
    };
  }
};

export const getArbProvider = (
  transaction: ParsedTransactionWithMeta
): ProviderName | undefined => {
  const instructions = getAllInstructions(transaction);

  for (const [provider, details] of Object.entries(PROVIDERS)) {
    const providerAccounts = details.accounts;

    if (
      instructions.some((ix) => {
        if ('parsed' in ix && ix.parsed.type === 'transfer') {
          const { destination } = ix.parsed.info;
          return providerAccounts.has(destination);
        }
        return false;
      })
    )
      return provider as ProviderName;
  }
};

export const checkIsFlashLoan = (transaction: ParsedTransactionWithMeta) => {
  const instructions = getAllInstructions(transaction);

  return instructions.some(
    (ix) => ix.programId.toBase58() == KAMINO_PROGRAM_ID
  );
};

export const checkMemo = (transaction: ParsedTransactionWithMeta) => {
  const instructions = getAllInstructions(transaction);

  const memoInstruction = instructions.find(
    (ix) => 'parsed' in ix && ix.programId.toBase58() == MEMO_PROGRAM_ID
  ) as ParsedInstruction;

  if (memoInstruction) {
    return memoInstruction.parsed;
  }
};

export const isUsingSeperateTipTransaction = async (
  arbTransaction: ParsedTransactionWithMeta,
  trackedWallet: string
) => {
  const innerInstructions = getAllInstructions(arbTransaction);
  const tipInstructions = innerInstructions.filter(
    (ix) =>
      'parsed' in ix &&
      ix.parsed.type == 'transfer' &&
      ix.parsed.info.source == trackedWallet
  );

  if (!tipInstructions.length) return { isSeperateTip: false };

  for (const tipInstruction of tipInstructions) {
    const tipWalletAddress = (tipInstruction as ParsedInstruction).parsed.info
      .destination;
    const tipWallet = new PublicKey(tipWalletAddress);

    const tipWalletSignatures =
      await connection.getSignaturesForAddress(tipWallet);

    if (!tipWalletSignatures.length) continue;

    for (const signature of tipWalletSignatures) {
      if (signature.err || !signature.signature) continue;

      const transaction = await connection.getParsedTransaction(
        signature.signature,
        { maxSupportedTransactionVersion: 0, commitment: 'finalized' }
      );
      if (!transaction) continue;

      const instructions = getAllInstructions(transaction);

      const tip = instructions.find(
        (ix) =>
          'parsed' in ix &&
          ix.parsed.type == 'transfer' &&
          ix.parsed.info.source == tipWalletAddress &&
          ix.parsed.info.destination == trackedWallet
      );

      if (tip) {
        const tipAmount = Number(
          (tipInstruction as ParsedInstruction).parsed.info.lamports
        );

        return {
          isSeperateTip: true,
          tipAmount: tipAmount / LAMPORTS_PER_SOL
        };
      }
    }
  }
};

export const formatSolscanTransactionUrl = (signature: string) =>
  `<https://solscan.io/tx/${signature}>`;
