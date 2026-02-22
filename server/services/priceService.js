
const axios = require('axios');

class PriceService {
  constructor() {
    this.currentPrice = 43250.00; // Default starting price
    this.priceHistory = [];
    this.maxHistoryLength = 120; // Keep 10 minutes of history (at 5-second intervals)
    this.io = null;
    this.priceInterval = null;
    this.apiErrors = 0;
    this.maxApiErrors = 3;
  }

  // Start price tracking with Socket.IO
  startPriceTracking(io) {
    this.io = io;
    console.log('📊 Starting BTC price tracking...');
    
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
      // Try multiple APIs for reliability
      const price = await this.fetchRealPrice();
      
      if (price && price > 0) {
        this.apiErrors = 0; // Reset error counter on success
        this.updatePrice(price);
        return price;
      } else {
        throw new Error('Invalid price received');
      }
      
    } catch (error) {
      this.apiErrors++;
      
      if (this.apiErrors <= this.maxApiErrors) {
        console.error(`⚠️ API Error (${this.apiErrors}/${this.maxApiErrors}):`, error.message);
      }
      
      // Fallback to simulated price if too many errors
      if (this.apiErrors > this.maxApiErrors) {
        if (this.apiErrors === this.maxApiErrors + 1) {
          console.log('⚠️ Too many API errors. Switching to simulated price mode...');
        }
        this.generateSimulatedPrice();
      }
      
      return this.currentPrice;
    }
  }

  // Fetch real BTC price from multiple sources
  async fetchRealPrice() {
    const apis = [
      // Binance API (most reliable)
      async () => {
        const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
          timeout: 5000
        });
        return parseFloat(res.data.price);
      },
      
      // CoinGecko API (backup)
      async () => {
        const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
          timeout: 5000
        });
        return parseFloat(res.data.bitcoin.usd);
      },
      
      // CryptoCompare API (backup 2)
      async () => {
        const res = await axios.get('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD', {
          timeout: 5000
        });
        return parseFloat(res.data.USD);
      }
    ];

    // Try each API in order
    for (const fetchFn of apis) {
      try {
        const price = await fetchFn();
        if (price && price > 0) {
          return price;
        }
      } catch (err) {
        continue; // Try next API
      }
    }

    throw new Error('All price APIs failed');
  }

  // Generate realistic simulated price movement
  generateSimulatedPrice() {
    // Realistic BTC price range: $40,000 - $50,000
    if (!this.currentPrice || this.currentPrice < 40000 || this.currentPrice > 50000) {
      this.currentPrice = 43000 + Math.random() * 7000;
    }

    // Simulate realistic price movement (±0.1% per 5 seconds)
    const maxChange = this.currentPrice * 0.001; // 0.1% max change
    const change = (Math.random() - 0.5) * maxChange * 2;
    
    this.currentPrice = Math.max(40000, Math.min(50000, this.currentPrice + change));
    
    this.updatePrice(this.currentPrice);
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
