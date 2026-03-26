
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
  Flame,
  ChevronDown,
  ChevronUp,
  PieChart,
  LineChart,
  Coins
} from 'lucide-react';

// ==================== HELPERS ====================
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
  if (num >= 1000) return `${(num/1000).toFixed(0)}K`;
  return num.toString();
};

// ==================== TREND ANALYZER ====================
const TrendAnalyzer = ({ priceHistory, currentPrice, startPrice }) => {
  const analysis = useMemo(() => {
    if (!priceHistory || priceHistory.length < 5) {
      return { trend: 'neutral', strength: 0, message: 'Collecting data...' };
    }

    const recent = priceHistory.slice(-10);
    const prices = recent.map(p => parseFloat(p.price));
    
    let upMoves = 0, downMoves = 0;
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i-1];
      if (change > 0) upMoves++;
      else if (change < 0) downMoves++;
    }

    let trend = 'neutral';
    let strength = 50;
    let message = 'Sideways ↔️';

    if (upMoves > downMoves + 2) {
      trend = 'up';
      strength = Math.min(100, (upMoves / prices.length) * 100);
      message = 'Trending UP 📈';
    } else if (downMoves > upMoves + 2) {
      trend = 'down';
      strength = Math.min(100, (downMoves / prices.length) * 100);
      message = 'Trending DOWN 📉';
    }

    return { trend, strength, message, upMoves, downMoves };
  }, [priceHistory, currentPrice, startPrice]);

  return (
    <div className="bg-slate-800/60 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm text-gray-400 flex items-center gap-1.5">
          <LineChart size={14} className="text-primary" /> Trend
        </span>
        <span className={`text-xs sm:text-sm font-bold px-2 py-1 rounded-lg ${
          analysis.trend === 'up' ? 'bg-green-500/20 text-green-400' :
          analysis.trend === 'down' ? 'bg-red-500/20 text-red-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {analysis.message}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 sm:h-2.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              analysis.trend === 'up' ? 'bg-gradient-to-r from-green-600 to-green-400' :
              analysis.trend === 'down' ? 'bg-gradient-to-r from-red-600 to-red-400' : 
              'bg-gray-500'
            }`}
            style={{ width: `${analysis.strength}%` }}
          />
        </div>
        <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
          {analysis.upMoves}↑ {analysis.downMoves}↓
        </span>
      </div>
    </div>
  );
};

// ==================== POOL SENTIMENT ====================
const PoolSentiment = ({ totalUp, totalDown, upBets, downBets }) => {
  const total = totalUp + totalDown;
  const upPercent = total > 0 ? (totalUp / total) * 100 : 50;
  const downPercent = total > 0 ? (totalDown / total) * 100 : 50;
  
  const sentiment = useMemo(() => {
    if (total === 0) return { side: 'none', message: 'Be first! 🎯', hint: null };
    
    const diff = Math.abs(upPercent - downPercent);
    
    if (diff < 10) {
      return { side: 'balanced', message: 'Balanced pool ⚖️', hint: null };
    } else if (upPercent > downPercent) {
      return { 
        side: 'up', 
        message: `${upPercent.toFixed(0)}% on UP`,
        hint: 'DOWN has better odds!'
      };
    } else {
      return { 
        side: 'down', 
        message: `${downPercent.toFixed(0)}% on DOWN`,
        hint: 'UP has better odds!'
      };
    }
  }, [upPercent, downPercent, total]);

  return (
    <div className="bg-slate-800/60 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm text-gray-400 flex items-center gap-1.5">
          <PieChart size={14} className="text-primary" /> Crowd
        </span>
      </div>
      
      <p className="text-sm sm:text-base text-white font-bold mb-1">{sentiment.message}</p>
      
      {sentiment.hint && (
        <p className="text-xs sm:text-sm text-yellow-400 flex items-center gap-1">
          <Zap size={12} /> {sentiment.hint}
        </p>
      )}

      <div className="flex gap-2 mt-2">
        <div className="flex-1 text-center bg-green-500/20 rounded-lg py-1.5">
          <p className="text-xs sm:text-sm text-green-400 font-bold">{upBets} UP</p>
        </div>
        <div className="flex-1 text-center bg-red-500/20 rounded-lg py-1.5">
          <p className="text-xs sm:text-sm text-red-400 font-bold">{downBets} DOWN</p>
        </div>
      </div>
    </div>
  );
};

