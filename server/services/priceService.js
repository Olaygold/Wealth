const axios = require('axios');
const WebSocket = require('ws');

class PriceService {
  constructor() {
    this.currentPrice = null;
    this.priceHistory = [];
    this.ws = null;
    this.reconnectTimeout = null;
    this.maxHistoryLength = 100;
    this.io = null;
  }

  // Start price tracking
  startPriceTracking(io) {
    this.io = io;
    console.log('📊 Starting BTC price tracking...');
    
    // Get initial price via REST API
    this.getCurrentPrice();
    
    // Start WebSocket connection for real-time updates
    this.connectWebSocket();
    
    // Fallback: Poll every 5 seconds if WebSocket fails
    setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.getCurrentPrice();
      }
    }, 5000);
  }

  // Get current BTC price via REST API
  async getCurrentPrice() {
    try {
      const response = await axios.get(
        `${process.env.BINANCE_API_URL}/ticker/price`,
        { params: { symbol: 'BTCUSDT' } }
      );

      const price = parseFloat(response.data.price);
      this.updatePrice(price);
      return price;
    } catch (error) {
      console.error('❌ Error fetching BTC price:', error.message);
      return this.currentPrice; // Return last known price
    }
  }

  // Connect to Binance WebSocket for real-time price
  connectWebSocket() {
    const wsUrl = 'wss://stream.binance.com:9443/ws/btcusdt@trade';
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('✅ Connected to Binance WebSocket');
      });

      this.ws.on('message', (data) => {
        try {
          const trade = JSON.parse(data);
          const price = parseFloat(trade.p);
          this.updatePrice(price);
        } catch (error) {
          console.error('❌ Error parsing WebSocket data:', error.message);
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
      });

      this.ws.on('close', () => {
        console.log('❌ WebSocket connection closed. Reconnecting...');
        this.reconnect();
      });

    } catch (error) {
      console.error('❌ Error connecting to WebSocket:', error.message);
      this.reconnect();
    }
  }

  // Reconnect WebSocket
  reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('🔄 Attempting to reconnect WebSocket...');
      this.connectWebSocket();
    }, 5000); // Reconnect after 5 seconds
  }

  // Update price and broadcast
  updatePrice(price) {
    const timestamp = new Date();
    
    this.currentPrice = price;
    
    // Add to price history
    this.priceHistory.push({
      price,
      timestamp
    });

    // Keep only last N prices
    if (this.priceHistory.length > this.maxHistoryLength) {
      this.priceHistory.shift();
    }

    // Broadcast to all connected clients
    if (this.io) {
      this.io.emit('price_update', {
        price: this.currentPrice,
        timestamp,
        change24h: this.get24hChange()
      });
    }
  }

  // Get 24h price change percentage
  async get24hChange() {
    try {
      const response = await axios.get(
        `${process.env.BINANCE_API_URL}/ticker/24hr`,
        { params: { symbol: 'BTCUSDT' } }
      );

      return {
        change: parseFloat(response.data.priceChange),
        changePercent: parseFloat(response.data.priceChangePercent),
        high: parseFloat(response.data.highPrice),
        low: parseFloat(response.data.lowPrice),
        volume: parseFloat(response.data.volume)
      };
    } catch (error) {
      console.error('❌ Error fetching 24h stats:', error.message);
      return null;
    }
  }

  // Get price at specific time (for round start/end)
  getPriceAtTime(time) {
    // Find closest price to the given time
    const targetTime = new Date(time).getTime();
    
    let closest = this.priceHistory[0];
    let minDiff = Math.abs(new Date(closest?.timestamp).getTime() - targetTime);

    for (let i = 1; i < this.priceHistory.length; i++) {
      const diff = Math.abs(new Date(this.priceHistory[i].timestamp).getTime() - targetTime);
      if (diff < minDiff) {
        closest = this.priceHistory[i];
        minDiff = diff;
      }
    }

    return closest?.price || this.currentPrice;
  }

  // Get current price (synchronous)
  getPrice() {
    return this.currentPrice;
  }

  // Get price history
  getHistory(limit = 50) {
    return this.priceHistory.slice(-limit);
  }

  // Clean up
  cleanup() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }
}

// Export singleton instance
const priceService = new PriceService();
module.exports = priceService;
