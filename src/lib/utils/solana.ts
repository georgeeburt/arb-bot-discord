import { Connection, clusterApiUrl } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl('mainnet-beta'), {
  commitment: 'confirmed',
  wsEndpoint: clusterApiUrl('mainnet-beta').replace('https', 'wss')
});

export default connection;
