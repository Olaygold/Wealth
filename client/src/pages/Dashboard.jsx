
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { createChart, ColorType } from 'lightweight-charts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet as WalletIcon,
  ChevronRight,
  ChevronLeft,
  Activity,
  AlertCircle,
  DollarSign,
  Timer,
  Trophy,
  HelpCircle,
  X,
  CheckCircle,
  Info,
  Zap,
  Target,
  Shield,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  Users,
  Gift,
  Share2,
  Sparkles,
  Star,
  ExternalLink,
  Lock,
  Play,
  Eye,
  History,
  BarChart3,
  TrendingUp as TrendUp,
  Flame,
  Snowflake,
  AlertTriangle,
  Percent,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  PieChart,
  LineChart,
  Award,
  Coins
} from 'lucide-react';

// ==================== HELPER FUNCTIONS ====================
const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const formatCurrency = (amount) => {
  return parseFloat(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

const formatTime = (seconds) => {
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatCompact = (num) => {
  if (num >= 1000000) return `${(num/1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num/1000).toFixed(1)}K`;
  return num.toString();
};

// ==================== PREDICTION HELPER - TREND ANALYZER ====================
const TrendAnalyzer = ({ priceHistory, currentPrice, startPrice }) => {
  const analysis = useMemo(() => {
    if (!priceHistory || priceHistory.length < 5) {
      return { trend: 'neutral', strength: 0, message: 'Waiting for data...' };
    }

    const recent = priceHistory.slice(-10);
    const prices = recent.map(p => parseFloat(p.price));
    
    // Calculate trend
    let upMoves = 0;
    let downMoves = 0;
    let totalChange = 0;

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i-1];
      totalChange += change;
      if (change > 0) upMoves++;
      else if (change < 0) downMoves++;
    }

    const changeFromStart = currentPrice - startPrice;
    const percentChange = startPrice > 0 ? (changeFromStart / startPrice) * 100 : 0;

    let trend = 'neutral';
    let strength = 0;
    let message = '';

    if (upMoves > downMoves + 2) {
      trend = 'up';
      strength = Math.min(100, (upMoves / prices.length) * 100);
      message = 'Price trending UP 📈';
    } else if (downMoves > upMoves + 2) {
      trend = 'down';
      strength = Math.min(100, (downMoves / prices.length) * 100);
      message = 'Price trending DOWN 📉';
    } else {
      trend = 'neutral';
      strength = 50;
      message = 'Price is sideways ↔️';
    }

    return { trend, strength, message, percentChange, upMoves, downMoves };
  }, [priceHistory, currentPrice, startPrice]);

  return (
    <div className="bg-slate-800/50 rounded-lg p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <LineChart size={10} /> Trend Analysis
        </span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          analysis.trend === 'up' ? 'bg-green-500/20 text-green-500' :
          analysis.trend === 'down' ? 'bg-red-500/20 text-red-500' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {analysis.message}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              analysis.trend === 'up' ? 'bg-green-500' :
              analysis.trend === 'down' ? 'bg-red-500' : 'bg-gray-500'
            }`}
            style={{ width: `${analysis.strength}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-400">
          {analysis.upMoves}↑ {analysis.downMoves}↓
        </span>
      </div>
    </div>
  );
};

// ==================== PREDICTION HELPER - POOL SENTIMENT ====================
const PoolSentiment = ({ totalUp, totalDown, upBets, downBets }) => {
  const total = totalUp + totalDown;
  const upPercent = total > 0 ? (totalUp / total) * 100 : 50;
  const downPercent = total > 0 ? (totalDown / total) * 100 : 50;
  
  const sentiment = useMemo(() => {
    if (total === 0) return { side: 'none', message: 'No bets yet - Be first!', icon: '🎯' };
    
    const diff = Math.abs(upPercent - downPercent);
    
    if (diff < 10) {
      return { side: 'balanced', message: 'Pool is balanced', icon: '⚖️' };
    } else if (upPercent > downPercent) {
      return { 
        side: 'up', 
        message: `${upPercent.toFixed(0)}% betting UP`,
        icon: '📈',
        hint: 'DOWN has better odds!'
      };
    } else {
      return { 
        side: 'down', 
        message: `${downPercent.toFixed(0)}% betting DOWN`,
        icon: '📉',
        hint: 'UP has better odds!'
      };
    }
  }, [upPercent, downPercent, total]);

  return (
    <div className="bg-slate-800/50 rounded-lg p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <PieChart size={10} /> Crowd Sentiment
        </span>
        <span className="text-[10px]">{sentiment.icon}</span>
      </div>
      
      <p className="text-xs text-white font-medium">{sentiment.message}</p>
      
      {sentiment.hint && (
        <p className="text-[10px] text-yellow-400 mt-0.5 flex items-center gap-1">
          <Zap size={8} /> {sentiment.hint}
        </p>
      )}

      <div className="flex gap-1 mt-1.5">
        <div className="flex-1 text-center bg-green-500/10 rounded py-0.5">
          <p className="text-[10px] text-green-500 font-bold">
            {upBets} UP
          </p>
        </div>
        <div className="flex-1 text-center bg-red-500/10 rounded py-0.5">
          <p className="text-[10px] text-red-500 font-bold">
            {downBets} DOWN
          </p>
        </div>
      </div>
    </div>
  );
};

