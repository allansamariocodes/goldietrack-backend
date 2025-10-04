// backend/api/cron/update-prices.js
// This runs automatically at 5 PM and 11:30 PM IST every day

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_URL;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async (req, res) => {
  // Security: Verify request is from Vercel Cron or authorized source
  const authHeader = req.headers.authorization;
  
  // Vercel Cron sends no auth header, but we can check for manual triggers
  if (authHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized' 
    });
  }

  try {
    console.log('🕐 Cron job started - Fetching fresh prices...');
    
    // Fetch prices from goldprice.org (free, no API key needed)
    const response = await fetch('https://data-asg.goldprice.org/dbXRates/INR');
    
    if (!response.ok) {
      throw new Error(`goldprice.org API returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Convert from troy ounce to grams
    const GRAMS_PER_TROY_OUNCE = 31.1035;
    const goldPerGram = data.items[0].xauPrice / GRAMS_PER_TROY_OUNCE;
    const silverPerGram = data.items[0].xagPrice / GRAMS_PER_TROY_OUNCE;
    
    // Validate prices are reasonable
    if (goldPerGram <= 0 || silverPerGram <= 0 || 
        goldPerGram > 100000 || silverPerGram > 10000) {
      throw new Error('Prices out of reasonable range');
    }
    
    // Prepare data to store
    const priceData = {
      prices: {
        goldInrPerGram: Math.round(goldPerGram * 100) / 100,
        silverInrPerGram: Math.round(silverPerGram * 100) / 100
      },
      lastUpdated: new Date().toISOString(),
      nextUpdate: getNextUpdateTime(),
      updateCount: (await getUpdateCount()) + 1
    };
    
    // Store in Redis
    await storePrices(priceData);
    
    console.log('✅ Prices updated successfully:', priceData);
    
    return res.status(200).json({
      success: true,
      message: 'Prices updated successfully',
      data: priceData
    });
    
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Store prices in Redis
async function storePrices(priceData) {
  if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) {
    throw new Error('Redis credentials not configured in environment variables');
  }

  const response = await fetch(`${UPSTASH_REDIS_URL}/set/metal_prices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      value: JSON.stringify(priceData),
      ex: 86400 // Expire after 24 hours (safety net)
    })
  });

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Redis error: ${result.error}`);
  }
  
  return result;
}

// Get current update count
async function getUpdateCount() {
  try {
    const response = await fetch(`${UPSTASH_REDIS_URL}/get/metal_prices`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`
      }
    });
    const data = await response.json();
    if (data.result) {
      const parsed = JSON.parse(data.result);
      return parsed.updateCount || 0;
    }
  } catch (error) {
    console.error('Error getting update count:', error);
  }
  return 0;
}

// Calculate next update time (5 PM or 11:30 PM IST)
function getNextUpdateTime() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const today5pm = new Date(ist);
  today5pm.setHours(17, 0, 0, 0);
  
  const today1130pm = new Date(ist);
  today1130pm.setHours(23, 30, 0, 0);
  
  const tomorrow5pm = new Date(ist);
  tomorrow5pm.setDate(tomorrow5pm.getDate() + 1);
  tomorrow5pm.setHours(17, 0, 0, 0);
  
  if (ist < today5pm) return today5pm.toISOString();
  if (ist < today1130pm) return today1130pm.toISOString();
  return tomorrow5pm.toISOString();
}