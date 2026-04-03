

import { useState, useEffect, useRef, useCallback } from 'react';
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
  History
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

// ==================== SAFE WRAPPER - PREVENTS BLANK PAGE ====================
const SafeRender = ({ children, fallback }) => {
  try {
    return children;
  } catch (error) {
    console.error('Render error:', error);
    return fallback || <div className="p-4 text-center text-gray-400">Loading...</div>;
  }
};

// ==================== REFERRAL PROMO POPUP ====================
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
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">🎁 Earn 25% Commission!</h2>
        </div>

        <div className="p-4">
          <p className="text-gray-300 text-sm text-center mb-3">
            Refer friends and earn <span className="text-green-400 font-bold">25%</span> from their first bet!
          </p>

          <div className="space-y-2 mb-4">
            {[
              { icon: Sparkles, text: 'Easy Money: Share & get paid!', color: 'green' },
              { icon: Users, text: 'Unlimited: No cap on earnings!', color: 'purple' },
              { icon: Zap, text: 'Instant: Auto-credited!', color: 'orange' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <item.icon className={`text-${item.color}-400 flex-shrink-0`} size={14} />
                <span className="text-gray-300">{item.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onGoToReferral}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm"
          >
            Start Referring Now!
          </button>
          <button onClick={onClose} className="w-full mt-2 py-2 text-gray-500 text-sm">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== FLOATING BUTTONS (MOBILE OPTIMIZED) ====================
const FloatingButtons = ({ onReferralClick }) => {
  return (
    <>
      {/* Referral Button */}
      <button
        onClick={onReferralClick}
        className="fixed bottom-20 right-3 z-30 w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg"
      >
        <Gift className="text-white" size={20} />
      </button>

      {/* Support Button */}
      <a
        href="https://t.me/Iacafevtu1"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 left-3 z-30 w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg"
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
        </svg>
      </a>
    </>
  );
};

// ==================== TRADING CHART (BULLETPROOF - NO CRASH) ====================
const TradingChart = ({ priceHistory = [], startPrice = 0, isLocked = false, roundId }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLineRef = useRef(null);
  const initRef = useRef(false);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || initRef.current) return;
    
    try {
      initRef.current = true;
      
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
        height: 180,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: '#334155',
        },
        rightPriceScale: {
          borderColor: '#334155',
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
        initRef.current = false;
      };
    } catch (err) {
      console.error('Chart init error:', err);
    }
  }, [roundId]);

  // Update color when locked state changes
  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.applyOptions({
        lineColor: isLocked ? '#f59e0b' : '#6366f1',
        topColor: isLocked ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)',
      });
    }
  }, [isLocked]);

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
        title: 'Start',
      });
    } catch (err) {
      console.error('Price line error:', err);
    }
  }, [startPrice]);

  // Update chart data
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
    } catch (err) {
      console.error('Chart update error:', err);
    }
  }, [priceHistory]);

  return (
    <div className="relative bg-slate-900/50 rounded-xl overflow-hidden">
      <div ref={chartContainerRef} className="w-full h-[180px]" />
      {(!priceHistory || priceHistory.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Activity className="w-6 h-6 text-primary animate-pulse" />
        </div>
      )}
      {isLocked && (
        <div className="absolute top-2 right-2 bg-amber-500/20 rounded px-2 py-0.5 flex items-center gap-1">
          <Lock size={10} className="text-amber-500" />
          <span className="text-amber-500 text-[10px] font-bold">Locked</span>
        </div>
      )}
    </div>
  );
};