// ==================== RECENT STREAK ====================
const RecentStreak = ({ previousRounds }) => {
  const streak = useMemo(() => {
    if (!previousRounds || previousRounds.length === 0) {
      return { type: 'none', count: 0, results: [], upCount: 0, downCount: 0, isHotStreak: false };
    }

    const results = previousRounds.slice(0, 5).map(r => r.result);
    let streakType = results[0];
    let streakCount = 0;

    for (const r of results) {
      if (r === streakType) streakCount++;
      else break;
    }

    return { 
      type: streakType, 
      count: streakCount, 
      results,
      upCount: results.filter(r => r === 'up').length,
      downCount: results.filter(r => r === 'down').length,
      isHotStreak: streakCount >= 3
    };
  }, [previousRounds]);

  if (streak.results.length === 0) return null;

  return (
    <div className="bg-slate-800/60 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm text-gray-400 flex items-center gap-1.5">
          <History size={14} className="text-primary" /> Last 5 Results
        </span>
        {streak.isHotStreak && (
          <span className={`text-xs sm:text-sm font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${
            streak.type === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            <Flame size={12} /> {streak.count}x Streak!
          </span>
        )}
      </div>

      <div className="flex gap-1.5 sm:gap-2 mb-2">
        {streak.results.map((r, i) => (
          <div
            key={i}
            className={`flex-1 h-8 sm:h-10 rounded-lg flex items-center justify-center text-base sm:text-lg ${
              r === 'up' ? 'bg-green-500/20' : r === 'down' ? 'bg-red-500/20' : 'bg-yellow-500/20'
            }`}
          >
            {r === 'up' ? '📈' : r === 'down' ? '📉' : '➖'}
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-green-400 font-medium">{streak.upCount} UP wins</span>
        <span className="text-red-400 font-medium">{streak.downCount} DOWN wins</span>
      </div>
    </div>
  );
};

// ==================== SMART SUGGESTION ====================
const SmartSuggestion = ({ 
  priceHistory, currentPrice, startPrice, totalUp, totalDown, previousRounds, activeTimeLeft 
}) => {
  const suggestion = useMemo(() => {
    if (activeTimeLeft < 30) return { show: false };

    const total = totalUp + totalDown;
    const upPercent = total > 0 ? (totalUp / total) * 100 : 50;
    
    let momentum = 'neutral';
    if (priceHistory && priceHistory.length >= 5) {
      const recent = priceHistory.slice(-5);
      const firstPrice = parseFloat(recent[0]?.price || currentPrice);
      const change = ((currentPrice - firstPrice) / firstPrice) * 100;
      if (change > 0.02) momentum = 'up';
      else if (change < -0.02) momentum = 'down';
    }

    let streak = 'none';
    if (previousRounds && previousRounds.length >= 3) {
      const last3 = previousRounds.slice(0, 3).map(r => r.result);
      if (last3.every(r => r === 'up')) streak = 'up';
      else if (last3.every(r => r === 'down')) streak = 'down';
    }

    let suggested = null;
    let confidence = 'low';
    let reason = '';

    if (upPercent > 65) {
      suggested = 'down';
      reason = 'Better payout odds on DOWN';
      confidence = 'medium';
    } else if (upPercent < 35) {
      suggested = 'up';
      reason = 'Better payout odds on UP';
      confidence = 'medium';
    } else if (momentum !== 'neutral') {
      suggested = momentum;
      reason = `Price momentum is ${momentum.toUpperCase()}`;
      confidence = 'low';
    } else if (streak !== 'none') {
      suggested = streak === 'up' ? 'down' : 'up';
      reason = 'Streak reversal expected';
      confidence = 'low';
    }

    if (!suggested) return { show: false };
    return { show: true, direction: suggested, confidence, reason };
  }, [priceHistory, currentPrice, startPrice, totalUp, totalDown, previousRounds, activeTimeLeft]);

  if (!suggestion.show) return null;

  return (
    <div className={`rounded-xl p-3 sm:p-4 border-2 ${
      suggestion.direction === 'up' 
        ? 'bg-green-500/10 border-green-500/40' 
        : 'bg-red-500/10 border-red-500/40'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 sm:p-2.5 rounded-xl ${
          suggestion.direction === 'up' ? 'bg-green-500/20' : 'bg-red-500/20'
        }`}>
          {suggestion.direction === 'up' ? (
            <TrendingUp size={20} className="text-green-400" />
          ) : (
            <TrendingDown size={20} className="text-red-400" />
          )}
        </div>
        <div className="flex-1">
          <p className={`text-sm sm:text-base font-bold ${
            suggestion.direction === 'up' ? 'text-green-400' : 'text-red-400'
          }`}>
            💡 Consider {suggestion.direction.toUpperCase()}
          </p>
          <p className="text-xs sm:text-sm text-gray-400">{suggestion.reason}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
          suggestion.confidence === 'high' ? 'bg-green-500/30 text-green-300' :
          suggestion.confidence === 'medium' ? 'bg-yellow-500/30 text-yellow-300' :
          'bg-gray-500/30 text-gray-300'
        }`}>
          {suggestion.confidence}
        </span>
      </div>
    </div>
  );
};

// ==================== REFERRAL POPUP ====================
const ReferralPopup = ({ isOpen, onClose, onGo }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-sm border border-purple-500/40 shadow-2xl">
        <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-5 sm:p-6 text-center rounded-t-2xl">
          <button onClick={onClose} className="absolute top-3 right-3 text-white/80 hover:text-white p-1">
            <X size={20} />
          </button>
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
            <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">🎁 Earn 25%!</h2>
          <p className="text-white/80 text-sm sm:text-base mt-1">Commission on every referral!</p>
        </div>

        <div className="p-4 sm:p-5">
          <div className="space-y-3 mb-4">
            {[
              { icon: Share2, text: 'Share your unique link', color: 'text-blue-400' },
              { icon: Users, text: 'Friends sign up & bet', color: 'text-green-400' },
              { icon: Coins, text: 'Earn 25% of their first bet!', color: 'text-yellow-400' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl">
                <item.icon className={item.color} size={20} />
                <span className="text-gray-200 text-sm sm:text-base">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center mb-4">
            <p className="text-yellow-400 text-sm sm:text-base font-bold">
              ⭐ Unlimited Referrals = Unlimited Earnings!
            </p>
          </div>

          <button
            onClick={onGo}
            className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2"
          >
            <Gift size={20} /> Start Referring Now!
          </button>
          <button onClick={onClose} className="w-full mt-2 py-2 text-gray-500 text-sm">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== USER GUIDE ====================
const UserGuide = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    { icon: Target, title: "Welcome! 🎯", text: "Predict BTC price: UP or DOWN in 5 minutes!", tip: "Simple prediction game!" },
    { icon: Clock, title: "Rounds ⏰", text: "5 min betting → 5 min locked → Result!", tip: "New round starts when one locks!" },
    { icon: DollarSign, title: "Bet 💰", text: "Choose amount (min ₦100) → Pick UP or DOWN", tip: "Higher bets = Higher potential wins!" },
    { icon: Trophy, title: "Win 🏆", text: "Correct = Your bet + 70% of losers' pool!", tip: "More opponents = Bigger wins!" },
    { icon: BarChart3, title: "Helpers 📊", text: "Use Trend, Sentiment, Streaks for hints!", tip: "Smart tools to help you decide!" },
    { icon: Gift, title: "Refer 🎁", text: "Earn 25% from friends' first bet!", tip: "Share & earn forever!" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-purple-600 p-5 text-center relative">
          <button onClick={onClose} className="absolute top-3 right-3 text-white/80"><X size={20} /></button>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            {(() => { const Icon = steps[step].icon; return <Icon className="text-white" size={32} />; })()}
          </div>
          <h2 className="text-xl font-bold text-white">{steps[step].title}</h2>
        </div>

        <div className="p-5">
          <p className="text-gray-300 text-center text-base mb-3">{steps[step].text}</p>
          
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-start gap-2 mb-4">
            <Info className="text-primary flex-shrink-0 mt-0.5" size={16} />
            <p className="text-sm text-primary">{steps[step].tip}</p>
          </div>
          
          <div className="flex justify-center gap-2 mb-4">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-primary' : 'w-2 bg-gray-600'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold">
                ← Back
              </button>
            )}
            <button
              onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onClose()}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-bold"
            >
              {step < steps.length - 1 ? 'Next →' : '✓ Start Trading!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== FLOATING BUTTONS ====================
const FloatingButtons = ({ onReferral }) => (
  <>
    <button
      onClick={onReferral}
      className="fixed bottom-24 sm:bottom-8 right-4 z-40 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/40"
    >
      <Gift className="text-white" size={24} />
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">$</span>
    </button>

    <a
      href="https://t.me/Iacafevtu1"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 sm:bottom-8 left-4 z-40 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40"
    >
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
      </svg>
    </a>
  </>
);

// ==================== TRADING CHART ====================
const TradingChart = ({ priceHistory = [], startPrice = 0, isLocked = false, roundId }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    try {
      const chart = createChart(containerRef.current, {
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#9ca3af' },
        grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#334155' },
        rightPriceScale: { borderColor: '#334155', scaleMargins: { top: 0.1, bottom: 0.1 } },
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

      if (startPrice > 0) {
        series.createPriceLine({ price: startPrice, color: '#f59e0b', lineWidth: 1, lineStyle: 2, title: 'Entry' });
      }

      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ 
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight
          });
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) chartRef.current.remove();
      };
    } catch (err) {
      console.error('Chart error:', err);
    }
  }, [roundId, isLocked, startPrice]);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !priceHistory || priceHistory.length === 0) return;

    try {
      const data = priceHistory
        .filter(item => item?.price > 0)
        .map(item => ({
          time: typeof item.time === 'number' ? Math.floor(item.time / 1000) : Math.floor(Date.now() / 1000),
          value: parseFloat(item.price),
        }))
        .sort((a, b) => a.time - b.time);

      const unique = [];
      const seen = new Set();
      for (const d of data) {
        if (!seen.has(d.time)) { unique.push(d); seen.add(d.time); }
      }

      if (unique.length > 0) {
        seriesRef.current.setData(unique);
        chartRef.current.timeScale().fitContent();
      }
    } catch (err) {}
  }, [priceHistory]);

  return (
    <div className="relative bg-slate-900/50 rounded-xl overflow-hidden h-40 sm:h-48 md:h-56">
      <div ref={containerRef} className="w-full h-full" />
      {(!priceHistory || priceHistory.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Activity className="w-6 h-6 text-primary animate-pulse" />
        </div>
      )}
      {isLocked && (
        <div className="absolute top-2 right-2 bg-amber-500/20 rounded-lg px-2 py-1 flex items-center gap-1">
          <Lock size={10} className="text-amber-400" />
          <span className="text-amber-400 text-xs font-bold">LOCKED</span>
        </div>
      )}
    </div>
  );
};

