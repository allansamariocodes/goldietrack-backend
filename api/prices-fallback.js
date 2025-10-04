// backend/api/prices-fallback.js
// Deploy to Vercel/Netlify - NO API KEY NEEDED
// Scrapes from public websites (use responsibly!)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Method 1: Use public gold price aggregators
    // goldprice.org has a public JSON endpoint
    const goldResponse = await fetch('https://data-asg.goldprice.org/dbXRates/INR');
    const goldData = await goldResponse.json();
    
    // They return price per troy ounce
    const GRAMS_PER_TROY_OUNCE = 31.1035;
    
    // Extract gold price (in INR per troy ounce)
    const goldPerTroyOz = goldData.items[0].xauPrice;
    const goldPerGram = goldPerTroyOz / GRAMS_PER_TROY_OUNCE;
    
    // Get silver price (they also provide XAG)
    const silverPerTroyOz = goldData.items[0].xagPrice;
    const silverPerGram = silverPerTroyOz / GRAMS_PER_TROY_OUNCE;

    // Validate prices
    if (
      !goldPerGram || 
      !silverPerGram || 
      goldPerGram <= 0 || 
      silverPerGram <= 0 ||
      goldPerGram > 100000 ||
      silverPerGram > 10000
    ) {
      throw new Error('Invalid price data received');
    }

    return res.status(200).json({
      success: true,
      timestamp: Date.now(),
      prices: {
        goldInrPerGram: Math.round(goldPerGram * 100) / 100,
        silverInrPerGram: Math.round(silverPerGram * 100) / 100
      },
      source: 'goldprice.org',
      note: 'Public data source - prices are approximate'
    });

  } catch (error) {
    console.error('Error fetching prices:', error);
    
    // Fallback: Return reasonable estimates (NOT FOR PRODUCTION!)
    // You could also return cached values here
    return res.status(200).json({
      success: true,
      timestamp: Date.now(),
      prices: {
        goldInrPerGram: 6500, // Approximate
        silverInrPerGram: 80   // Approximate
      },
      source: 'fallback',
      warning: 'Using fallback prices - fetch failed',
      error: error.message
    });
  }
};

// Alternative Method: Yahoo Finance (no key needed but may change)
async function fetchFromYahooFinance() {
  // Yahoo Finance query for gold and silver in INR
  const symbols = 'GC=F,SI=F'; // Gold and Silver futures
  const response = await fetch(
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`
  );
  
  const data = await response.json();
  const quotes = data.quoteResponse.result;
  
  // Convert from USD per troy ounce to INR per gram
  const usdToInr = 83; // You'd need to fetch this too
  const gramsPerOz = 31.1035;
  
  const goldPrice = quotes[0].regularMarketPrice * usdToInr / gramsPerOz;
  const silverPrice = quotes[1].regularMarketPrice * usdToInr / gramsPerOz;
  
  return { goldInrPerGram: goldPrice, silverInrPerGram: silverPrice };
}

// Best Practice: Implement smart caching
let priceCache = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 60 * 60 * 1000 // 1 hour
};

function getCachedPrices() {
  if (priceCache.data && 
      Date.now() - priceCache.timestamp < priceCache.CACHE_DURATION) {
    return priceCache.data;
  }
  return null;
}

function setPriceCache(data) {
  priceCache.data = data;
  priceCache.timestamp = Date.now();
}