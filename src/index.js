import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { client } from './bot';
import dotenv from 'dotenv';

dotenv.config();

// Watched DEX Programs
const DEX_PROGRAM_IDS = {
  JUPITER: 'JUP6ivLEzfRyir16JMq1o1w8WywjYsFnE6HAx5TyZnd',
  JUPITER_V6: 'JUP6LiYdsyVJBTY7S4XxNBHf6Xwr9xjvLNwubLp6jZB',
  RAYDIUM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  ORCA: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  METEORA: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  SERUM: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  LIFINITY: '2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c'
};

const connection = new Connection(clusterApiUrl('mainnet-beta'), {
  commitment: 'confirmed',
  wsEndpoint: clusterApiUrl('mainnet-beta').replace('https', 'wss')
});

let lastSignature = null;

const getAllInstructions = transaction => {
  let instructions = [];

  // Add main instructions
  if (transaction.transaction?.message?.instructions) {
    instructions.push(...transaction.transaction.message.instructions);
  }

  // Add inner instructions
  if (transaction.meta?.innerInstructions) {
    transaction.meta.innerInstructions.forEach(inner => {
      instructions.push(...inner.instructions);
    });
  }

  return instructions;
};

const checkIfArbTrade = transaction => {
  if (!transaction?.meta) {
    console.log('No transaction metadata found');
    return false;
  }

  const allInstructions = getAllInstructions(transaction);

  // Get unique program IDs
  const programIds = allInstructions
    .map(ix => ix.programId.toString())
    .filter((value, index, self) => self.indexOf(value) === index);

  console.log('All program IDs found:', programIds);

  // Check for DEX interactions
  const dexInteractions = programIds.filter(id =>
    Object.values(DEX_PROGRAM_IDS).includes(id)
  );

  console.log('DEX interactions found:', dexInteractions);

  if (dexInteractions.length > 0) {
    return true;
  }

  return false;
};

const formatTradeDetails = (transaction, signature) => {
  const solscanUrl = `https://solscan.io/tx/${signature}`;
  const allInstructions = getAllInstructions(transaction);
  const programIds = allInstructions.map(ix => ix.programId);

  if (programIds.includes(DEX_PROGRAM_IDS.JUPITER_V6)) {
    dexesUsed.push('JUPITER_ROUTE');
  }

  return `
🔍 **Transaction Details**
└ [View on Solscan](${solscanUrl})

⚡️ **Timing**
└ Block: \`${transaction.slot}\`
└ Time: \`${new Date(transaction.blockTime * 1000).toLocaleString()}\`
`;
};

const sendTradeNotification = async tradeDetails => {
  try {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID);
    if (!channel) {
      console.error('Discord channel not found!');
      return;
    }

    await channel.send({
      content: `🚨 **Arbitrage Trade Detected!** 🚨\n${tradeDetails}`,
      allowedMentions: { parse: [] }
    });
    console.log('Trade notification sent successfully');
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

const monitorTrades = async () => {
  const publicKey = new PublicKey(process.env.WALLET_ADDRESS);
  console.log('Starting trade monitoring for address:', WALLET_ADDRESS);

  try {
    connection.onAccountChange(publicKey, async accountInfo => {
      try {
        const signatures = await connection.getSignaturesForAddress(publicKey, {
          limit: 1
        });

        if (!signatures.length || signatures[0].signature === lastSignature) {
          return;
        }

        lastSignature = signatures[0].signature;
        console.log(`\nProcessing new transaction: ${lastSignature}`);

        const transaction = await connection.getParsedTransaction(
          lastSignature,
          {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          }
        );

        if (!transaction) {
          console.log(`No transaction data found for ${lastSignature}`);
          return;
        }

        const isArb = checkIfArbTrade(transaction);
        console.log(`Is arbitrage: ${isArb}`);

        if (isArb) {
          const tradeDetails = formatTradeDetails(transaction, lastSignature);
          await sendTradeNotification(tradeDetails);
        }
      } catch (error) {
        console.error('Error processing transaction:', error);
      }
    });
  } catch (error) {
    console.error('Error setting up account monitoring:', error);
    setTimeout(() => monitorTrades(), 5000);
  }
};

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  monitorTrades().catch(error => {
    console.error('Error in monitorTrades:', error);
    process.exit(1);
  });
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);