// ==================== POOL INDICATOR ====================
const PoolIndicator = ({ totalUp = 0, totalDown = 0, upBets = 0, downBets = 0, isLocked = false }) => {
  const total = totalUp + totalDown;
  const upPercent = total > 0 ? (totalUp / total) * 100 : 50;
  const downPercent = 100 - upPercent;
  const upMult = totalUp > 0 && totalDown > 0 ? roundToTwo(1 + (totalDown * 0.7) / totalUp) : 1;
  const downMult = totalDown > 0 && totalUp > 0 ? roundToTwo(1 + (totalUp * 0.7) / totalDown) : 1;

  return (
    <div className="bg-slate-800/60 rounded-xl p-3 sm:p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm sm:text-base text-white font-bold flex items-center gap-2">
          <Users size={16} className="text-primary" />
          {isLocked ? 'Final Pool' : 'Live Pool'}
        </span>
        {!isLocked && (
          <span className="text-xs sm:text-sm text-green-400 font-bold flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            LIVE
          </span>
        )}
      </div>
      
      <div className="h-4 sm:h-5 bg-slate-700 rounded-full overflow-hidden flex mb-3">
        <div 
          className="bg-gradient-to-r from-green-600 to-green-400 flex items-center justify-center transition-all duration-500"
          style={{ width: `${upPercent}%` }}
        >
          {upPercent > 20 && <span className="text-xs text-white font-bold">{upPercent.toFixed(0)}%</span>}
        </div>
        <div 
          className="bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center transition-all duration-500"
          style={{ width: `${downPercent}%` }}
        >
          {downPercent > 20 && <span className="text-xs text-white font-bold">{downPercent.toFixed(0)}%</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-green-500/10 p-2.5 sm:p-3 rounded-xl border border-green-500/30">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="text-green-400" size={16} />
              <span className="text-green-400 font-bold text-sm sm:text-base">UP</span>
            </div>
            <span className="text-xs sm:text-sm text-green-300 bg-green-500/20 px-1.5 py-0.5 rounded font-bold">
              {upMult}x
            </span>
          </div>
          <p className="text-green-400 font-bold text-base sm:text-lg">₦{formatCurrency(totalUp)}</p>
          <p className="text-xs sm:text-sm text-gray-400">{upBets} bets</p>
        </div>
        
        <div className="bg-red-500/10 p-2.5 sm:p-3 rounded-xl border border-red-500/30">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="text-red-400" size={16} />
              <span className="text-red-400 font-bold text-sm sm:text-base">DOWN</span>
            </div>
            <span className="text-xs sm:text-sm text-red-300 bg-red-500/20 px-1.5 py-0.5 rounded font-bold">
              {downMult}x
            </span>
          </div>
          <p className="text-red-400 font-bold text-base sm:text-lg">₦{formatCurrency(totalDown)}</p>
          <p className="text-xs sm:text-sm text-gray-400">{downBets} bets</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center">
        <span className="text-sm text-gray-400">Total Pool</span>
        <span className="text-white font-bold text-lg sm:text-xl">₦{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

// ==================== PREV ROUND CARD ====================
const PrevRoundCard = ({ round }) => {
  if (!round) return null;
  const change = parseFloat(round.percentChange || 0);

  return (
    <div className="bg-slate-800/70 rounded-xl p-3 sm:p-4 border border-slate-700 min-w-[150px] sm:min-w-[170px] flex-shrink-0">
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs sm:text-sm text-gray-400">#{round.roundNumber}</p>
        <span className={`px-2 py-0.5 rounded-lg text-xs sm:text-sm font-bold ${
          round.result === 'up' ? 'bg-green-500/20 text-green-400' :
          round.result === 'down' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {round.result === 'up' ? '📈 UP' : round.result === 'down' ? '📉 DOWN' : '➖ TIE'}
        </span>
      </div>

      <div className="flex justify-between text-xs sm:text-sm mb-2">
        <div>
          <p className="text-gray-500">Start</p>
          <p className="text-white font-medium">${formatCompact(parseFloat(round.startPrice || 0))}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">End</p>
          <p className="text-white font-medium">${formatCompact(parseFloat(round.endPrice || 0))}</p>
        </div>
      </div>

      <div className={`text-center py-1.5 rounded-lg ${change >= 0 ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
        <span className={`text-sm sm:text-base font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(3)}%
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
    <div className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 ${
      isUp ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 sm:p-2.5 rounded-xl ${isUp ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {isUp ? <ArrowUpRight className="text-green-400" size={20} /> : <ArrowDownRight className="text-red-400" size={20} />}
        </div>
        <div>
          <p className="text-white text-base sm:text-lg font-bold">₦{formatCurrency(amt)}</p>
          <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1">
            #{bet.roundNumber}
            {bet.roundStatus === 'locked' && <Lock size={10} className="text-amber-400" />}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-xs sm:text-sm ${isUp ? 'text-green-400' : 'text-red-400'}`}>{mult}x</p>
        <p className={`text-base sm:text-lg font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          ₦{formatCurrency(payout)}
        </p>
        {bet.isCurrentlyWinning !== undefined && (
          <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded ${
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

  // States
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

  // Calculated
  const walletBalance = parseFloat(walletData?.nairaBalance || 0);
  const lockedBalance = parseFloat(walletData?.lockedBalance || 0);
  const availableBalance = roundToTwo(Math.max(0, walletBalance - lockedBalance));
  const activePriceChange = activeStartPrice > 0 ? ((currentPrice - activeStartPrice) / activeStartPrice) * 100 : 0;
  const lockedPriceChange = lockedStartPrice > 0 ? ((currentPrice - lockedStartPrice) / lockedStartPrice) * 100 : 0;
  const canBet = activeRound?.status === 'active' && activeTimeLeft >= 10;

  // Payout calculator
  const calcPayout = useCallback((prediction) => {
    if (!activeRound || betAmount <= 0) return { payout: 0, profit: 0, multiplier: 1.7, hasOpponents: false };

    let totalUp = parseFloat(activeRound.totalUpAmount || 0);
    let totalDown = parseFloat(activeRound.totalDownAmount || 0);

    if (prediction === 'up') totalUp += betAmount;
    else totalDown += betAmount;

    const hasOpponents = prediction === 'up' ? totalDown > 0 : totalUp > 0;
    if (!hasOpponents) return { payout: betAmount, profit: 0, multiplier: 1.0, hasOpponents: false };

    const mult = prediction === 'up'
      ? roundToTwo(1 + (totalDown * 0.7) / totalUp)
      : roundToTwo(1 + (totalUp * 0.7) / totalDown);

    return { payout: roundToTwo(betAmount * mult), profit: roundToTwo(betAmount * mult - betAmount), multiplier: mult, hasOpponents: true };
  }, [activeRound, betAmount]);

  // First visit
  useEffect(() => {
    if (!localStorage.getItem('hasSeenGuide') && user) {
      setShowGuide(true);
      localStorage.setItem('hasSeenGuide', 'true');
    }
  }, [user]);

  // Init
  useEffect(() => { if (user) initDashboard(); }, [user]);

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
    const interval = setInterval(() => { fetchRounds(); fetchBets(); }, 3000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch functions
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
        if (data.lockedRound) { setLockedRound(data.lockedRound); setLockedStartPrice(parseFloat(data.lockedRound.startPrice || 0)); }
        else { setLockedRound(null); }
        if (data.activeRound) { setActiveRound(data.activeRound); setActiveStartPrice(parseFloat(data.activeRound.startPrice || 0)); }
        else { setActiveRound(null); }
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
        if (lockedRound) setLockedPriceHistory(prev => [...prev.slice(-119), entry]);
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

  // Socket
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
      setActiveRound(prev => prev?.id === data.roundId ? { ...prev, ...data } : prev);
    };

    const onRoundStart = (data) => {
      fetchRounds(); fetchBets();
      if (data.startPrice) setActiveStartPrice(parseFloat(data.startPrice));
      toast.success(`🚀 Round #${data.roundNumber} Started!`);
      setActiveSlide(1);
    };

    const onRoundLocked = (data) => {
      setLockedPriceHistory([...priceHistory]);
      setLockedStartPrice(parseFloat(data.startPrice || 0));
      fetchRounds(); fetchBets();
      toast('🔒 Betting closed!', { icon: '⏰' });
    };

    const onRoundCompleted = (data) => {
      fetchRounds(); fetchBets(); fetchWallet();
      toast.success(`${data.result === 'up' ? '📈' : data.result === 'down' ? '📉' : '➖'} Result: ${data.result?.toUpperCase()}!`);
    };

    const onBetResult = (data) => {
      fetchBets(); fetchWallet();
      if (data.result === 'win') toast.success(`🎉 Won ₦${formatCurrency(data.payout)}!`);
      else if (data.result === 'loss') toast.error(`Lost ₦${formatCurrency(Math.abs(data.profit || data.amount))}`);
      else if (data.result === 'refund') toast.success(`🔄 Refunded ₦${formatCurrency(data.payout)}`);
    };

    const onBalanceUpdate = (data) => setWalletData(prev => ({ ...prev, ...data }));

    socket.on('price_update', onPriceUpdate);
    socket.on('bet_placed', onBetPlaced);
    socket.on('round_start', onRoundStart);
    socket.on('round_locked', onRoundLocked);
    socket.on('round_completed', onRoundCompleted);
    socket.on('bet_result', onBetResult);
    socket.on('balance_update', onBalanceUpdate);

    return () => {
      socket.off('price_update'); socket.off('bet_placed'); socket.off('round_start');
      socket.off('round_locked'); socket.off('round_completed'); socket.off('bet_result'); socket.off('balance_update');
    };
  }, [socket, isConnected, priceHistory, lockedRound]);

  // Timers
  useEffect(() => {
    const update = () => {
      const now = Date.now();
      if (activeRound?.lockTime) setActiveTimeLeft(Math.max(0, Math.floor((new Date(activeRound.lockTime).getTime() - now) / 1000)));
      if (lockedRound?.endTime) setLockedTimeLeft(Math.max(0, Math.floor((new Date(lockedRound.endTime).getTime() - now) / 1000)));
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [activeRound, lockedRound]);

  // Place bet
  const handlePlaceBet = async (prediction) => {
    if (!activeRound || activeRound.status !== 'active') return toast.error('No active round');
    if (activeTimeLeft < 10) return toast.error('Too late!');
    if (!betAmount || betAmount < 100) return toast.error('Min ₦100');
    if (betAmount > 100000) return toast.error('Max ₦100,000');
    if (betAmount > availableBalance) return toast.error('Insufficient balance');

    setLoading(true);
    try {
      await api.post('/trading/bet', { roundId: activeRound.id, prediction: prediction.toLowerCase(), amount: betAmount });
      toast.success(`✅ Bet ₦${formatCurrency(betAmount)} on ${prediction.toUpperCase()}!`);
      await Promise.all([fetchBets(), fetchRounds(), fetchWallet()]);
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  // Loading
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-28 sm:pb-8">
      <UserGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <ReferralPopup isOpen={showReferralPopup} onClose={() => setShowReferralPopup(false)} onGo={() => { setShowReferralPopup(false); navigate('/referrals'); }} />
      <FloatingButtons onReferral={() => setShowReferralPopup(true)} />

      {/* Connection */}
      {!isConnected && (
        <div className="bg-yellow-500/10 px-4 py-3 flex items-center justify-center gap-2">
          <WifiOff className="text-yellow-500 animate-pulse" size={18} />
          <p className="text-yellow-500 text-sm font-medium">Reconnecting...</p>
        </div>
      )}

      <div className="px-4 py-4 sm:px-6 sm:py-6 max-w-2xl mx-auto space-y-4 sm:space-y-6">
        
        {/* ===== HEADER ===== */}
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 bg-primary/20 rounded-xl">
                <Activity className="text-primary" size={22} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">Wealth Trading</h1>
                <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1.5">
                  BTC/USD • 5min
                  {isConnected && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowGuide(true)} className="p-2.5 sm:p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition">
                <HelpCircle size={18} className="text-gray-400" />
              </button>
              <button onClick={handleRefresh} className="p-2.5 sm:p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition" disabled={refreshing}>
                <RefreshCw size={18} className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Balance */}
          <div className="bg-gradient-to-r from-green-500/15 to-emerald-500/15 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">Available Balance</p>
              <p className="text-2xl sm:text-3xl font-black text-green-400">₦{formatCurrency(availableBalance)}</p>
              {lockedBalance > 0 && (
                <p className="text-xs sm:text-sm text-orange-400 flex items-center gap-1 mt-1">
                  <Lock size={12} /> ₦{formatCurrency(lockedBalance)} in bets
                </p>
              )}
            </div>
            <div className="p-3 sm:p-4 bg-green-500/20 rounded-xl">
              <WalletIcon className="text-green-400" size={28} />
            </div>
          </div>
        </div>

        {/* ===== LIVE PRICE ===== */}
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500/20 rounded-xl">
                <TrendingUp className="text-orange-400" size={20} />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1.5">
                  Live BTC/USD
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </p>
                <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {activeStartPrice > 0 && (
              <div className={`px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 ${
                activePriceChange >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {activePriceChange >= 0 ? <TrendingUp size={18} className="text-green-400" /> : <TrendingDown size={18} className="text-red-400" />}
                <span className={`text-base sm:text-lg font-bold tabular-nums ${activePriceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {activePriceChange >= 0 ? '+' : ''}{activePriceChange.toFixed(3)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ===== PREDICTION HELPERS ===== */}
        <div>
          <button onClick={() => setShowHelpers(!showHelpers)} className="flex items-center justify-between w-full text-sm text-gray-400 mb-3 px-1">
            <span className="flex items-center gap-2 font-medium">
              <BarChart3 size={16} className="text-primary" /> Prediction Helpers
            </span>
            {showHelpers ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showHelpers && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TrendAnalyzer priceHistory={priceHistory} currentPrice={currentPrice} startPrice={activeStartPrice} />
                <PoolSentiment 
                  totalUp={parseFloat(activeRound?.totalUpAmount || 0)}
                  totalDown={parseFloat(activeRound?.totalDownAmount || 0)}
                  upBets={activeRound?.totalUpBets || 0}
                  downBets={activeRound?.totalDownBets || 0}
                />
              </div>
              <RecentStreak previousRounds={previousRounds} />
              <SmartSuggestion 
                priceHistory={priceHistory} currentPrice={currentPrice} startPrice={activeStartPrice}
                totalUp={parseFloat(activeRound?.totalUpAmount || 0)} totalDown={parseFloat(activeRound?.totalDownAmount || 0)}
                previousRounds={previousRounds} activeTimeLeft={activeTimeLeft}
              />
            </div>
          )}
        </div>

        {/* ===== PREVIOUS ROUNDS ===== */}
        {previousRounds.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 mb-2 px-1 flex items-center gap-2">
              <History size={14} className="text-primary" /> Recent Rounds
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {previousRounds.map(round => <PrevRoundCard key={round.id} round={round} />)}
            </div>
          </div>
        )}

        {/* ===== SLIDE TABS ===== */}
        <div className="flex gap-2 bg-slate-900/50 rounded-xl p-2">
          {[
            { id: 0, label: '🔒 Locked', active: !!lockedRound },
            { id: 1, label: '🔴 LIVE', active: !!activeRound },
            { id: 2, label: '⏳ Next', active: true }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSlide(s.id)}
              className={`flex-1 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all ${
                activeSlide === s.id 
                  ? s.id === 1 ? 'bg-red-500/20 text-red-400 border-2 border-red-500/40' : 'bg-primary/20 text-primary border-2 border-primary/40'
                  : 'bg-slate-800/50 text-gray-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ===== SLIDES ===== */}
        <div className="overflow-hidden rounded-2xl">
          <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
            
            {/* LOCKED */}
            <div className="min-w-full">
              {lockedRound ? (
                <div className="bg-gradient-to-b from-amber-900/20 to-slate-900/60 rounded-2xl p-4 sm:p-5 border-2 border-amber-500/40">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Lock className="text-amber-400" size={18} />
                      <span className="text-white font-bold text-base sm:text-lg">Round #{lockedRound.roundNumber}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-xl ${lockedTimeLeft < 30 ? 'bg-red-500/20 border border-red-500/40' : 'bg-amber-500/20 border border-amber-500/40'}`}>
                      <span className={`text-xl sm:text-2xl font-mono font-bold ${lockedTimeLeft < 30 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                        {formatTime(lockedTimeLeft)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-800/60 p-3 rounded-xl">
                      <p className="text-xs sm:text-sm text-gray-500">Entry</p>
                      <p className="text-white font-bold text-base sm:text-lg">${lockedStartPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-800/60 p-3 rounded-xl">
                      <p className="text-xs sm:text-sm text-gray-500">Change</p>
                      <p className={`font-bold text-base sm:text-lg flex items-center gap-1 ${lockedPriceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {lockedPriceChange >= 0 ? '↑' : '↓'} {Math.abs(lockedPriceChange).toFixed(3)}%
                      </p>
                    </div>
                  </div>

                  <TradingChart priceHistory={lockedPriceHistory.length > 0 ? lockedPriceHistory : priceHistory} startPrice={lockedStartPrice} isLocked={true} roundId={`locked-${lockedRound.id}`} />
                  
                  <div className="mt-4">
                    <PoolIndicator totalUp={parseFloat(lockedRound.totalUpAmount || 0)} totalDown={parseFloat(lockedRound.totalDownAmount || 0)} upBets={lockedRound.totalUpBets || 0} downBets={lockedRound.totalDownBets || 0} isLocked={true} />
                  </div>

                  <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
                    <p className="text-amber-400 text-sm sm:text-base flex items-center justify-center gap-2">
                      <Eye size={16} /> Waiting for result...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/30 rounded-2xl p-10 text-center border-2 border-dashed border-slate-700">
                  <Lock className="text-gray-600 mx-auto mb-3" size={40} />
                  <p className="text-gray-400 text-base sm:text-lg">No locked round</p>
                  <p className="text-gray-600 text-sm mt-1">Shows when betting closes</p>
                </div>
              )}
            </div>

            {/* ACTIVE */}
            <div className="min-w-full">
              {activeRound ? (
                <div className="bg-slate-800/60 rounded-2xl p-4 sm:p-5 border-2 border-primary/40">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="text-white font-bold text-base sm:text-lg">Round #{activeRound.roundNumber}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-xl ${
                      activeTimeLeft < 30 ? 'bg-red-500/20 border border-red-500/40' : 
                      activeTimeLeft < 60 ? 'bg-yellow-500/20 border border-yellow-500/40' : 
                      'bg-slate-800 border border-slate-700'
                    }`}>
                      <span className={`text-xl sm:text-2xl font-mono font-bold ${
                        activeTimeLeft < 30 ? 'text-red-400 animate-pulse' : activeTimeLeft < 60 ? 'text-yellow-400' : 'text-primary'
                      }`}>
                        {formatTime(activeTimeLeft)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-900/60 p-3 rounded-xl">
                      <p className="text-xs sm:text-sm text-gray-500">Entry</p>
                      <p className="text-white font-bold text-base sm:text-lg">${activeStartPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl">
                      <p className="text-xs sm:text-sm text-gray-500">Change</p>
                      <p className={`font-bold text-base sm:text-lg flex items-center gap-1 ${activePriceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {activePriceChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {activePriceChange >= 0 ? '+' : ''}{activePriceChange.toFixed(3)}%
                      </p>
                    </div>
                  </div>

                  <TradingChart priceHistory={priceHistory} startPrice={activeStartPrice} isLocked={false} roundId={`active-${activeRound.id}`} />

                  <div className="mt-4">
                    <PoolIndicator totalUp={parseFloat(activeRound.totalUpAmount || 0)} totalDown={parseFloat(activeRound.totalDownAmount || 0)} upBets={activeRound.totalUpBets || 0} downBets={activeRound.totalDownBets || 0} />
                  </div>

                  {/* BET BUTTONS */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {['up', 'down'].map(pred => {
                      const calc = calcPayout(pred);
                      const isUp = pred === 'up';
                      return (
                        <button
                          key={pred}
                          onClick={() => handlePlaceBet(pred)}
                          disabled={loading || !canBet}
                          className={`relative p-4 sm:p-5 rounded-xl border-2 transition-all disabled:opacity-50 ${
                            isUp ? 'bg-green-500/10 border-green-500/50 hover:border-green-400' : 'bg-red-500/10 border-red-500/50 hover:border-red-400'
                          }`}
                        >
                          <div className={`p-2 rounded-xl mx-auto w-fit mb-2 ${isUp ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            {isUp ? <ArrowUpRight className="text-green-400" size={28} /> : <ArrowDownRight className="text-red-400" size={28} />}
                          </div>
                          <p className={`font-black text-base sm:text-lg ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            {pred.toUpperCase()}
                          </p>

                          {betAmount > 0 && (
                            <div className="mt-3 pt-3 border-t border-current/20 space-y-1">
                              {calc.hasOpponents ? (
                                <>
                                  <p className={`text-sm font-bold ${isUp ? 'text-green-300' : 'text-red-300'}`}>{calc.multiplier}x</p>
                                  <p className={`text-lg sm:text-xl font-black ${isUp ? 'text-green-400' : 'text-red-400'}`}>₦{formatCurrency(calc.payout)}</p>
                                  <p className={`text-xs ${isUp ? 'text-green-300' : 'text-red-300'}`}>+₦{formatCurrency(calc.profit)}</p>
                                </>
                              ) : (
                                <p className="text-xs text-yellow-400">Refund if win</p>
                              )}
                            </div>
                          )}

                          {loading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                              <Loader2 className="animate-spin text-white" size={24} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {!canBet && activeTimeLeft < 10 && activeTimeLeft > 0 && (
                    <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
                      <p className="text-red-400 text-sm flex items-center justify-center gap-2">
                        <AlertCircle size={16} /> Round ending soon
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-800/30 rounded-2xl p-10 text-center border-2 border-dashed border-slate-700">
                  <Clock className="text-gray-600 mx-auto mb-3 animate-pulse" size={40} />
                  <p className="text-gray-400 text-base sm:text-lg">Waiting for round...</p>
                  <button onClick={handleRefresh} className="mt-4 px-6 py-3 bg-primary text-white rounded-xl font-medium">Refresh</button>
                </div>
              )}
            </div>

            {/* UPCOMING */}
            <div className="min-w-full">
              <div className="bg-slate-800/40 rounded-2xl p-8 sm:p-10 text-center border-2 border-blue-500/30">
                <div className="p-4 bg-blue-500/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Play className="text-blue-400" size={36} />
                </div>
                <h3 className="text-white font-bold text-lg sm:text-xl mb-2">Next Round</h3>
                <p className="text-gray-400 text-sm sm:text-base mb-4">Starts when current round locks</p>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-blue-400 text-sm sm:text-base flex items-center justify-center gap-2">
                    <Zap size={16} /> Prepare your bet amount!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== BET AMOUNT ===== */}
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm sm:text-base text-white font-bold flex items-center gap-2">
              <DollarSign size={18} className="text-primary" /> Bet Amount
            </span>
            <span className="text-xs sm:text-sm text-gray-400">
              Balance: <span className="text-green-400 font-bold">₦{formatCurrency(availableBalance)}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {[100, 500, 1000, 2000, 5000, 10000, 50000].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={amt > availableBalance}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all ${
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
              className="w-20 sm:w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm sm:text-base text-center focus:border-primary outline-none"
              placeholder="Custom"
              min="100"
              max="100000"
            />
          </div>

          <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-500">
            <span>Min: ₦100</span>
            <span>•</span>
            <span>Max: ₦100K</span>
            <span>•</span>
            <span className="text-primary flex items-center gap-1"><Shield size={12} /> No fees!</span>
          </div>
        </div>

        {/* ===== MY BETS ===== */}
        {myActiveBets.length > 0 && (
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm sm:text-base text-white font-bold flex items-center gap-2">
                <Activity size={18} className="text-primary" /> My Bets
              </span>
              <span className="text-xs sm:text-sm text-primary bg-primary/10 px-3 py-1 rounded-full font-bold">
                {myActiveBets.length} active
              </span>
            </div>
            <div className="space-y-3">
              {myActiveBets.slice(0, 5).map(bet => <MyBetCard key={bet.id} bet={bet} />)}
              {myActiveBets.length > 5 && <p className="text-center text-sm text-gray-500">+{myActiveBets.length - 5} more</p>}
            </div>
          </div>
        )}

        {/* ===== REFERRAL CTA ===== */}
        <button
          onClick={() => navigate('/referrals')}
          className="w-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-2 border-purple-500/40 rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:from-purple-600/30 hover:to-pink-600/30 transition"
        >
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Gift className="text-purple-400" size={24} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white text-base sm:text-lg font-bold">🎁 Refer & Earn 25%!</p>
            <p className="text-gray-400 text-sm">Share your link & earn from bets</p>
          </div>
          <ChevronRight className="text-gray-400" size={20} />
        </button>

        {/* ===== QUICK STATS ===== */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/60 rounded-xl p-3 sm:p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Active Bets</p>
            <p className="text-lg sm:text-xl font-bold text-white">{myActiveBets.length}</p>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 sm:p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">In Play</p>
            <p className="text-lg sm:text-xl font-bold text-orange-400">₦{formatCompact(lockedBalance)}</p>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 sm:p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Rounds</p>
            <p className="text-lg sm:text-xl font-bold text-primary">{previousRounds.length + (activeRound ? 1 : 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
