
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
    this.useBackupAPI = false; // Flag to use backup API
  }

  startPriceTracking(io) {
    this.io = io;
    console.log('📊 Starting BTC price tracking...');
    
    // Get initial price via REST API
    this.getCurrentPrice();
    
    // Start WebSocket connection for real-time updates
    this.connectWebSocket();
    
    // Fallback: Poll every 5 seconds
    setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.getCurrentPrice();
      }
    }, 5000);
  }

  async getCurrentPrice() {
    try {
      let price;

      if (!this.useBackupAPI) {
        // Try Binance first
        try {
          const response = await axios.get(
            `${process.env.BINANCE_API_URL}/ticker/price`,
            { 
              params: { symbol: 'BTCUSDT' },
              timeout: 5000 
            }
          );
          price = parseFloat(response.data.price);
        } catch (binanceError) {
          console.log('⚠️ Binance API unavailable, switching to CoinGecko...');
          this.useBackupAPI = true;
          throw binanceError;
        }
      }

      if (this.useBackupAPI) {
        // Use CoinGecko as backup (no geo-restrictions)
        const response = await axios.get(
          'https://api.coingecko.com/api/v3/simple/price',
          { 
            params: { 
              ids: 'bitcoin', 
              vs_currencies: 'usd' 
            },
            timeout: 5000 
          }
        );
        price = parseFloat(response.data.bitcoin.usd);
      }

      this.updatePrice(price);
      return price;
    } catch (error) {
      console.error('❌ Error fetching BTC price:', error.message);
      
      // Return last known price if available
      if (this.currentPrice) {
        return this.currentPrice;
      }
      
      // Fallback to a default price if no price available yet
      console.log('⚠️ Using fallback price: $45000');
      this.updatePrice(45000);
      return 45000;
    }
  }

  connectWebSocket() {
    // Try Binance WebSocket only if not using backup API
    if (this.useBackupAPI) {
      console.log('📡 Using polling mode (CoinGecko API)');
      return;
    }

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
        console.log('⚠️ Switching to backup API (CoinGecko)...');
        this.useBackupAPI = true;
      });

      this.ws.on('close', () => {
        console.log('❌ WebSocket connection closed.');
        if (!this.useBackupAPI) {
          console.log('🔄 Attempting to reconnect WebSocket...');
          this.reconnect();
        }
      });

    } catch (error) {
      console.error('❌ Error connecting to WebSocket:', error.message);
      console.log('⚠️ Switching to backup API (CoinGecko)...');
      this.useBackupAPI = true;
    }
  }

  reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      if (!this.useBackupAPI) {
        console.log('🔄 Attempting to reconnect WebSocket...');
        this.connectWebSocket();
      }
    }, 5000);
  }

  updatePrice(price) {
    const timestamp = new Date();
    
    this.currentPrice = price;
    
    this.priceHistory.push({
      price,
      timestamp
    });

    if (this.priceHistory.length > this.maxHistoryLength) {
      this.priceHistory.shift();
    }

    if (this.io) {
      this.io.emit('price_update', {
        price: this.currentPrice,
        timestamp,
        change24h: null // We can add this later
      });
    }
  }

  async get24hChange() {
    try {
      if (this.useBackupAPI) {
        // CoinGecko doesn't provide 24h data easily, skip for now
        return null;
      }

      const response = await axios.get(
        `${process.env.BINANCE_API_URL}/ticker/24hr`,
        { params: { symbol: 'BTCUSDT' }, timeout: 5000 }
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

  getPriceAtTime(time) {
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

  getPrice() {
    return this.currentPrice || 45000; // Default fallback
  }

  getHistory(limit = 50) {
    return this.priceHistory.slice(-limit);
  }

  cleanup() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }
}

const priceService = new PriceService();
module.exports = priceService;
