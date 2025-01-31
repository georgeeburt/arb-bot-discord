import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
dotenv.config();

const connection = new Connection(process.env.RPC_ENDPOINT as string, {
  commitment: 'confirmed',
  wsEndpoint: process.env.RPC_WSS_ENDPOINT
});

export default connection;