// ==================== PREDICTION HELPER - RECENT RESULTS STREAK ====================
const RecentStreak = ({ previousRounds }) => {
  const streak = useMemo(() => {
    if (!previousRounds || previousRounds.length === 0) {
      return { type: 'none', count: 0, results: [] };
    }

    const results = previousRounds.slice(0, 5).map(r => r.result);
    let streakType = results[0];
    let streakCount = 0;

    for (const r of results) {
      if (r === streakType) streakCount++;
      else break;
    }

    const upCount = results.filter(r => r === 'up').length;
    const downCount = results.filter(r => r === 'down').length;

    return { 
      type: streakType, 
      count: streakCount, 
      results,
      upCount,
      downCount,
      isHotStreak: streakCount >= 3
    };
  }, [previousRounds]);

  if (streak.results.length === 0) return null;

  return (
    <div className="bg-slate-800/50 rounded-lg p-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <History size={10} /> Last 5 Results
        </span>
        {streak.isHotStreak && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
            streak.type === 'up' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
          }`}>
            <Flame size={8} /> {streak.count}x Streak!
          </span>
        )}
      </div>

      <div className="flex gap-1 mb-1.5">
        {streak.results.map((r, i) => (
          <div
            key={i}
            className={`flex-1 h-6 rounded flex items-center justify-center ${
              r === 'up' ? 'bg-green-500/20' : r === 'down' ? 'bg-red-500/20' : 'bg-yellow-500/20'
            }`}
          >
            <span className="text-xs">
              {r === 'up' ? '📈' : r === 'down' ? '📉' : '➖'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-[10px]">
        <span className="text-green-500">{streak.upCount} UP</span>
        <span className="text-gray-400">|</span>
        <span className="text-red-500">{streak.downCount} DOWN</span>
      </div>
    </div>
  );
};

// ==================== PREDICTION HELPER - SMART SUGGESTION ====================
const SmartSuggestion = ({ 
  priceHistory, 
  currentPrice, 
  startPrice, 
  totalUp, 
  totalDown, 
  previousRounds,
  activeTimeLeft 
}) => {
  const suggestion = useMemo(() => {
    // Don't show if less than 30 seconds left
    if (activeTimeLeft < 30) {
      return { show: false };
    }

    const total = totalUp + totalDown;
    const upPercent = total > 0 ? (totalUp / total) * 100 : 50;
    
    // Calculate price momentum
    let momentum = 'neutral';
    if (priceHistory && priceHistory.length >= 5) {
      const recent = priceHistory.slice(-5);
      const firstPrice = parseFloat(recent[0]?.price || currentPrice);
      const change = ((currentPrice - firstPrice) / firstPrice) * 100;
      
      if (change > 0.02) momentum = 'up';
      else if (change < -0.02) momentum = 'down';
    }

    // Check streak
    let streak = 'none';
    if (previousRounds && previousRounds.length >= 3) {
      const last3 = previousRounds.slice(0, 3).map(r => r.result);
      if (last3.every(r => r === 'up')) streak = 'up';
      else if (last3.every(r => r === 'down')) streak = 'down';
    }

    // Generate suggestion
    let suggested = null;
    let confidence = 'low';
    let reason = '';

    // Better odds side
    if (upPercent > 65) {
      suggested = 'down';
      reason = 'Better payout odds';
      confidence = 'medium';
    } else if (upPercent < 35) {
      suggested = 'up';
      reason = 'Better payout odds';
      confidence = 'medium';
    }

    // Momentum confirmation
    if (momentum !== 'neutral' && !suggested) {
      suggested = momentum;
      reason = 'Price momentum';
      confidence = 'low';
    }

    // Against long streak (mean reversion)
    if (streak !== 'none' && !suggested) {
      suggested = streak === 'up' ? 'down' : 'up';
      reason = 'Streak reversal likely';
      confidence = 'low';
    }

    if (!suggested) {
      return { show: false };
    }

    return { 
      show: true, 
      direction: suggested, 
      confidence, 
      reason 
    };
  }, [priceHistory, currentPrice, startPrice, totalUp, totalDown, previousRounds, activeTimeLeft]);

  if (!suggestion.show) return null;

  return (
    <div className={`rounded-lg p-2 border ${
      suggestion.direction === 'up' 
        ? 'bg-green-500/10 border-green-500/30' 
        : 'bg-red-500/10 border-red-500/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`p-1 rounded ${
            suggestion.direction === 'up' ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {suggestion.direction === 'up' ? (
              <TrendingUp size={12} className="text-green-500" />
            ) : (
              <TrendingDown size={12} className="text-red-500" />
            )}
          </div>
          <div>
            <p className={`text-xs font-bold ${
              suggestion.direction === 'up' ? 'text-green-500' : 'text-red-500'
            }`}>
              💡 Consider {suggestion.direction.toUpperCase()}
            </p>
            <p className="text-[10px] text-gray-400">{suggestion.reason}</p>
          </div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          suggestion.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
          suggestion.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {suggestion.confidence}
        </span>
      </div>
    </div>
  );
};

// ==================== REFERRAL POPUP (FULL VERSION) ====================
const ReferralPromoPopup = ({ isOpen, onClose, onGoToReferral }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl w-full max-w-sm border border-purple-500/30 shadow-2xl my-4">
        <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-center">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-white/80 hover:text-white p-1"
          >
            <X size={18} />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">🎁 Earn 25% Commission!</h2>
          <p className="text-white/80 text-xs mt-1">Turn your network into income!</p>
        </div>

        <div className="p-4">
          <div className="space-y-2 mb-4">
            {[
              { icon: Sparkles, text: 'Share your referral link', color: 'green' },
              { icon: Users, text: 'Friends sign up & bet', color: 'blue' },
              { icon: Coins, text: 'Earn 25% of their first bet!', color: 'yellow' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-800/50 p-2.5 rounded-lg">
                <div className={`p-1.5 rounded-lg bg-${item.color}-500/20`}>
                  <item.icon className={`text-${item.color}-400`} size={14} />
                </div>
                <span className="text-gray-300 text-sm">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 rounded-xl p-3 mb-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="text-yellow-400" size={14} />
              <span className="text-yellow-400 font-bold text-sm">UNLIMITED EARNINGS!</span>
              <Star className="text-yellow-400" size={14} />
            </div>
            <p className="text-yellow-300 text-xs">No cap • No limit • Forever!</p>
          </div>

          <button
            onClick={onGoToReferral}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:from-purple-700 hover:to-pink-700 transition"
          >
            <Gift size={16} />
            Start Referring Now!
            <ExternalLink size={14} />
          </button>
          
          <button onClick={onClose} className="w-full mt-2 py-2 text-gray-500 text-xs">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== USER GUIDE MODAL (FULL VERSION) ====================
const UserGuideModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    { 
      icon: Target, 
      title: "Welcome to Wealth Trading! 🎯", 
      text: "Predict if Bitcoin price will go UP ⬆️ or DOWN ⬇️ in 5 minutes and WIN BIG!",
      tip: "Simple: Pick direction, place bet, WIN!"
    },
    { 
      icon: Clock, 
      title: "How Rounds Work ⏰", 
      text: "5 min BETTING → 5 min LOCKED → RESULT!\n\nWhen one round locks, a new betting round starts instantly!",
      tip: "Always a round open for betting!"
    },
    { 
      icon: DollarSign, 
      title: "Placing a Bet 💰", 
      text: "1. Choose amount (min ₦100)\n2. Check potential payout\n3. Click UP or DOWN\n4. Wait for result!",
      tip: "Potential payout updates LIVE!"
    },
    { 
      icon: Trophy, 
      title: "How You Win 🏆", 
      text: "Correct prediction = Your bet BACK + 70% of losing pool!\n\nMore opponents = BIGGER wins!",
      tip: "No opponents = Full refund"
    },
    { 
      icon: BarChart3, 
      title: "Use Prediction Helpers 📊", 
      text: "• Trend Analyzer - Price direction\n• Crowd Sentiment - Who's betting what\n• Streak Tracker - Recent results\n• Smart Suggestions - AI hints",
      tip: "Use all tools to improve odds!"
    },
    { 
      icon: Gift, 
      title: "Refer & Earn 25% 🎁", 
      text: "Share your link → Friends bet → You earn 25% of their first bet!\n\nUNLIMITED referrals!",
      tip: "Turn friends into income!"
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3">
      <div className="bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-purple-600 p-4 text-center relative">
          <button onClick={onClose} className="absolute top-2 right-2 text-white/80">
            <X size={18} />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            {(() => { const Icon = steps[step].icon; return <Icon className="text-white" size={28} />; })()}
          </div>
          <h2 className="text-lg font-bold text-white">{steps[step].title}</h2>
        </div>

        <div className="p-4">
          <p className="text-gray-300 text-sm whitespace-pre-line text-center mb-3">
            {steps[step].text}
          </p>
          
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-2.5 flex items-start gap-2 mb-4">
            <Info className="text-primary flex-shrink-0 mt-0.5" size={14} />
            <p className="text-xs text-primary">{steps[step].tip}</p>
          </div>
          
          <div className="flex justify-center gap-1.5 mb-4">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-gray-600'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2.5 bg-slate-700 text-white rounded-xl text-sm font-bold"
              >
                ← Back
              </button>
            )}
            <button
              onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onClose()}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1"
            >
              {step < steps.length - 1 ? (
                <>Next <ChevronRight size={16} /></>
              ) : (
                <><CheckCircle size={16} /> Start Trading!</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== FLOATING BUTTONS ====================
const FloatingButtons = ({ onReferralClick, onHelpClick }) => {
  return (
    <>
      <button
        onClick={onReferralClick}
        className="fixed bottom-20 right-3 z-30 w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse"
      >
        <Gift className="text-white" size={20} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">$</span>
      </button>

      <a
        href="https://t.me/Iacafevtu1"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 left-3 z-30 w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30"
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
        </svg>
      </a>
    </>
  );
};

// ==================== TRADING CHART (STABLE VERSION) ====================
const TradingChart = ({ priceHistory = [], startPrice = 0, isLocked = false, roundId }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLineRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Cleanup existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: '#1e293b' },
          horzLines: { color: '#1e293b' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 160,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: '#334155',
        },
        rightPriceScale: {
          borderColor: '#334155',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        handleScroll: false,
        handleScale: false,
      });

      const series = chart.addAreaSeries({
        lineColor: isLocked ? '#f59e0b' : '#6366f1',
        topColor: isLocked ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)',
        bottomColor: 'transparent',
        lineWidth: 2,
      });

      chartRef.current = chart;
      seriesRef.current = series;

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    } catch (err) {
      console.error('Chart error:', err);
    }
  }, [roundId, isLocked]);

  // Update price line
  useEffect(() => {
    if (!seriesRef.current || !startPrice || startPrice <= 0) return;

    try {
      if (priceLineRef.current) {
        seriesRef.current.removePriceLine(priceLineRef.current);
      }
      priceLineRef.current = seriesRef.current.createPriceLine({
        price: startPrice,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: 2,
        title: 'Entry',
      });
    } catch (err) {}
  }, [startPrice]);

  // Update data
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !priceHistory || priceHistory.length === 0) return;

    try {
      const chartData = priceHistory
        .filter(item => item && item.price && item.price > 0)
        .map((item) => ({
          time: typeof item.time === 'number' ? Math.floor(item.time / 1000) : Math.floor(Date.now() / 1000),
          value: parseFloat(item.price),
        }))
        .sort((a, b) => a.time - b.time);

      // Remove duplicates
      const unique = [];
      const seen = new Set();
      for (const d of chartData) {
        if (!seen.has(d.time)) {
          unique.push(d);
          seen.add(d.time);
        }
      }

      if (unique.length > 0) {
        seriesRef.current.setData(unique);
        chartRef.current.timeScale().fitContent();
      }
    } catch (err) {}
  }, [priceHistory]);

  return (
    <div className="relative bg-slate-900/50 rounded-xl overflow-hidden">
      <div ref={chartContainerRef} className="w-full h-[160px]" />
      {(!priceHistory || priceHistory.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
          <Activity className="w-5 h-5 text-primary animate-pulse" />
        </div>
      )}
      {isLocked && (
        <div className="absolute top-1.5 right-1.5 bg-amber-500/20 rounded px-1.5 py-0.5 flex items-center gap-1">
          <Lock size={8} className="text-amber-500" />
          <span className="text-amber-500 text-[8px] font-bold">LOCKED</span>
        </div>
      )}
    </div>
  );
};

