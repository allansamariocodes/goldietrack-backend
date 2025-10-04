// backend/api/prices.js
// Main endpoint that users call to get prices

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_URL;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN;

module.exports = async (req, res) => {
  // Enable CORS for React Native app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get cached prices from Redis
    const cachedPrices = await getCachedPrices();
    
    if (cachedPrices) {
      return res.status(200).json({
        success: true,
        prices: cachedPrices.prices,
        lastUpdated: cachedPrices.lastUpdated,
        nextUpdate: cachedPrices.nextUpdate,
        source: 'cached'
      });
    }

    // No cached data available
    return res.status(503).json({
      success: false,
      error: 'Price data not available. Cron job may not have run yet. Please try again in a few minutes.',
      hint: 'First time setup? Manually trigger: /api/cron/update-prices'
    });

  } catch (error) {
    console.error('Error fetching prices:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper function to get prices from Redis
async function getCachedPrices() {
  if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) {
    console.error('Redis credentials not configured');
    return null;
  }

  try {
    const response = await fetch(`${UPSTASH_REDIS_URL}/get/metal_prices`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`
      }
    });

    const data = await response.json();
    
    if (data.result) {
      return JSON.parse(data.result);
    }
    
    return null;
  } catch (error) {
    console.error('Redis fetch error:', error);
    return null;
  }
}




// Helper: Calculate next update time
function getNextUpdateTime() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const today5pm = new Date(ist);
  today5pm.setHours(17, 0, 0, 0);
  
  const today11pm = new Date(ist);
  today11pm.setHours(23, 30, 0, 0);
  
  const tomorrow5pm = new Date(ist);
  tomorrow5pm.setDate(tomorrow5pm.getDate() + 1);
  tomorrow5pm.setHours(17, 0, 0, 0);
  
  if (ist < today5pm) return today5pm.toISOString();
  if (ist < today11pm) return today11pm.toISOString();
  return tomorrow5pm.toISOString();
}