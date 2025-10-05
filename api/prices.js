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
    
    if (cachedPrices && cachedPrices.prices) {
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

    if (!response.ok) {
      console.error('Redis response not OK:', response.status);
      return null;
    }

    const data = await response.json();
    
    console.log('Redis response:', JSON.stringify(data, null, 2));
    
    // Upstash returns { result: "stringified_json" } or { result: null }
    if (data.result && data.result !== null) {
      try {
        const parsed = JSON.parse(data.result);
        console.log('Parsed data:', JSON.stringify(parsed, null, 2));
        
        // Check if the parsed data has a 'value' property (double-stringified)
        if (parsed.value && typeof parsed.value === 'string') {
          const finalData = JSON.parse(parsed.value);
          console.log('Final data:', JSON.stringify(finalData, null, 2));
          return finalData;
        }
        
        return parsed;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return null;
      }
    }
    
    console.log('No result in Redis response');
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