// ==================== LIVE POOL INDICATOR ====================
const PoolIndicator = ({ totalUp = 0, totalDown = 0, upBets = 0, downBets = 0, isLocked = false }) => {
  const total = totalUp + totalDown;
  const upPercent = total > 0 ? (totalUp / total) * 100 : 50;
  const downPercent = total > 0 ? (totalDown / total) * 100 : 50;

  // Calculate multipliers
  const upMultiplier = totalUp > 0 && totalDown > 0 ? roundToTwo(1 + (totalDown * 0.7) / totalUp) : 1;
  const downMultiplier = totalDown > 0 && totalUp > 0 ? roundToTwo(1 + (totalUp * 0.7) / totalDown) : 1;

  return (
    <div className="bg-slate-800/50 rounded-xl p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-white font-bold flex items-center gap-1">
          <Users size={12} className="text-primary" />
          {isLocked ? 'Final Pool' : 'Live Pool'}
        </span>
        {!isLocked && (
          <span className="text-[10px] text-green-500 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            LIVE
          </span>
        )}
      </div>
      
      <div className="h-4 bg-slate-700 rounded-full overflow-hidden flex mb-2">
        <div 
          className="bg-gradient-to-r from-green-600 to-green-400 flex items-center justify-center transition-all duration-500"
          style={{ width: `${upPercent}%` }}
        >
          {upPercent > 15 && (
            <span className="text-[9px] text-white font-bold">{upPercent.toFixed(0)}%</span>
          )}
        </div>
        <div 
          className="bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center transition-all duration-500"
          style={{ width: `${downPercent}%` }}
        >
          {downPercent > 15 && (
            <span className="text-[9px] text-white font-bold">{downPercent.toFixed(0)}%</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-green-500/10 p-2 rounded-lg border border-green-500/20">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="text-green-500" size={12} />
              <span className="text-green-500 font-bold text-xs">UP</span>
            </div>
            <span className="text-[10px] text-green-400 bg-green-500/20 px-1 rounded">
              {upMultiplier}x
            </span>
          </div>
          <p className="text-green-500 font-bold text-sm">₦{formatCurrency(totalUp)}</p>
          <p className="text-[10px] text-gray-400">{upBets} bets</p>
        </div>
        
        <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1">
              <TrendingDown className="text-red-500" size={12} />
              <span className="text-red-500 font-bold text-xs">DOWN</span>
            </div>
            <span className="text-[10px] text-red-400 bg-red-500/20 px-1 rounded">
              {downMultiplier}x
            </span>
          </div>
          <p className="text-red-500 font-bold text-sm">₦{formatCurrency(totalDown)}</p>
          <p className="text-[10px] text-gray-400">{downBets} bets</p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-center">
        <span className="text-[10px] text-gray-400">Total Pool</span>
        <span className="text-white font-bold text-sm">₦{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

// ==================== PREVIOUS ROUND CARD ====================
const PrevRoundCard = ({ round }) => {
  if (!round) return null;

  const change = parseFloat(round.percentChange || 0);

  return (
    <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700 min-w-[130px] flex-shrink-0">
      <div className="flex justify-between items-center mb-1.5">
        <p className="text-[10px] text-gray-500">#{round.roundNumber}</p>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
          round.result === 'up' ? 'bg-green-500/20 text-green-500' :
          round.result === 'down' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
        }`}>
          {round.result === 'up' ? '📈 UP' : round.result === 'down' ? '📉 DOWN' : '➖ TIE'}
        </span>
      </div>

      <div className="flex justify-between text-[10px] mb-1.5">
        <div>
          <p className="text-gray-500">Start</p>
          <p className="text-white font-medium">${formatCompact(parseFloat(round.startPrice || 0))}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">End</p>
          <p className="text-white font-medium">${formatCompact(parseFloat(round.endPrice || 0))}</p>
        </div>
      </div>

      <div className={`text-center py-1 rounded ${change >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
        <span className={`text-xs font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(3)}%
        </span>
      </div>

      <div className="flex gap-1 mt-1.5 text-[9px]">
        <span className="flex-1 text-center bg-green-500/10 rounded py-0.5 text-green-400">
          ₦{formatCompact(parseFloat(round.totalUpAmount || 0))}
        </span>
        <span className="flex-1 text-center bg-red-500/10 rounded py-0.5 text-red-400">
          ₦{formatCompact(parseFloat(round.totalDownAmount || 0))}
        </span>
      </div>
    </div>
  );
};

// ==================== MY BET CARD ====================
const MyBetCard = ({ bet }) => {
  const amt = parseFloat(bet.stakeAmount || bet.amount || 0);
  const mult = bet.currentMultiplierRaw || 1.7;
  const payout = roundToTwo(amt * mult);
  const isUp = bet.prediction === 'up';

  return (
    <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
      isUp ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
    }`}>
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${isUp ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {isUp ? (
            <ArrowUpRight className="text-green-500" size={14} />
          ) : (
            <ArrowDownRight className="text-red-500" size={14} />
          )}
        </div>
        <div>
          <p className="text-white text-sm font-bold">₦{formatCurrency(amt)}</p>
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            #{bet.roundNumber}
            {bet.roundStatus === 'locked' && <Lock size={8} className="text-amber-500" />}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-[10px] ${isUp ? 'text-green-400' : 'text-red-400'}`}>{mult}x</p>
        <p className={`text-sm font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>
          ₦{formatCurrency(payout)}
        </p>
        {bet.isCurrentlyWinning !== undefined && (
          <span className={`text-[8px] px-1 rounded ${
            bet.isCurrentlyWinning ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {bet.isCurrentlyWinning ? '✓ Winning' : '✗ Losing'}
          </span>
        )}
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD ====================
const Dashboard = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  // ========== STATES ==========
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceHistory, setPriceHistory] = useState([]);
  const [lockedPriceHistory, setLockedPriceHistory] = useState([]);
  const [previousRounds, setPreviousRounds] = useState([]);
  const [lockedRound, setLockedRound] = useState(null);
  const [activeRound, setActiveRound] = useState(null);
  const [activeSlide, setActiveSlide] = useState(1);
  const [betAmount, setBetAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [activeTimeLeft, setActiveTimeLeft] = useState(0);
  const [lockedTimeLeft, setLockedTimeLeft] = useState(0);
  const [myActiveBets, setMyActiveBets] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeStartPrice, setActiveStartPrice] = useState(0);
  const [lockedStartPrice, setLockedStartPrice] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [walletData, setWalletData] = useState({ nairaBalance: 0, lockedBalance: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [showHelpers, setShowHelpers] = useState(true);

  // ========== CALCULATED ==========
  const walletBalance = parseFloat(walletData?.nairaBalance || 0);
  const lockedBalance = parseFloat(walletData?.lockedBalance || 0);
  const availableBalance = roundToTwo(Math.max(0, walletBalance - lockedBalance));
  const activePriceChange = activeStartPrice > 0 ? ((currentPrice - activeStartPrice) / activeStartPrice) * 100 : 0;
  const lockedPriceChange = lockedStartPrice > 0 ? ((currentPrice - lockedStartPrice) / lockedStartPrice) * 100 : 0;
  const canBet = activeRound?.status === 'active' && activeTimeLeft >= 10;

  // ========== PAYOUT CALCULATOR ==========
  const calcPayout = useCallback((prediction) => {
    if (!activeRound || betAmount <= 0) {
      return { payout: 0, profit: 0, multiplier: 1.7, hasOpponents: false };
    }

    let totalUp = parseFloat(activeRound.totalUpAmount || 0);
    let totalDown = parseFloat(activeRound.totalDownAmount || 0);

    if (prediction === 'up') totalUp += betAmount;
    else totalDown += betAmount;

    const hasOpponents = prediction === 'up' ? totalDown > 0 : totalUp > 0;

    if (!hasOpponents) {
      return { payout: betAmount, profit: 0, multiplier: 1.0, hasOpponents: false };
    }

    const mult = prediction === 'up'
      ? roundToTwo(1 + (totalDown * 0.7) / totalUp)
      : roundToTwo(1 + (totalUp * 0.7) / totalDown);

    return {
      payout: roundToTwo(betAmount * mult),
      profit: roundToTwo(betAmount * mult - betAmount),
      multiplier: mult,
      hasOpponents: true
    };
  }, [activeRound, betAmount]);

  // ========== FIRST VISIT CHECK ==========
  useEffect(() => {
    const seen = localStorage.getItem('hasSeenGuide');
    if (!seen && user) {
      setShowGuide(true);
      localStorage.setItem('hasSeenGuide', 'true');
    }
  }, [user]);

  // ========== INIT ==========
  useEffect(() => {
    if (user) initDashboard();
  }, [user]);

  const initDashboard = async () => {
    setDataLoading(true);
    try {
      await Promise.all([fetchWallet(), fetchRounds(), fetchPrice(), fetchBets()]);
    } catch (err) {
      console.error('Init error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Auto refresh
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchRounds();
      fetchBets();
    }, 3000);
    return () => clearInterval(interval);
  }, [user]);

  // ========== FETCH FUNCTIONS ==========
  const fetchWallet = async () => {
    try {
      const data = await api.get('/wallet/balance');
      setWalletData(data?.data || data || { nairaBalance: 0, lockedBalance: 0 });
    } catch (err) {}
  };

  const fetchRounds = async () => {
    try {
      const data = await api.get('/trading/rounds/all');
      if (data) {
        setPreviousRounds(data.previousRounds || []);
        
        if (data.lockedRound) {
          setLockedRound(data.lockedRound);
          setLockedStartPrice(parseFloat(data.lockedRound.startPrice || 0));
        } else {
          setLockedRound(null);
        }
        
        if (data.activeRound) {
          setActiveRound(data.activeRound);
          setActiveStartPrice(parseFloat(data.activeRound.startPrice || 0));
        } else {
          setActiveRound(null);
        }
      }
    } catch (err) {}
  };

  const fetchPrice = async () => {
    try {
      const data = await api.get('/trading/current-price');
      if (data?.price) {
        const price = parseFloat(data.price);
        setCurrentPrice(price);
        
        const entry = { time: Date.now(), price };
        setPriceHistory(prev => [...prev.slice(-59), entry]);
        if (lockedRound) {
          setLockedPriceHistory(prev => [...prev.slice(-119), entry]);
        }
      }
    } catch (err) {}
  };

  const fetchBets = async () => {
    try {
      const data = await api.get('/trading/my-bets/active');
      setMyActiveBets(data?.activeBets || []);
    } catch (err) {}
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await initDashboard();
    setRefreshing(false);
    toast.success('Refreshed!');
  };

  // ========== SOCKET LISTENERS ==========
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onPriceUpdate = (data) => {
      if (data?.price) {
        const price = parseFloat(data.price);
        setCurrentPrice(price);
        const entry = { time: Date.now(), price };
        setPriceHistory(prev => [...prev.slice(-59), entry]);
        setLockedPriceHistory(prev => lockedRound ? [...prev.slice(-119), entry] : prev);
      }
    };

    const onBetPlaced = (data) => {
      setActiveRound(prev => {
        if (!prev || prev.id !== data.roundId) return prev;
        return { ...prev, ...data };
      });
    };

    const onRoundStart = (data) => {
      console.log('🚀 Round started:', data);
      fetchRounds();
      fetchBets();
      if (data.startPrice) setActiveStartPrice(parseFloat(data.startPrice));
      toast.success(`🚀 Round #${data.roundNumber} Started!`, { duration: 2000 });
      setActiveSlide(1);
    };

    const onRoundLocked = (data) => {
      console.log('🔒 Round locked:', data);
      setLockedPriceHistory([...priceHistory]);
      setLockedStartPrice(parseFloat(data.startPrice || 0));
      fetchRounds();
      fetchBets();
      toast('🔒 Betting closed!', { icon: '⏰', duration: 2000 });
    };

    const onRoundCompleted = (data) => {
      console.log('🏁 Round completed:', data);
      fetchRounds();
      fetchBets();
      fetchWallet();
      const emoji = data.result === 'up' ? '📈' : data.result === 'down' ? '📉' : '➖';
      toast.success(`${emoji} Result: ${data.result?.toUpperCase()}!`, { duration: 3000 });
    };

    const onBetResult = (data) => {
      fetchBets();
      fetchWallet();
      if (data.result === 'win') {
        toast.success(`🎉 Won ₦${formatCurrency(data.payout)}! (${data.multiplier}x)`, { duration: 4000 });
      } else if (data.result === 'loss') {
        toast.error(`Lost ₦${formatCurrency(Math.abs(data.profit || data.amount))}`, { duration: 3000 });
      } else if (data.result === 'refund') {
        toast.success(`🔄 Refunded ₦${formatCurrency(data.payout)}`, { duration: 3000 });
      }
    };

    const onBalanceUpdate = (data) => {
      setWalletData(prev => ({ ...prev, ...data }));
    };

    socket.on('price_update', onPriceUpdate);
    socket.on('bet_placed', onBetPlaced);
    socket.on('round_start', onRoundStart);
    socket.on('round_locked', onRoundLocked);
    socket.on('round_completed', onRoundCompleted);
    socket.on('bet_result', onBetResult);
    socket.on('balance_update', onBalanceUpdate);

    return () => {
      socket.off('price_update', onPriceUpdate);
      socket.off('bet_placed', onBetPlaced);
      socket.off('round_start', onRoundStart);
      socket.off('round_locked', onRoundLocked);
      socket.off('round_completed', onRoundCompleted);
      socket.off('bet_result', onBetResult);
      socket.off('balance_update', onBalanceUpdate);
    };
  }, [socket, isConnected, priceHistory, lockedRound]);

  // ========== TIMERS ==========
  useEffect(() => {
    const update = () => {
      const now = Date.now();
      if (activeRound?.lockTime) {
        setActiveTimeLeft(Math.max(0, Math.floor((new Date(activeRound.lockTime).getTime() - now) / 1000)));
      }
      if (lockedRound?.endTime) {
        setLockedTimeLeft(Math.max(0, Math.floor((new Date(lockedRound.endTime).getTime() - now) / 1000)));
      }
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [activeRound, lockedRound]);

  // ========== PLACE BET ==========
  const handlePlaceBet = async (prediction) => {
    if (!activeRound || activeRound.status !== 'active') {
      toast.error('No active round');
      return;
    }
    if (activeTimeLeft < 10) {
      toast.error('Too late! Wait for next round');
      return;
    }
    if (!betAmount || betAmount < 100) {
      toast.error('Min bet is ₦100');
      return;
    }
    if (betAmount > 100000) {
      toast.error('Max bet is ₦100,000');
      return;
    }
    if (betAmount > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/trading/bet', {
        roundId: activeRound.id,
        prediction: prediction.toLowerCase(),
        amount: betAmount
      });
      
      const potentialWin = res.bet?.potentialPayout || (betAmount * 1.7);
      toast.success(`✅ Bet ₦${formatCurrency(betAmount)} on ${prediction.toUpperCase()}!\nPotential: ₦${formatCurrency(potentialWin)}`);
      
      await Promise.all([fetchBets(), fetchRounds(), fetchWallet()]);
    } catch (err) {
      toast.error(err.message || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  // ========== LOADING ==========
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <UserGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <ReferralPromoPopup 
        isOpen={showReferralPopup} 
        onClose={() => setShowReferralPopup(false)}
        onGoToReferral={() => { setShowReferralPopup(false); navigate('/referrals'); }}
      />
      <FloatingButtons 
        onReferralClick={() => setShowReferralPopup(true)}
        onHelpClick={() => setShowGuide(true)}
      />

      {/* Connection Banner */}
      {!isConnected && (
        <div className="bg-yellow-500/10 px-3 py-2 flex items-center justify-center gap-2">
          <WifiOff className="text-yellow-500 animate-pulse" size={14} />
          <p className="text-yellow-500 text-xs font-medium">Reconnecting to live data...</p>
        </div>
      )}

      <div className="p-3 max-w-xl mx-auto space-y-3">
        {/* ===== HEADER ===== */}
        <div className="bg-slate-900/80 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/20 rounded-lg">
                <Activity className="text-primary" size={18} />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Wealth Trading</h1>
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  BTC/USD • 5min rounds
                  {isConnected && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowGuide(true)} className="p-2 bg-slate-800 rounded-lg">
                <HelpCircle size={14} className="text-gray-400" />
              </button>
              <button onClick={handleRefresh} className="p-2 bg-slate-800 rounded-lg" disabled={refreshing}>
                <RefreshCw size={14} className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Balance Card */}
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Available Balance</p>
              <p className="text-xl font-black text-green-400">₦{formatCurrency(availableBalance)}</p>
              {lockedBalance > 0 && (
                <p className="text-[10px] text-orange-400 flex items-center gap-0.5">
                  <Lock size={8} /> ₦{formatCurrency(lockedBalance)} in bets
                </p>
              )}
            </div>
            <div className="p-2.5 bg-green-500/20 rounded-xl">
              <WalletIcon className="text-green-500" size={22} />
            </div>
          </div>
        </div>

        {/* ===== LIVE PRICE CARD ===== */}
        <div className="bg-slate-900/80 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <TrendUp className="text-orange-500" size={16} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  Live BTC/USD
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                </p>
                <p className="text-xl font-black text-white tabular-nums">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {activeStartPrice > 0 && (
              <div className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 ${
                activePriceChange >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {activePriceChange >= 0 ? 
                  <TrendingUp size={14} className="text-green-500" /> : 
                  <TrendingDown size={14} className="text-red-500" />
                }
                <span className={`text-sm font-bold tabular-nums ${
                  activePriceChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {activePriceChange >= 0 ? '+' : ''}{activePriceChange.toFixed(3)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ===== PREDICTION HELPERS ===== */}
        <div>
          <button 
            onClick={() => setShowHelpers(!showHelpers)}
            className="flex items-center justify-between w-full text-xs text-gray-400 mb-2 px-1"
          >
            <span className="flex items-center gap-1">
              <BarChart3 size={12} /> Prediction Helpers
            </span>
            {showHelpers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showHelpers && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <TrendAnalyzer 
                  priceHistory={priceHistory}
                  currentPrice={currentPrice}
                  startPrice={activeStartPrice}
                />
                <PoolSentiment 
                  totalUp={parseFloat(activeRound?.totalUpAmount || 0)}
                  totalDown={parseFloat(activeRound?.totalDownAmount || 0)}
                  upBets={activeRound?.totalUpBets || 0}
                  downBets={activeRound?.totalDownBets || 0}
                />
              </div>

              <RecentStreak previousRounds={previousRounds} />

              <SmartSuggestion 
                priceHistory={priceHistory}
                currentPrice={currentPrice}
                startPrice={activeStartPrice}
                totalUp={parseFloat(activeRound?.totalUpAmount || 0)}
                totalDown={parseFloat(activeRound?.totalDownAmount || 0)}
                previousRounds={previousRounds}
                activeTimeLeft={activeTimeLeft}
              />
            </div>
          )}
        </div>

        {/* ===== PREVIOUS ROUNDS CAROUSEL ===== */}
        {previousRounds.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-400 mb-1.5 px-1 flex items-center gap-1">
              <History size={10} /> Recent Rounds
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
              {previousRounds.map(round => (
                <PrevRoundCard key={round.id} round={round} />
              ))}
            </div>
          </div>
        )}

        {/* ===== SLIDE NAVIGATION ===== */}
        <div className="flex items-center justify-center gap-2 bg-slate-900/50 rounded-xl p-2">
          {[
            { id: 0, label: '🔒 Locked', active: !!lockedRound },
            { id: 1, label: '🔴 LIVE', active: !!activeRound },
            { id: 2, label: '⏳ Next', active: true }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSlide(s.id)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSlide === s.id 
                  ? s.id === 1 ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-primary/20 text-primary border border-primary/30'
                  : s.active 
                    ? 'bg-slate-800 text-gray-400' 
                    : 'bg-slate-800/50 text-gray-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ===== SLIDES CONTENT ===== */}
        <div className="overflow-hidden rounded-xl">
          <div 
            className="flex transition-transform duration-300" 
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {/* SLIDE 0: LOCKED */}
            <div className="min-w-full px-0.5">
              {lockedRound ? (
                <div className="bg-gradient-to-b from-amber-900/20 to-slate-900/50 rounded-xl p-3 border border-amber-500/30">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Lock className="text-amber-500" size={14} />
                      <span className="text-white font-bold text-sm">Round #{lockedRound.roundNumber}</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg ${
                      lockedTimeLeft < 30 ? 'bg-red-500/20 border border-red-500/30' : 'bg-amber-500/20 border border-amber-500/30'
                    }`}>
                      <span className={`text-lg font-mono font-bold ${
                        lockedTimeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-amber-500'
                      }`}>
                        {formatTime(lockedTimeLeft)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-800/50 p-2 rounded-lg">
                      <p className="text-[10px] text-gray-500">Entry Price</p>
                      <p className="text-white font-bold text-sm">${lockedStartPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded-lg">
                      <p className="text-[10px] text-gray-500">Current</p>
                      <p className={`font-bold text-sm flex items-center gap-1 ${
                        lockedPriceChange >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {lockedPriceChange >= 0 ? '↑' : '↓'}
                        {Math.abs(lockedPriceChange).toFixed(3)}%
                      </p>
                    </div>
                  </div>

                  <TradingChart 
                    priceHistory={lockedPriceHistory.length > 0 ? lockedPriceHistory : priceHistory}
                    startPrice={lockedStartPrice}
                    isLocked={true}
                    roundId={`locked-${lockedRound.id}`}
                  />

                  <div className="mt-3">
                    <PoolIndicator
                      totalUp={parseFloat(lockedRound.totalUpAmount || 0)}
                      totalDown={parseFloat(lockedRound.totalDownAmount || 0)}
                      upBets={lockedRound.totalUpBets || 0}
                      downBets={lockedRound.totalDownBets || 0}
                      isLocked={true}
                    />
                  </div>

                  <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center">
                    <p className="text-amber-400 text-xs flex items-center justify-center gap-1">
                      <Eye size={12} /> Waiting for result...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/30 rounded-xl p-8 text-center border border-dashed border-slate-700">
                  <Lock className="text-gray-600 mx-auto mb-2" size={32} />
                  <p className="text-gray-500 text-sm">No locked round</p>
                  <p className="text-gray-600 text-[10px] mt-1">Will show when betting closes</p>
                </div>
              )}
            </div>

            {/* SLIDE 1: ACTIVE BETTING */}
            <div className="min-w-full px-0.5">
              {activeRound ? (
                <div className="bg-slate-800/50 rounded-xl p-3 border border-primary/30">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                      <span className="text-white font-bold text-sm">Round #{activeRound.roundNumber}</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg ${
                      activeTimeLeft < 30 ? 'bg-red-500/20 border border-red-500/30' : 
                      activeTimeLeft < 60 ? 'bg-yellow-500/20 border border-yellow-500/30' : 
                      'bg-slate-800 border border-slate-700'
                    }`}>
                      <span className={`text-lg font-mono font-bold ${
                        activeTimeLeft < 30 ? 'text-red-500 animate-pulse' : 
                        activeTimeLeft < 60 ? 'text-yellow-500' : 'text-primary'
                      }`}>
                        {formatTime(activeTimeLeft)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-900/50 p-2 rounded-lg">
                      <p className="text-[10px] text-gray-500">Entry Price</p>
                      <p className="text-white font-bold text-sm">${activeStartPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-lg">
                      <p className="text-[10px] text-gray-500">Change</p>
                      <p className={`font-bold text-sm flex items-center gap-1 ${
                        activePriceChange >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {activePriceChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {activePriceChange >= 0 ? '+' : ''}{activePriceChange.toFixed(3)}%
                      </p>
                    </div>
                  </div>

                  <TradingChart 
                    priceHistory={priceHistory}
                    startPrice={activeStartPrice}
                    isLocked={false}
                    roundId={`active-${activeRound.id}`}
                  />

                  <div className="mt-3">
                    <PoolIndicator
                      totalUp={parseFloat(activeRound.totalUpAmount || 0)}
                      totalDown={parseFloat(activeRound.totalDownAmount || 0)}
                      upBets={activeRound.totalUpBets || 0}
                      downBets={activeRound.totalDownBets || 0}
                    />
                  </div>

                  {/* BETTING BUTTONS */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {['up', 'down'].map(pred => {
                      const calc = calcPayout(pred);
                      const isUp = pred === 'up';
                      return (
                        <button
                          key={pred}
                          onClick={() => handlePlaceBet(pred)}
                          disabled={loading || !canBet}
                          className={`relative p-3 rounded-xl border-2 transition-all disabled:opacity-40 ${
                            isUp 
                              ? 'bg-green-500/10 border-green-500/50 hover:border-green-500 hover:bg-green-500/20' 
                              : 'bg-red-500/10 border-red-500/50 hover:border-red-500 hover:bg-red-500/20'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg mx-auto w-fit mb-1 ${
                            isUp ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                            {isUp ? (
                              <ArrowUpRight className="text-green-500" size={20} />
                            ) : (
                              <ArrowDownRight className="text-red-500" size={20} />
                            )}
                          </div>
                          <p className={`font-black text-sm ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                            PREDICT {pred.toUpperCase()}
                          </p>
                          
                          {betAmount > 0 && (
                            <div className="mt-2 pt-2 border-t border-current/20 space-y-0.5">
                              {calc.hasOpponents ? (
                                <>
                                  <p className={`text-xs font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                                    {calc.multiplier}x Payout
                                  </p>
                                  <p className={`text-sm font-black ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                                    Win: ₦{formatCurrency(calc.payout)}
                                  </p>
                                  <p className={`text-[10px] ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                                    +₦{formatCurrency(calc.profit)} profit
                                  </p>
                                </>
                              ) : (
                                <p className="text-[10px] text-yellow-400">
                                  Refund if win (no opponents)
                                </p>
                              )}
                            </div>
                          )}

                          {loading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                              <Loader2 className="animate-spin text-white" size={20} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {!canBet && activeTimeLeft < 10 && activeTimeLeft > 0 && (
                    <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
                      <p className="text-red-500 text-xs flex items-center justify-center gap-1">
                        <AlertCircle size={12} /> Round ending - betting disabled
                      </p>
                    </div>
                  )}

                  {activeTimeLeft === 0 && (
                    <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 text-center">
                      <p className="text-yellow-500 text-xs flex items-center justify-center gap-1">
                        <Loader2 size={12} className="animate-spin" /> Locking round...
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-800/30 rounded-xl p-8 text-center border border-dashed border-slate-700">
                  <Clock className="text-gray-600 mx-auto mb-2 animate-pulse" size={32} />
                  <p className="text-gray-500 text-sm">Waiting for next round...</p>
                  <button onClick={handleRefresh} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
                    Refresh
                  </button>
                </div>
              )}
            </div>

            {/* SLIDE 2: UPCOMING */}
            <div className="min-w-full px-0.5">
              <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-blue-500/20">
                <div className="p-3 bg-blue-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <Play className="text-blue-500" size={28} />
                </div>
                <h3 className="text-white font-bold mb-1">Next Round</h3>
                <p className="text-gray-400 text-xs mb-4">Starts automatically when current round locks</p>
                
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-400 text-xs flex items-center justify-center gap-1">
                    <Zap size={12} /> Prepare your bet amount while waiting!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== BET AMOUNT SELECTOR ===== */}
        <div className="bg-slate-900/80 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white font-bold flex items-center gap-1">
              <DollarSign size={12} className="text-primary" /> Bet Amount
            </span>
            <span className="text-[10px] text-gray-500">
              Balance: <span className="text-green-400 font-bold">₦{formatCurrency(availableBalance)}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {[100, 500, 1000, 2000, 5000, 10000, 50000].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={amt > availableBalance}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  betAmount === amt
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : amt > availableBalance
                    ? 'bg-slate-800/50 text-gray-600'
                    : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                }`}
              >
                ₦{amt >= 1000 ? `${amt/1000}K` : amt}
              </button>
            ))}
            <input
              type="number"
              value={betAmount || ''}
              onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
              className="w-16 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs text-center focus:border-primary outline-none"
              placeholder="Custom"
              min="100"
              max="100000"
            />
          </div>

          <div className="flex gap-2 text-[10px] text-gray-500">
            <span>Min: ₦100</span>
            <span>•</span>
            <span>Max: ₦100K</span>
            <span>•</span>
            <span className="text-primary flex items-center gap-0.5">
              <Shield size={8} /> No upfront fees!
            </span>
          </div>
        </div>

        {/* ===== MY ACTIVE BETS ===== */}
        {myActiveBets.length > 0 && (
          <div className="bg-slate-900/80 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white font-bold flex items-center gap-1">
                <Activity size={12} className="text-primary" /> My Active Bets
              </span>
              <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold">
                {myActiveBets.length} active
              </span>
            </div>

            <div className="space-y-2">
              {myActiveBets.slice(0, 5).map(bet => (
                <MyBetCard key={bet.id} bet={bet} />
              ))}
              {myActiveBets.length > 5 && (
                <p className="text-center text-[10px] text-gray-500">
                  +{myActiveBets.length - 5} more bets
                </p>
              )}
            </div>
          </div>
        )}

        {/* ===== REFERRAL CTA ===== */}
        <button
          onClick={() => navigate('/referrals')}
          className="w-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-3 flex items-center gap-3 hover:from-purple-600/30 hover:to-pink-600/30 transition"
        >
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <Gift className="text-purple-500" size={18} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white text-sm font-bold">🎁 Refer Friends, Earn 25%!</p>
            <p className="text-gray-400 text-[10px]">Share your link & earn from their bets</p>
          </div>
          <ChevronRight className="text-gray-400" size={16} />
        </button>

        {/* ===== QUICK STATS FOOTER ===== */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900/50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Total Bets</p>
            <p className="text-sm font-bold text-white">{myActiveBets.length}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">In Play</p>
            <p className="text-sm font-bold text-orange-400">₦{formatCurrency(lockedBalance)}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Rounds Today</p>
            <p className="text-sm font-bold text-primary">{previousRounds.length + (activeRound ? 1 : 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
