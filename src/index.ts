import { getAssociatedTokenAddress, NATIVE_MINT } from '@solana/spl-token';
import { DEX_PROGRAM_IDS } from './lib/constants/dex-program-constants.js';
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta
} from '@solana/web3.js';
import { client } from './bot.js';
import logger from './lib/utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const WALLET_ADDRESS = process.env.WALLET_ADDRESS;

const connection = new Connection(clusterApiUrl('mainnet-beta'), {
  commitment: 'confirmed',
  wsEndpoint: clusterApiUrl('mainnet-beta').replace('https', 'wss')
});

let lastSignature: null | string = null;

const getAllInstructions = (transaction: ParsedTransactionWithMeta) => {
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

const checkIfArbTrade = (transaction: ParsedTransactionWithMeta) => {
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

const formatTradeDetails = async (
  transaction: ParsedTransactionWithMeta,
  signature: string
) => {
  const solscanUrl = `<https://solscan.io/tx/${signature}>`;
  const publicKey = new PublicKey(WALLET_ADDRESS as string);
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

  return `
🔍 **Transaction Details**
└ [View on Solscan](${solscanUrl})

💸 **Account Details**
└ Wallet Balance for Trades: \`${(wrappedSolBalance / LAMPORTS_PER_SOL).toFixed(3)} wSOL\`
└ Wallet Balance for Gas: \`${((await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL).toFixed(3)} SOL\`

⚡️ **Timing**
└ Block: \`${transaction.slot}\`
└ Time: ${transaction.blockTime ? new Date(transaction.blockTime * 1000).toLocaleString() : 'N/A'}\`
`;
};

const sendTradeNotification = async (tradeDetails: string) => {
  try {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID as string);
    if (!channel) {
      logger.fatal('Discord channel not found!');
      return;
    }
    if (channel.isTextBased() && 'send' in channel) {
      await channel.send({
        content: `🚨 **Arbitrage Trade Detected!** 🚨\n${tradeDetails}`,
        allowedMentions: { parse: [] }
      });
    }
    logger.info('Trade notification sent successfully');
  } catch (error) {
    logger.error(`Failed to send notification: ${error}`);
  }
};

const monitorTrades = async () => {
  const publicKey = new PublicKey(WALLET_ADDRESS as string);
  logger.info(`Starting trade monitoring for address: ${WALLET_ADDRESS}`);

  try {
    connection.onAccountChange(publicKey, async () => {
      try {
        const signatures = await connection.getSignaturesForAddress(publicKey, {
          limit: 1
        });

        if (!signatures.length || signatures[0].signature === lastSignature) {
          return;
        }

        lastSignature = signatures[0].signature;
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
          const tradeDetails = await formatTradeDetails(
            transaction,
            lastSignature
          );
          await sendTradeNotification(tradeDetails);
        }
      } catch (error) {
        logger.error(`Error processing transaction: ${error}`);
      }
    });
  } catch (error) {
    logger.error(`Error setting up account monitoring: ${error}`);
    setTimeout(() => monitorTrades(), 5000);
  }
};

client.once('ready', () => {
  logger.info(`Bot logged in as ${client.user?.tag}`);
  monitorTrades().catch((error) => {
    logger.error(`Error in monitorTrades: ${error}`);
    process.exit(1);
  });
});

process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled promise rejection: ${error}`);
});

client.login(process.env.DISCORD_TOKEN);
