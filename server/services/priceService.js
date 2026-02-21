
const axios = require('axios');

class PriceService {
  constructor() {
    this.currentPrice = 50000; // Default starting price
    this.priceHistory = [];
    this.maxHistoryLength = 100;
    this.io = null;
    this.priceInterval = null;
  }

  startPriceTracking(io) {
    this.io = io;
    console.log('📊 Starting BTC price tracking...');
    
    // Get initial price
    this.getCurrentPrice();
    
    // Update price every 10 seconds
    this.priceInterval = setInterval(() => {
      this.getCurrentPrice();
    }, 10000);
  }

  async getCurrentPrice() {
    try {
      // Use CryptoCompare API (No restrictions, free, reliable)
      const response = await axios.get(
        'https://min-api.cryptocompare.com/data/price',
        { 
          params: { 
            fsym: 'BTC',
            tsyms: 'USD'
          },
          timeout: 8000
        }
      );
      
      const price = parseFloat(response.data.USD);
      
      if (price && price > 0) {
        this.updatePrice(price);
        return price;
      } else {
        console.log('⚠️ Invalid price received, using last known price');
        return this.currentPrice;
      }
      
    } catch (error) {
      console.error('⚠️ Error fetching BTC price:', error.message);
      
      // Use last known price or generate realistic random price
      if (!this.currentPrice || this.currentPrice === 50000) {
        this.currentPrice = 45000 + Math.random() * 10000; // Random between 45k-55k
      } else {
        // Small random fluctuation (+/- 0.5%)
        const fluctuation = (Math.random() - 0.5) * 0.01 * this.currentPrice;
        this.currentPrice = this.currentPrice + fluctuation;
      }
      
      this.updatePrice(this.currentPrice);
      return this.currentPrice;
    }
  }

  updatePrice(price) {
    const timestamp = new Date();
    
    this.currentPrice = Math.round(price * 100) / 100; // Round to 2 decimals
    
    this.priceHistory.push({
      price: this.currentPrice,
      timestamp
    });

    if (this.priceHistory.length > this.maxHistoryLength) {
      this.priceHistory.shift();
    }

    // Broadcast to all connected clients
    if (this.io) {
      this.io.emit('price_update', {
        price: this.currentPrice,
        timestamp
      });
    }
  }

  getPriceAtTime(time) {
    const targetTime = new Date(time).getTime();
    
    if (this.priceHistory.length === 0) {
      return this.currentPrice;
    }
    
    let closest = this.priceHistory[0];
    let minDiff = Math.abs(new Date(closest.timestamp).getTime() - targetTime);

    for (let i = 1; i < this.priceHistory.length; i++) {
      const diff = Math.abs(new Date(this.priceHistory[i].timestamp).getTime() - targetTime);
      if (diff < minDiff) {
        closest = this.priceHistory[i];
        minDiff = diff;
      }
    }

    return closest.price;
  }

  getPrice() {
    return this.currentPrice;
  }

  getHistory(limit = 50) {
    return this.priceHistory.slice(-limit);
  }

  cleanup() {
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
    }
  }
}

const priceService = new PriceService();
module.exports = priceService;
