import logger from '../utils/logger.js';

const fetchSolPrice = async () => {
  try {
    const response = await fetch(
      'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDC'
    );
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    logger.error(`Error fetching Solana price: ${error}`);
  }
};

export default fetchSolPrice;
