
const axios = require('axios');

class PriceService {
  constructor() {
    this.currentPrice = 0.00; // Default starting price
    this.priceHistory = [];
    this.maxHistoryLength = 120; // Keep 10 minutes of history (at 5-second intervals)
    this.io = null;
    this.priceInterval = null;
  }

  // Start price tracking with Socket.IO
  startPriceTracking(io) {
    this.io = io;
    console.log('📊 Starting LIVE BTC price tracking...');
    
    // Get initial price immediately
    this.fetchAndUpdatePrice();
    
    // Update price every 5 seconds for smooth chart
    this.priceInterval = setInterval(() => {
      this.fetchAndUpdatePrice();
    }, 5000);
  }

  // Fetch and update price from API
  async fetchAndUpdatePrice() {
    try {
      const price = await this.fetchRealPrice();
      
      if (price && price > 0) {
        this.updatePrice(price);
        console.log(`✅ Live BTC Price: $${price.toFixed(2)}`);
        return price;
      } else {
        throw new Error('Invalid price received');
      }
      
    } catch (error) {
      console.error('❌ Price fetch error:', error.message);
      // Keep using last known price instead of simulated
      return this.currentPrice;
    }
  }

  // Fetch real BTC price from RELIABLE sources with proper headers
  async fetchRealPrice() {
    const apis = [
      // 1. Coinbase API (Most reliable, no API key needed)
      async () => {
        const res = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', {
          timeout: 8000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        return parseFloat(res.data.data.amount);
      },

      // 2. Kraken API (Very reliable)
      async () => {
        const res = await axios.get('https://api.kraken.com/0/public/Ticker?pair=XBTUSD', {
          timeout: 8000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        });
        const price = res.data.result.XXBTZUSD.c[0];
        return parseFloat(price);
      },

      // 3. Blockchain.com API (Always works)
      async () => {
        const res = await axios.get('https://blockchain.info/ticker', {
          timeout: 8000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        });
        return parseFloat(res.data.USD.last);
      },

      // 4. CoinGecko API (Good backup)
      async () => {
        const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
          timeout: 8000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        });
        return parseFloat(res.data.bitcoin.usd);
      },

      // 5. Binance with proper headers (less likely to be blocked)
      async () => {
        const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
          timeout: 8000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
          }
        });
        return parseFloat(res.data.price);
      },

      // 6. Bitstamp API (European exchange, very stable)
      async () => {
        const res = await axios.get('https://www.bitstamp.net/api/v2/ticker/btcusd/', {
          timeout: 8000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        });
        return parseFloat(res.data.last);
      },

      // 7. Gemini API (Regulated US exchange)
      async () => {
        const res = await axios.get('https://api.gemini.com/v1/pubticker/btcusd', {
          timeout: 8000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        });
        return parseFloat(res.data.last);
      }
    ];

    // Try each API in order until one works
    for (let i = 0; i < apis.length; i++) {
      try {
        const price = await apis[i]();
        if (price && price > 10000 && price < 200000) { // Sanity check for valid BTC price
          console.log(`✅ Price fetched from API #${i + 1}: $${price.toFixed(2)}`);
          return price;
        }
      } catch (err) {
        console.log(`⚠️ API #${i + 1} failed, trying next...`);
        continue; // Try next API
      }
    }

    throw new Error('All price APIs failed');
  }

  // Update price and broadcast
  updatePrice(price) {
    const timestamp = new Date();
    
    // Round to 2 decimal places
    this.currentPrice = Math.round(price * 100) / 100;
    
    // Add to history
    this.priceHistory.push({
      price: this.currentPrice,
      timestamp
    });

    // Keep only recent history
    if (this.priceHistory.length > this.maxHistoryLength) {
      this.priceHistory.shift();
    }

    // Broadcast to all connected clients via Socket.IO
    if (this.io) {
      this.io.emit('price_update', {
        price: this.currentPrice,
        timestamp: timestamp.toISOString()
      });
    }
  }

  // Get current price
  getPrice() {
    return parseFloat(this.currentPrice.toFixed(2));
  }

  // Get price at specific time (for round start/end)
  getPriceAtTime(time) {
    const targetTime = new Date(time).getTime();
    
    if (this.priceHistory.length === 0) {
      return this.currentPrice;
    }
    
    // Find closest price to target time
    let closest = this.priceHistory[0];
    let minDiff = Math.abs(new Date(closest.timestamp).getTime() - targetTime);

    for (let i = 1; i < this.priceHistory.length; i++) {
      const diff = Math.abs(new Date(this.priceHistory[i].timestamp).getTime() - targetTime);
      if (diff < minDiff) {
        closest = this.priceHistory[i];
        minDiff = diff;
      }
    }

    return parseFloat(closest.price.toFixed(2));
  }

  // Get price history
  getHistory(limit = 60) {
    return this.priceHistory.slice(-limit).map(item => ({
      price: parseFloat(item.price.toFixed(2)),
      timestamp: item.timestamp
    }));
  }

  // Cleanup on server shutdown
  cleanup() {
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
      console.log('📊 Price tracking stopped');
    }
  }
}

// Export singleton instance
const priceService = new PriceService();
module.exports = priceService;