// ==================== POOL INDICATOR (MOBILE OPTIMIZED) ====================
const PoolIndicator = ({ totalUp = 0, totalDown = 0, upBets = 0, downBets = 0, isLocked = false }) => {
  const total = totalUp + totalDown;
  const upPercent = total > 0 ? (totalUp / total) * 100 : 50;
  const downPercent = total > 0 ? (totalDown / total) * 100 : 50;

  return (
    <div className="bg-slate-900/50 rounded-xl p-3">
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
      
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden flex mb-2">
        <div 
          className="bg-gradient-to-r from-green-600 to-green-400 flex items-center justify-center"
          style={{ width: `${upPercent}%` }}
        >
          {upPercent > 20 && <span className="text-[8px] text-white font-bold">{upPercent.toFixed(0)}%</span>}
        </div>
        <div 
          className="bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center"
          style={{ width: `${downPercent}%` }}
        >
          {downPercent > 20 && <span className="text-[8px] text-white font-bold">{downPercent.toFixed(0)}%</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-green-500/10 p-2 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="text-green-500" size={12} />
            <span className="text-green-500 font-bold text-xs">UP</span>
            <span className="text-[10px] text-gray-400">({upBets})</span>
          </div>
          <p className="text-green-500 font-bold text-sm">₦{formatCurrency(totalUp)}</p>
        </div>
        <div className="bg-red-500/10 p-2 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="text-red-500" size={12} />
            <span className="text-red-500 font-bold text-xs">DOWN</span>
            <span className="text-[10px] text-gray-400">({downBets})</span>
          </div>
          <p className="text-red-500 font-bold text-sm">₦{formatCurrency(totalDown)}</p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-700 text-center">
        <span className="text-gray-400 text-[10px]">Total: </span>
        <span className="text-white font-bold text-sm">₦{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

// ==================== PREVIOUS ROUND CARD (MOBILE) ====================
const PrevRoundCard = ({ round }) => {
  if (!round) return null;

  const change = parseFloat(round.percentChange || 0);

  return (
    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700 min-w-[140px] flex-shrink-0">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] text-gray-500">#{round.roundNumber}</p>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
          round.result === 'up' ? 'bg-green-500/20 text-green-500' :
          round.result === 'down' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
        }`}>
          {round.result === 'up' ? '📈' : round.result === 'down' ? '📉' : '➖'}
        </span>
      </div>

      <div className="space-y-1 mb-2">
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-500">Start:</span>
          <span className="text-white font-medium">${parseFloat(round.startPrice || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-500">End:</span>
          <span className="text-white font-medium">${parseFloat(round.endPrice || 0).toLocaleString()}</span>
        </div>
      </div>

      <div className={`text-center py-1 rounded ${change >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
        <span className={`text-xs font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(3)}%
        </span>
      </div>
    </div>
  );
};

// ==================== USER GUIDE MODAL ====================
const UserGuideModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    { icon: Target, title: "Welcome! 🎯", text: "Predict BTC UP ⬆️ or DOWN ⬇️" },
    { icon: Clock, title: "Rounds ⏰", text: "5 min betting → 5 min locked → Result!" },
    { icon: DollarSign, title: "Bet 💰", text: "Min ₦100 • Select amount • Pick direction" },
    { icon: Trophy, title: "Win 🏆", text: "Correct = Your bet + 70% of losers' pool!" },
    { icon: Gift, title: "Refer 🎁", text: "Earn 25% from friends' first bet!" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
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
          <p className="text-gray-300 text-center mb-4">{steps[step].text}</p>
          
          <div className="flex justify-center gap-1 mb-4">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-gray-600'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2 bg-slate-700 text-white rounded-xl text-sm font-bold"
              >
                Back
              </button>
            )}
            <button
              onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onClose()}
              className="flex-1 py-2 bg-primary text-white rounded-xl text-sm font-bold"
            >
              {step < steps.length - 1 ? 'Next' : 'Start!'}
            </button>
          </div>
        </div>
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
  const [activeSlide, setActiveSlide] = useState(1); // 0=locked, 1=active, 2=upcoming
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

  // ========== CALCULATED ==========
  const walletBalance = parseFloat(walletData?.nairaBalance || 0);
  const lockedBalance = parseFloat(walletData?.lockedBalance || 0);
  const availableBalance = roundToTwo(Math.max(0, walletBalance - lockedBalance));
  const activePriceChange = activeStartPrice > 0 ? ((currentPrice - activeStartPrice) / activeStartPrice) * 100 : 0;
  const lockedPriceChange = lockedStartPrice > 0 ? ((currentPrice - lockedStartPrice) / lockedStartPrice) * 100 : 0;
  const canBet = activeRound?.status === 'active' && activeTimeLeft >= 10;

  // ========== MULTIPLIER CALC ==========
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
    } catch (err) {
      console.error('Wallet error:', err);
    }
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
          setLockedStartPrice(0);
        }
        
        if (data.activeRound) {
          setActiveRound(data.activeRound);
          setActiveStartPrice(parseFloat(data.activeRound.startPrice || 0));
        } else {
          setActiveRound(null);
          setActiveStartPrice(0);
        }
      }
    } catch (err) {
      console.error('Rounds error:', err);
    }
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
    } catch (err) {
      console.error('Price error:', err);
    }
  };

  const fetchBets = async () => {
    try {
      const data = await api.get('/trading/my-bets/active');
      setMyActiveBets(data?.activeBets || []);
    } catch (err) {
      console.error('Bets error:', err);
    }
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
      // DON'T clear price history - just fetch new data
      fetchRounds();
      fetchBets();
      if (data.startPrice) setActiveStartPrice(parseFloat(data.startPrice));
      toast.success(`🚀 Round #${data.roundNumber} Started!`, { duration: 2000 });
      setActiveSlide(1);
    };

    const onRoundLocked = (data) => {
      console.log('🔒 Round locked:', data);
      // Copy current price history to locked
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
        toast.success(`🎉 Won ₦${formatCurrency(data.payout)}!`, { duration: 4000 });
      } else if (data.result === 'loss') {
        toast.error(`Lost ₦${formatCurrency(Math.abs(data.profit || data.amount))}`, { duration: 3000 });
      } else if (data.result === 'refund') {
        toast.success(`🔄 Refunded ₦${formatCurrency(data.payout)}`, { duration: 3000 });
      }
    };

    const onBalanceUpdate = (data) => {
      setWalletData(prev => ({ ...prev, nairaBalance: data.nairaBalance, lockedBalance: data.lockedBalance }));
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
      toast.error('Too late!');
      return;
    }
    if (!betAmount || betAmount < 100) {
      toast.error('Min bet is ₦100');
      return;
    }
    if (betAmount > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      await api.post('/trading/bet', {
        roundId: activeRound.id,
        prediction: prediction.toLowerCase(),
        amount: betAmount
      });
      toast.success(`✅ Bet ₦${formatCurrency(betAmount)} on ${prediction.toUpperCase()}!`);
      await Promise.all([fetchBets(), fetchRounds(), fetchWallet()]);
    } catch (err) {
      toast.error(err.message || 'Failed');
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
          <p className="text-gray-400">Loading...</p>
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
      <FloatingButtons onReferralClick={() => setShowReferralPopup(true)} />

      {/* Connection Banner */}
      {!isConnected && (
        <div className="bg-yellow-500/10 px-3 py-2 flex items-center justify-center gap-2">
          <WifiOff className="text-yellow-500" size={14} />
          <p className="text-yellow-500 text-xs">Reconnecting...</p>
        </div>
      )}

      <div className="p-3 max-w-xl mx-auto space-y-3">
        {/* ===== HEADER ===== */}
        <div className="bg-slate-900/80 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="text-primary" size={20} />
              <h1 className="text-lg font-bold text-white">Wealth Trading</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowGuide(true)} className="p-2 bg-slate-800 rounded-lg">
                <HelpCircle size={16} className="text-gray-400" />
              </button>
              <button onClick={handleRefresh} className="p-2 bg-slate-800 rounded-lg" disabled={refreshing}>
                <RefreshCw size={16} className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Balance */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Available</p>
              <p className="text-xl font-black text-green-400">₦{formatCurrency(availableBalance)}</p>
              {lockedBalance > 0 && (
                <p className="text-[10px] text-orange-400">🔒 ₦{formatCurrency(lockedBalance)} locked</p>
              )}
            </div>
            <WalletIcon className="text-green-500" size={24} />
          </div>
        </div>

        {/* ===== LIVE PRICE ===== */}
        <div className="bg-slate-900/80 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <TrendingUp className="text-orange-500" size={18} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  BTC/USD
                  {isConnected && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                </p>
                <p className="text-xl font-black text-white">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {activeStartPrice > 0 && (
              <div className={`px-2 py-1 rounded-lg flex items-center gap-1 ${
                activePriceChange >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {activePriceChange >= 0 ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />}
                <span className={`text-sm font-bold ${activePriceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {activePriceChange >= 0 ? '+' : ''}{activePriceChange.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ===== PREVIOUS ROUNDS (HORIZONTAL SCROLL) ===== */}
        {previousRounds.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
              <History size={12} /> Recent Results
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
              {previousRounds.map(round => (
                <PrevRoundCard key={round.id} round={round} />
              ))}
            </div>
          </div>
        )}

        {/* ===== SLIDES NAVIGATION ===== */}
        <div className="flex items-center justify-center gap-2">
          {[
            { label: '🔒', hasContent: !!lockedRound },
            { label: '🔴', hasContent: !!activeRound },
            { label: '⏳', hasContent: true }
          ].map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSlide === i 
                  ? 'bg-primary text-white' 
                  : s.hasContent 
                    ? 'bg-slate-800 text-gray-400' 
                    : 'bg-slate-800/50 text-gray-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ===== SLIDES CONTENT ===== */}
        <div className="overflow-hidden">
          <div 
            className="flex transition-transform duration-300" 
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {/* SLIDE 0: LOCKED */}
            <div className="min-w-full px-0.5">
              {lockedRound ? (
                <div className="bg-amber-900/20 rounded-xl p-3 border border-amber-500/30">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Lock className="text-amber-500" size={16} />
                      <span className="text-white font-bold text-sm">Round #{lockedRound.roundNumber}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-lg ${
                      lockedTimeLeft < 30 ? 'bg-red-500/20' : 'bg-amber-500/20'
                    }`}>
                      <span className={`text-lg font-mono font-bold ${
                        lockedTimeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-amber-500'
                      }`}>
                        {formatTime(lockedTimeLeft)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-slate-800/50 p-2 rounded">
                      <p className="text-gray-500">Start</p>
                      <p className="text-white font-bold">${lockedStartPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <p className="text-gray-500">Now</p>
                      <p className={`font-bold ${lockedPriceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${currentPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <TradingChart 
                    priceHistory={lockedPriceHistory.length > 0 ? lockedPriceHistory : priceHistory}
                    startPrice={lockedStartPrice}
                    isLocked={true}
                    roundId={lockedRound.id}
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
                </div>
              ) : (
                <div className="bg-slate-800/30 rounded-xl p-8 text-center border border-dashed border-slate-700">
                  <Lock className="text-gray-600 mx-auto mb-2" size={32} />
                  <p className="text-gray-500 text-sm">No locked round</p>
                </div>
              )}
            </div>

            {/* SLIDE 1: ACTIVE */}
            <div className="min-w-full px-0.5">
              {activeRound ? (
                <div className="bg-slate-800/50 rounded-xl p-3 border border-primary/30">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-white font-bold text-sm">Round #{activeRound.roundNumber}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-lg ${
                      activeTimeLeft < 30 ? 'bg-red-500/20' : activeTimeLeft < 60 ? 'bg-yellow-500/20' : 'bg-slate-800'
                    }`}>
                      <span className={`text-lg font-mono font-bold ${
                        activeTimeLeft < 30 ? 'text-red-500 animate-pulse' : activeTimeLeft < 60 ? 'text-yellow-500' : 'text-primary'
                      }`}>
                        {formatTime(activeTimeLeft)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-slate-900/50 p-2 rounded">
                      <p className="text-gray-500">Start</p>
                      <p className="text-white font-bold">${activeStartPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded">
                      <p className="text-gray-500">Current</p>
                      <p className={`font-bold ${activePriceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {activePriceChange >= 0 ? '↑' : '↓'} {Math.abs(activePriceChange).toFixed(3)}%
                      </p>
                    </div>
                  </div>

                  <TradingChart 
                    priceHistory={priceHistory}
                    startPrice={activeStartPrice}
                    isLocked={false}
                    roundId={activeRound.id}
                  />

                  <div className="mt-3">
                    <PoolIndicator
                      totalUp={parseFloat(activeRound.totalUpAmount || 0)}
                      totalDown={parseFloat(activeRound.totalDownAmount || 0)}
                      upBets={activeRound.totalUpBets || 0}
                      downBets={activeRound.totalDownBets || 0}
                    />
                  </div>

                  {/* BET BUTTONS */}
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
                              ? 'bg-green-500/10 border-green-500/50 hover:border-green-500' 
                              : 'bg-red-500/10 border-red-500/50 hover:border-red-500'
                          }`}
                        >
                          {isUp ? (
                            <ArrowUpRight className="text-green-500 mx-auto mb-1" size={24} />
                          ) : (
                            <ArrowDownRight className="text-red-500 mx-auto mb-1" size={24} />
                          )}
                          <p className={`font-black text-sm ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                            {pred.toUpperCase()}
                          </p>
                          {betAmount > 0 && (
                            <div className="mt-1 pt-1 border-t border-current/20 text-[10px]">
                              <p className={isUp ? 'text-green-400' : 'text-red-400'}>
                                {calc.hasOpponents ? `${calc.multiplier}x → ₦${formatCurrency(calc.payout)}` : 'Refund if win'}
                              </p>
                            </div>
                          )}
                          {loading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                              <Loader2 className="animate-spin" size={20} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {!canBet && activeTimeLeft < 10 && activeTimeLeft > 0 && (
                    <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
                      <p className="text-red-500 text-xs flex items-center justify-center gap-1">
                        <AlertCircle size={12} /> Round ending
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-800/30 rounded-xl p-8 text-center border border-dashed border-slate-700">
                  <Clock className="text-gray-600 mx-auto mb-2 animate-pulse" size={32} />
                  <p className="text-gray-500 text-sm">Waiting for round...</p>
                  <button onClick={handleRefresh} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm">
                    Refresh
                  </button>
                </div>
              )}
            </div>

            {/* SLIDE 2: UPCOMING */}
            <div className="min-w-full px-0.5">
              <div className="bg-slate-800/30 rounded-xl p-6 text-center border border-slate-700">
                <div className="p-3 bg-blue-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <Play className="text-blue-500" size={28} />
                </div>
                <h3 className="text-white font-bold mb-1">Next Round</h3>
                <p className="text-gray-400 text-xs">Starts when current round locks</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== BET AMOUNT SELECTOR ===== */}
        <div className="bg-slate-900/80 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <DollarSign size={12} /> Bet Amount
            </span>
            <span className="text-[10px] text-gray-500">
              Available: <span className="text-green-400">₦{formatCurrency(availableBalance)}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {[100, 500, 1000, 2000, 5000, 10000].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={amt > availableBalance}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  betAmount === amt
                    ? 'bg-primary text-white'
                    : amt > availableBalance
                    ? 'bg-slate-800/50 text-gray-600'
                    : 'bg-slate-800 text-gray-300'
                }`}
              >
                ₦{amt >= 1000 ? `${amt/1000}k` : amt}
              </button>
            ))}
            <input
              type="number"
              value={betAmount || ''}
              onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
              className="w-16 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs text-center"
              placeholder="Custom"
            />
          </div>

          <div className="flex gap-2 text-[10px] text-gray-500">
            <span>Min: ₦100</span>
            <span>•</span>
            <span>Max: ₦100K</span>
            <span>•</span>
            <span className="text-primary">No fees!</span>
          </div>
        </div>

        {/* ===== MY ACTIVE BETS ===== */}
        {myActiveBets.length > 0 && (
          <div className="bg-slate-900/80 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white font-bold flex items-center gap-1">
                <Activity size={12} className="text-primary" /> My Bets
              </span>
              <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {myActiveBets.length}
              </span>
            </div>

            <div className="space-y-2">
              {myActiveBets.slice(0, 3).map(bet => {
                const amt = parseFloat(bet.stakeAmount || bet.amount);
                const mult = bet.currentMultiplierRaw || 1.7;
                return (
                  <div
                    key={bet.id}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      bet.prediction === 'up' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {bet.prediction === 'up' ? (
                        <ArrowUpRight className="text-green-500" size={16} />
                      ) : (
                        <ArrowDownRight className="text-red-500" size={16} />
                      )}
                      <div>
                        <p className="text-white text-sm font-bold">₦{formatCurrency(amt)}</p>
                        <p className="text-[10px] text-gray-400">
                          #{bet.roundNumber} {bet.roundStatus === 'locked' && '🔒'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{mult}x</p>
                      <p className={`text-sm font-bold ${bet.prediction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        ₦{formatCurrency(roundToTwo(amt * mult))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== REFERRAL BANNER ===== */}
        <button
          onClick={() => navigate('/referrals')}
          className="w-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-3 flex items-center gap-3"
        >
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Gift className="text-purple-500" size={20} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white text-sm font-bold">Refer & Earn 25%! 🎁</p>
            <p className="text-gray-400 text-[10px]">Share & earn from friends' bets</p>
          </div>
          <ChevronRight className="text-gray-400" size={18} />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
