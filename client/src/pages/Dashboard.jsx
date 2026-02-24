
import { useState, useEffect, useRef, useCallback } from 'react';
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
  Calendar,
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
  TrendingUp as TrendUp,
  Users
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
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ==================== PROFESSIONAL TRADING CHART ====================
const TradingChart = ({ priceHistory, startPrice, currentPrice }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLineRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1e293b', style: 1 },
        horzLines: { color: '#1e293b', style: 1 },
      },
      width: chartContainerRef.current.clientWidth,
      height: 220,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#334155',
        rightOffset: 5,
        barSpacing: 10,
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    });

    // Add area series with gradient
    const areaSeries = chart.addAreaSeries({
      lineColor: '#6366f1',
      topColor: 'rgba(99, 102, 241, 0.4)',
      bottomColor: 'rgba(99, 102, 241, 0.0)',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  // Update start price line
  useEffect(() => {
    if (!seriesRef.current || !startPrice || startPrice <= 0) return;

    // Remove old price line
    if (priceLineRef.current) {
      seriesRef.current.removePriceLine(priceLineRef.current);
    }

    // Add new start price line
    priceLineRef.current = seriesRef.current.createPriceLine({
      price: startPrice,
      color: '#f59e0b',
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Start',
    });
  }, [startPrice]);

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return;

    const now = Math.floor(Date.now() / 1000);
    const chartData = priceHistory.map((item, index) => ({
      time: now - (priceHistory.length - index - 1) * 5,
      value: item.price,
    }));

    seriesRef.current.setData(chartData);

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [priceHistory]);

  return (
    <div className="relative">
      <div 
        ref={chartContainerRef} 
        className="w-full h-[220px] rounded-xl overflow-hidden"
      />
      {priceHistory.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-xl">
          <div className="text-center">
            <Activity className="w-8 h-8 text-primary animate-pulse mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Loading chart data...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== LIVE POOL INDICATOR ====================
const LivePoolIndicator = ({ totalUp, totalDown, upBets, downBets }) => {
  const total = totalUp + totalDown;
  const upPercent = total > 0 ? (totalUp / total) * 100 : 50;
  const downPercent = total > 0 ? (totalDown / total) * 100 : 50;

  return (
    <div className="bg-slate-900/50 rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-white font-bold flex items-center gap-2">
          <Users size={16} className="text-primary" />
          Live Pool Distribution
        </span>
        <span className="text-xs text-green-500 font-bold flex items-center gap-1 animate-pulse">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          LIVE
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-4 bg-slate-700 rounded-full overflow-hidden flex mb-3">
        <div 
          className="bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500 ease-out flex items-center justify-center"
          style={{ width: `${upPercent}%` }}
        >
          {upPercent > 15 && (
            <span className="text-[10px] text-white font-bold">{upPercent.toFixed(0)}%</span>
          )}
        </div>
        <div 
          className="bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500 ease-out flex items-center justify-center"
          style={{ width: `${downPercent}%` }}
        >
          {downPercent > 15 && (
            <span className="text-[10px] text-white font-bold">{downPercent.toFixed(0)}%</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between bg-green-500/10 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-green-500" size={18} />
            <div>
              <p className="text-green-500 font-bold">UP</p>
              <p className="text-xs text-gray-400">{upBets} bets</p>
            </div>
          </div>
          <p className="text-green-500 font-black text-lg">₦{formatCurrency(totalUp)}</p>
        </div>
        <div className="flex items-center justify-between bg-red-500/10 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingDown className="text-red-500" size={18} />
            <div>
              <p className="text-red-500 font-bold">DOWN</p>
              <p className="text-xs text-gray-400">{downBets} bets</p>
            </div>
          </div>
          <p className="text-red-500 font-black text-lg">₦{formatCurrency(totalDown)}</p>
        </div>
      </div>

      {/* Total Pool */}
      <div className="mt-3 pt-3 border-t border-slate-700 text-center">
        <span className="text-gray-400 text-sm">Total Pool: </span>
        <span className="text-white font-black text-lg">₦{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

// ==================== USER GUIDE MODAL ====================
const UserGuideModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <Target className="w-12 h-12 text-primary" />,
      title: "Welcome to Wealth Trading! 🎯",
      content: "Predict if Bitcoin price will go UP ⬆️ or DOWN ⬇️ in the next 5 minutes and win big!",
      tip: "It's simple - just pick a direction and place your bet!"
    },
    {
      icon: <Clock className="w-12 h-12 text-blue-500" />,
      title: "How Rounds Work ⏰",
      content: "Each round has 2 phases:\n• Betting Phase: Place your bets\n• Locked Phase: Wait for results\n\nBetting closes 10 seconds before round ends.",
      tip: "Watch the countdown timer - don't miss your chance to bet!"
    },
    {
      icon: <DollarSign className="w-12 h-12 text-green-500" />,
      title: "Placing a Bet 💰",
      content: "1. Select your bet amount (min ₦100)\n2. Check the potential payout\n3. Click PREDICT UP or PREDICT DOWN\n4. Wait for the round to end!",
      tip: "The potential payout updates in real-time based on the pool!"
    },
    {
      icon: <Trophy className="w-12 h-12 text-yellow-500" />,
      title: "Winning & Payouts 🏆",
      content: "If your prediction is correct:\n• You get your bet back\n• Plus 70% of the losing pool!\n\nThe more opponents, the higher your potential win!",
      tip: "No opponents = Full refund if you win"
    },
    {
      icon: <Zap className="w-12 h-12 text-orange-500" />,
      title: "Understanding Multipliers 📊",
      content: "The multiplier shows your potential return:\n• 1.5x = ₦1000 bet wins ₦1500\n• 2.0x = ₦1000 bet wins ₦2000\n\nMultiplier changes as more bets come in!",
      tip: "Higher multiplier = More profit if you win!"
    },
    {
      icon: <Shield className="w-12 h-12 text-purple-500" />,
      title: "Fair System Rules 📋",
      content: "• No upfront fees - full amount goes to pool\n• 30% fee only from LOSERS' pool\n• Winners share 70% of losers' pool\n• Tie = Full refund to everyone",
      tip: "Trade responsibly and only bet what you can afford!"
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl max-w-md w-full border border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
          >
            <X size={24} />
          </button>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {steps[currentStep].icon}
          </div>
          <h2 className="text-2xl font-bold text-white">{steps[currentStep].title}</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-300 whitespace-pre-line text-center mb-4 leading-relaxed">
            {steps[currentStep].content}
          </p>
          
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
            <Info className="text-primary flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-primary">{steps[currentStep].tip}</p>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 pb-4">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep ? 'w-8 bg-primary' : 'w-2 bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="p-6 pt-0 flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition"
            >
              ← Back
            </button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} />
              Start Trading!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD COMPONENT ====================
const Dashboard = () => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  // ========== ALL STATES ==========
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceHistory, setPriceHistory] = useState([]);
  const [previousRound, setPreviousRound] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [upcomingRound, setUpcomingRound] = useState(null);
  const [activeSlide, setActiveSlide] = useState(1);
  const [betAmount, setBetAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myActiveBets, setMyActiveBets] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [roundStartPrice, setRoundStartPrice] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ========== CALCULATED VALUES ==========
  const walletBalance = parseFloat(walletData?.nairaBalance || 0);
  const lockedBalance = parseFloat(walletData?.lockedBalance || 0);
  const availableBalance = roundToTwo(walletBalance - lockedBalance);
  const priceChange = roundStartPrice > 0 ? ((currentPrice - roundStartPrice) / roundStartPrice) * 100 : 0;
  const canBet = currentRound?.status === 'active' && timeLeft >= 10;

  // ========== MULTIPLIER CALCULATION (INCLUDING USER'S BET) ==========
  const calculatePotentialPayout = useCallback((prediction) => {
    if (!currentRound || betAmount <= 0) {
      return { 
        payout: 0, 
        profit: 0, 
        multiplier: 1.7, 
        hasOpponents: false,
        message: 'Enter bet amount'
      };
    }

    let totalUp = parseFloat(currentRound.totalUpAmount || 0);
    let totalDown = parseFloat(currentRound.totalDownAmount || 0);

    // Add user's bet to calculation
    if (prediction === 'up') {
      totalUp += betAmount;
    } else {
      totalDown += betAmount;
    }

    // Check if there are opponents
    const hasOpponents = prediction === 'up' ? totalDown > 0 : totalUp > 0;

    if (!hasOpponents) {
      return {
        payout: betAmount,
        profit: 0,
        multiplier: 1.0,
        hasOpponents: false,
        message: 'Refund if you win (no opponents yet)'
      };
    }

    // Calculate multiplier with user's bet included
    let multiplier;
    if (prediction === 'up') {
      multiplier = roundToTwo(1 + (totalDown * 0.7) / totalUp);
    } else {
      multiplier = roundToTwo(1 + (totalUp * 0.7) / totalDown);
    }

    const payout = roundToTwo(betAmount * multiplier);
    const profit = roundToTwo(payout - betAmount);

    return {
      payout,
      profit,
      multiplier,
      hasOpponents: true,
      message: null
    };
  }, [currentRound, betAmount]);

  // ========== GET CURRENT POOL MULTIPLIER (WITHOUT USER'S BET) ==========
  const getCurrentMultiplier = useCallback((prediction) => {
    if (!currentRound) return { value: 1.7, display: '~1.7x' };

    const totalUp = parseFloat(currentRound.totalUpAmount || 0);
    const totalDown = parseFloat(currentRound.totalDownAmount || 0);

    if (totalUp === 0 && totalDown === 0) {
      return { value: 1.7, display: '~1.7x' };
    }

    if (prediction === 'up') {
      if (totalUp === 0 || totalDown === 0) {
        return { value: 1.0, display: totalDown === 0 ? 'N/A' : '~1.7x' };
      }
      const mult = roundToTwo(1 + (totalDown * 0.7) / totalUp);
      return { value: mult, display: `${mult}x` };
    } else {
      if (totalDown === 0 || totalUp === 0) {
        return { value: 1.0, display: totalUp === 0 ? 'N/A' : '~1.7x' };
      }
      const mult = roundToTwo(1 + (totalUp * 0.7) / totalDown);
      return { value: mult, display: `${mult}x` };
    }
  }, [currentRound]);

  // ========== CHECK FIRST VISIT FOR GUIDE ==========
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenTradingGuide');
    if (!hasSeenGuide && user) {
      setShowGuide(true);
      localStorage.setItem('hasSeenTradingGuide', 'true');
    }
  }, [user]);

  // ========== INITIALIZE DASHBOARD ==========
  useEffect(() => {
    if (user) {
      initDashboard();
    }
  }, [user]);

  const initDashboard = async () => {
    setDataLoading(true);
    
    try {
      await Promise.all([
        fetchWalletData(),
        fetchAllRounds(),
        fetchCurrentPrice(),
        fetchMyBets()
      ]);
    } catch (err) {
      console.error('Dashboard init error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // ========== AUTO-REFRESH DATA EVERY 3 SECONDS ==========
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchAllRounds();
      fetchMyBets();
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  // ========== REFRESH ALL DATA ==========
  const handleRefresh = async () => {
    setRefreshing(true);
    await initDashboard();
    setRefreshing(false);
    toast.success('Data refreshed!');
  };

  // ========== FETCH WALLET DATA ==========
  const fetchWalletData = async () => {
    try {
      const data = await api.get('/wallet/balance');
      if (data?.data) {
        setWalletData(data.data);
      } else if (data?.nairaBalance !== undefined) {
        setWalletData(data);
      } else {
        setWalletData(data);
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
    }
  };

  // ========== FETCH ALL ROUNDS ==========
  const fetchAllRounds = async () => {
    try {
      const data = await api.get('/trading/rounds/all');

      if (data) {
        setPreviousRound(data.previousRound || null);
        setCurrentRound(data.currentRound || null);
        setUpcomingRound(data.upcomingRound || null);

        if (data.currentRound?.startPrice) {
          setRoundStartPrice(parseFloat(data.currentRound.startPrice));
        }
      }
    } catch (err) {
      console.error('Rounds fetch error:', err);
    }
  };

  // ========== FETCH CURRENT PRICE ==========
  const fetchCurrentPrice = async () => {
    try {
      const data = await api.get('/trading/current-price');
      const price = data?.price;
      if (price) {
        setCurrentPrice(parseFloat(price));
        setPriceHistory(prev => {
          const newEntry = {
            time: Date.now(),
            price: parseFloat(price)
          };
          return [...prev.slice(-59), newEntry];
        });
      }
    } catch (err) {
      console.error('Price fetch error:', err);
    }
  };

  // ========== FETCH MY BETS ==========
  const fetchMyBets = async () => {
    try {
      const data = await api.get('/trading/my-bets/active');
      setMyActiveBets(data?.activeBets || []);
    } catch (err) {
      console.error('Bets fetch error:', err);
      setMyActiveBets([]);
    }
  };

  // ========== SOCKET LISTENERS ==========
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Price updates
    socket.on('price_update', (data) => {
      if (data?.price) {
        const price = parseFloat(data.price);
        setCurrentPrice(price);
        setPriceHistory(prev => {
          const newEntry = {
            time: Date.now(),
            price: price
          };
          return [...prev.slice(-59), newEntry];
        });
      }
    });

    // Bet placed by ANY user - Update pool instantly
    socket.on('bet_placed', (data) => {
      console.log('🎰 New bet placed:', data);
      
      setCurrentRound(prev => {
        if (!prev || prev.id !== data.roundId) return prev;
        return {
          ...prev,
          totalUpAmount: data.totalUpAmount,
          totalDownAmount: data.totalDownAmount,
          totalUpBets: data.totalUpBets,
          totalDownBets: data.totalDownBets,
          upMultiplier: data.upMultiplier,
          downMultiplier: data.downMultiplier
        };
      });
    });

    // Round started
    socket.on('round_start', (data) => {
      console.log('🚀 Round started:', data);
      fetchAllRounds();
      fetchMyBets();
      if (data.startPrice) {
        setRoundStartPrice(parseFloat(data.startPrice));
      }
      setPriceHistory([]);
      toast.success(`🚀 Round #${data.roundNumber} Started!`, { duration: 3000 });
      setActiveSlide(1);
    });

    // Round ended
    socket.on('round_end', (data) => {
      console.log('🏁 Round ended:', data);
      fetchAllRounds();
      fetchMyBets();
      fetchWalletData();
      
      const emoji = data.result === 'up' ? '📈' : '📉';
      toast.success(`${emoji} Round #${data.roundNumber} Ended: ${data.result?.toUpperCase()}!`, { duration: 4000 });
    });

    // Round locked
    socket.on('round_lock', (data) => {
      console.log('🔒 Round locked:', data);
      fetchAllRounds();
      toast('🔒 Betting closed!', { icon: '⏰', duration: 3000 });
    });

    // Balance update for current user
    socket.on('balance_update', (data) => {
      console.log('💰 Balance update:', data);
      setWalletData(prev => ({
        ...prev,
        nairaBalance: data.nairaBalance,
        lockedBalance: data.lockedBalance
      }));
    });

    // Bet result for current user
    socket.on('bet_result', (data) => {
      console.log('🎯 Bet result:', data);
      fetchMyBets();
      fetchWalletData();
      
      if (data.result === 'win') {
        toast.success(`🎉 You WON ₦${data.payout?.toLocaleString()}! (${data.multiplier}x)`, { duration: 5000 });
      } else if (data.result === 'loss') {
        toast.error(`😢 You lost ₦${Math.abs(data.profit || data.amount)?.toLocaleString()}`, { duration: 4000 });
      } else if (data.result === 'refund') {
        toast.success(`🔄 Refunded ₦${data.payout?.toLocaleString()}`, { duration: 4000 });
      }
    });

    return () => {
      socket.off('price_update');
      socket.off('bet_placed');
      socket.off('round_start');
      socket.off('round_end');
      socket.off('round_lock');
      socket.off('balance_update');
      socket.off('bet_result');
    };
  }, [socket, isConnected]);

  // ========== COUNTDOWN TIMER ==========
  useEffect(() => {
    if (!currentRound?.endTime) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(currentRound.endTime).getTime();
      const diff = end - now;
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [currentRound]);

  // ========== PLACE BET ==========
  const handlePlaceBet = async (prediction) => {
    if (!currentRound) {
      toast.error('⏳ No active round. Please wait.');
      return;
    }

    if (currentRound.status !== 'active') {
      toast.error('🔒 Round is not accepting bets.');
      return;
    }

    if (timeLeft < 10) {
      toast.error('⏰ Too late! Round ending soon.');
      return;
    }

    if (!betAmount || betAmount < 100) {
      toast.error('💰 Minimum bet is ₦100');
      return;
    }

    if (betAmount > 100000) {
      toast.error('💰 Maximum bet is ₦100,000');
      return;
    }

    if (betAmount > availableBalance) {
      toast.error(`❌ Insufficient balance! You have ₦${availableBalance.toLocaleString()} available`);
      return;
    }

    setLoading(true);

    try {
      const data = await api.post('/trading/bet', {
        roundId: currentRound.id,
        prediction: prediction.toLowerCase(),
        amount: betAmount
      });

      console.log('✅ Bet placed:', data);
      
      const potentialWin = data.bet?.potentialPayout || (betAmount * 1.7);
      toast.success(
        `✅ Bet ₦${betAmount.toLocaleString()} on ${prediction.toUpperCase()}!\nPotential Win: ₦${potentialWin.toLocaleString()}`,
        { duration: 4000 }
      );

      // Refresh data
      await Promise.all([
        fetchMyBets(),
        fetchAllRounds(),
        fetchWalletData()
      ]);

    } catch (err) {
      console.error('Bet error:', err);
      toast.error(err.message || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  // ========== LOADING STATE ==========
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-400 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <div className="min-h-screen bg-darker pb-24 lg:pb-8">
      {/* User Guide Modal */}
      <UserGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-3 flex items-center justify-center gap-2">
          <WifiOff className="text-yellow-500" size={18} />
          <p className="text-yellow-500 text-sm font-medium">Reconnecting to live data...</p>
        </div>
      )}

      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        
        {/* ==================== HEADER ==================== */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          {/* Title */}
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
              Wealth Trading
              <Activity className="text-primary animate-pulse" size={28} />
            </h1>
            <p className="text-gray-400 text-sm lg:text-base flex items-center gap-2">
              BTC/USD 5-Minute Prediction
              {isConnected ? (
                <span className="flex items-center gap-1 text-green-500 text-xs font-medium">
                  <Wifi size={12} /> Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-500 text-xs font-medium">
                  <WifiOff size={12} /> Connecting...
                </span>
              )}
            </p>
          </div>

          {/* Balance & Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Help Button */}
            <button
              onClick={() => setShowGuide(true)}
              className="p-3 bg-slate-800 text-gray-400 hover:text-white rounded-xl border border-slate-700 transition hover:border-primary"
              title="How to Play"
            >
              <HelpCircle size={20} />
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 bg-slate-800 text-gray-400 hover:text-white rounded-xl border border-slate-700 transition disabled:opacity-50 hover:border-primary"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {/* Balance Display */}
            <div className="flex-1 lg:flex-none flex items-center gap-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-2xl border border-green-500/30">
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Available Balance</p>
                <p className="text-xl lg:text-2xl font-black text-green-400 tabular-nums">
                  ₦{formatCurrency(availableBalance)}
                </p>
                {lockedBalance > 0 && (
                  <p className="text-xs text-orange-400">
                    🔒 Locked: ₦{formatCurrency(lockedBalance)}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                <WalletIcon size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* ==================== LIVE PRICE BANNER ==================== */}
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-4 mb-6 border border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-xl text-orange-500">
                <TrendUp size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase flex items-center gap-2">
                  Live BTC Price
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </p>
                <h2 className="text-2xl lg:text-3xl font-black text-white tabular-nums">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
            </div>

            {roundStartPrice > 0 && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                priceChange >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
              }`}>
                {priceChange >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                <span className="font-bold tabular-nums text-lg">
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
                </span>
                <span className="text-xs opacity-70">from round start</span>
              </div>
            )}
          </div>
        </div>

        {/* ==================== SWIPEABLE ROUNDS ==================== */}
        <div className="mb-6">
          {/* Slide Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))}
                disabled={activeSlide === 0}
                className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition border border-slate-700"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-gray-400 min-w-[180px] text-center font-medium">
                {activeSlide === 0 ? '📊 Previous Round' :
                 activeSlide === 1 ? '🔴 LIVE - Current Round' :
                 '⏳ Upcoming Round'}
              </span>
              <button
                onClick={() => setActiveSlide(prev => Math.min(2, prev + 1))}
                disabled={activeSlide === 2}
                className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition border border-slate-700"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Slide Indicators */}
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`h-2 rounded-full transition-all ${
                    activeSlide === i ? 'w-8 bg-primary' : 'w-2 bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Slides Container */}
          <div className="overflow-hidden rounded-3xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {/* ===== SLIDE 1: PREVIOUS ROUND ===== */}
              <div className="min-w-full px-1">
                {previousRound ? (
                  <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-sm text-gray-400">Round #{previousRound.roundNumber}</p>
                        <h3 className="text-xl font-bold text-white">Previous Round</h3>
                      </div>
                      <div className={`px-4 py-2 rounded-xl font-bold text-lg ${
                        previousRound.result === 'up'
                          ? 'bg-green-500/20 text-green-500'
                          : previousRound.result === 'down'
                          ? 'bg-red-500/20 text-red-500'
                          : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {previousRound.result === 'up' ? '📈 UP WON' :
                         previousRound.result === 'down' ? '📉 DOWN WON' : '➖ TIE'}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <p className="text-xs text-gray-400 mb-1">Start Price</p>
                        <p className="text-lg font-bold text-white">
                          ${parseFloat(previousRound.startPrice || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <p className="text-xs text-gray-400 mb-1">End Price</p>
                        <p className="text-lg font-bold text-white">
                          ${parseFloat(previousRound.endPrice || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <p className="text-xs text-gray-400 mb-1">Change</p>
                        <p className={`text-lg font-bold ${
                          (previousRound.endPrice - previousRound.startPrice) >= 0
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}>
                          {previousRound.startPrice > 0 
                            ? (((previousRound.endPrice - previousRound.startPrice) / previousRound.startPrice) * 100).toFixed(3)
                            : 0}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-4 rounded-xl ${previousRound.result === 'up' ? 'bg-green-500/20 ring-2 ring-green-500' : 'bg-green-500/10'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-green-400 text-sm font-medium">UP Pool</span>
                          <span className="text-green-400 text-xs">{previousRound.totalUpBets || 0} bets</span>
                        </div>
                        <p className="text-xl font-bold text-green-500 mt-1">
                          ₦{formatCurrency(previousRound.totalUpAmount)}
                        </p>
                        {previousRound.result === 'up' && (
                          <p className="text-xs text-green-400 mt-1">🏆 Winners!</p>
                        )}
                      </div>
                      <div className={`p-4 rounded-xl ${previousRound.result === 'down' ? 'bg-red-500/20 ring-2 ring-red-500' : 'bg-red-500/10'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-red-400 text-sm font-medium">DOWN Pool</span>
                          <span className="text-red-400 text-xs">{previousRound.totalDownBets || 0} bets</span>
                        </div>
                        <p className="text-xl font-bold text-red-500 mt-1">
                          ₦{formatCurrency(previousRound.totalDownAmount)}
                        </p>
                        {previousRound.result === 'down' && (
                          <p className="text-xs text-red-400 mt-1">🏆 Winners!</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-3xl p-12 border border-dashed border-slate-700 text-center">
                    <Trophy className="mx-auto mb-4 text-gray-600" size={48} />
                    <p className="text-gray-500 text-lg">No previous round data</p>
                    <p className="text-gray-600 text-sm mt-2">Complete a round to see results here</p>
                  </div>
                )}
              </div>

              {/* ===== SLIDE 2: CURRENT ROUND (ACTIVE) ===== */}
              <div className="min-w-full px-1">
                {currentRound ? (
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border-2 border-primary/50 shadow-lg shadow-primary/10">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                          <p className="text-sm text-primary font-bold">
                            {currentRound.status === 'active' ? 'LIVE BETTING' : 'LOCKED'} • Round #{currentRound.roundNumber}
                          </p>
                        </div>
                        <h3 className="text-xl font-bold text-white">Current Round</h3>
                      </div>

                      {/* Timer */}
                      <div className={`px-5 py-3 rounded-2xl border ${
                        timeLeft < 30 ? 'bg-red-500/20 border-red-500' :
                        timeLeft < 60 ? 'bg-yellow-500/20 border-yellow-500' : 
                        'bg-slate-900/80 border-slate-700'
                      }`}>
                        <p className="text-xs text-gray-400 text-center">
                          {currentRound.status === 'active' ? 'Betting Ends' : 'Round Ends'}
                        </p>
                        <p className={`text-3xl font-mono font-bold text-center tabular-nums ${
                          timeLeft < 30 ? 'text-red-500 animate-pulse' :
                          timeLeft < 60 ? 'text-yellow-500' : 'text-primary'
                        }`}>
                          {formatTime(timeLeft)}
                        </p>
                      </div>
                    </div>

                    {/* Price Info */}
                    <div className="bg-slate-900/50 rounded-2xl p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Round Start Price</p>
                          <p className="text-xl font-bold text-white tabular-nums">
                            ${roundStartPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400 mb-1">Current Price</p>
                          <p className="text-xl font-bold text-white tabular-nums">
                            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-700">
                        <span className="text-gray-400 text-sm">Current Direction:</span>
                        <span className={`font-bold text-lg flex items-center gap-1 ${
                          priceChange >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {priceChange >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          {priceChange >= 0 ? 'UP' : 'DOWN'} ({priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%)
                        </span>
                      </div>
                    </div>

                    {/* Professional TradingView Chart */}
                    <div className="bg-slate-900/50 rounded-xl p-2 mb-4">
                      <TradingChart 
                        priceHistory={priceHistory} 
                        startPrice={roundStartPrice}
                        currentPrice={currentPrice}
                      />
                    </div>

                    {/* Live Pool Distribution */}
                    <div className="mb-4">
                      <LivePoolIndicator
                        totalUp={parseFloat(currentRound.totalUpAmount || 0)}
                        totalDown={parseFloat(currentRound.totalDownAmount || 0)}
                        upBets={currentRound.totalUpBets || 0}
                        downBets={currentRound.totalDownBets || 0}
                      />
                    </div>

                    {/* Betting Buttons */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* UP BUTTON */}
                      {(() => {
                        const upCalc = calculatePotentialPayout('up');
                        const currentMult = getCurrentMultiplier('up');
                        return (
                          <button
                            onClick={() => handlePlaceBet('up')}
                            disabled={loading || !canBet}
                            className="relative bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500/50 hover:border-green-500 p-4 lg:p-5 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed group overflow-hidden"
                          >
                            <div className="relative z-10">
                              <ArrowUpRight
                                size={32}
                                className="text-green-500 mx-auto mb-2 group-hover:scale-110 transition-transform"
                              />
                              <p className="text-lg lg:text-xl font-black text-green-500">PREDICT UP</p>
                              
                              {/* Current Pool Multiplier */}
                              <p className="text-xs text-gray-400 mt-2">
                                Current Pool: {currentMult.display}
                              </p>
                              
                              {/* Your Potential */}
                              <div className="mt-3 pt-3 border-t border-green-500/30 space-y-1">
                                {betAmount > 0 ? (
                                  upCalc.hasOpponents ? (
                                    <>
                                      <p className="text-sm text-green-400 font-bold">
                                        Your Payout: {upCalc.multiplier}x
                                      </p>
                                      <p className="text-lg font-black text-green-500">
                                        Win: ₦{formatCurrency(upCalc.payout)}
                                      </p>
                                      <p className="text-xs text-green-400">
                                        Profit: +₦{formatCurrency(upCalc.profit)}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-sm text-yellow-400 font-bold">
                                        1x 
                                      </p>
                                      <p className="text-xs text-yellow-400">
                                        No DOWN bets yet
                                      </p>
                                      <p className="text-xs text-gray-400">
                                      
                                      </p>
                                    </>
                                  )
                                ) : (
                                  <p className="text-xs text-gray-400">Select bet amount</p>
                                )}
                              </div>
                            </div>
                            {loading && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                              </div>
                            )}
                          </button>
                        );
                      })()}

                      {/* DOWN BUTTON */}
                      {(() => {
                        const downCalc = calculatePotentialPayout('down');
                        const currentMult = getCurrentMultiplier('down');
                        return (
                          <button
                            onClick={() => handlePlaceBet('down')}
                            disabled={loading || !canBet}
                            className="relative bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/50 hover:border-red-500 p-4 lg:p-5 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed group overflow-hidden"
                          >
                            <div className="relative z-10">
                              <ArrowDownRight
                                size={32}
                                className="text-red-500 mx-auto mb-2 group-hover:scale-110 transition-transform"
                              />
                              <p className="text-lg lg:text-xl font-black text-red-500">PREDICT DOWN</p>
                              
                              {/* Current Pool Multiplier */}
                              <p className="text-xs text-gray-400 mt-2">
                                Current Pool: {currentMult.display}
                              </p>
                              
                              {/* Your Potential */}
                              <div className="mt-3 pt-3 border-t border-red-500/30 space-y-1">
                                {betAmount > 0 ? (
                                  downCalc.hasOpponents ? (
                                    <>
                                      <p className="text-sm text-red-400 font-bold">
                                        Your Payout: {downCalc.multiplier}x
                                      </p>
                                      <p className="text-lg font-black text-red-500">
                                        Win: ₦{formatCurrency(downCalc.payout)}
                                      </p>
                                      <p className="text-xs text-red-400">
                                        Profit: +₦{formatCurrency(downCalc.profit)}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-sm text-yellow-400 font-bold">
                                        1x 
                                      </p>
                                      <p className="text-xs text-yellow-400">
                                        No UP bets yet
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        
                                      </p>
                                    </>
                                  )
                                ) : (
                                  <p className="text-xs text-gray-400">Select bet amount</p>
                                )}
                              </div>
                            </div>
                            {loading && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                              </div>
                            )}
                          </button>
                        );
                      })()}
                    </div>

                    {/* Status Messages */}
                    {!canBet && currentRound.status === 'locked' && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                        <p className="text-yellow-500 font-medium flex items-center justify-center gap-2">
                          <Clock size={18} />
                          Betting closed - Waiting for results...
                        </p>
                        <p className="text-yellow-400/70 text-sm mt-1">
                          Round ends in {formatTime(timeLeft)}
                        </p>
                      </div>
                    )}

                    {!canBet && currentRound.status === 'active' && timeLeft < 10 && timeLeft > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                        <p className="text-red-500 font-medium flex items-center justify-center gap-2">
                          <AlertCircle size={18} />
                          Round ending - Betting disabled
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-3xl p-12 border border-dashed border-slate-700 text-center">
                    <Clock className="mx-auto mb-4 text-gray-600 animate-pulse" size={48} />
                    <p className="text-gray-500 text-lg">Waiting for next round...</p>
                    <p className="text-gray-600 text-sm mt-2">A new round will start soon</p>
                    <button
                      onClick={handleRefresh}
                      className="mt-4 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/80 transition flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw size={18} />
                      Refresh
                    </button>
                  </div>
                )}
              </div>

              {/* ===== SLIDE 3: UPCOMING ROUND ===== */}
              <div className="min-w-full px-1">
                {upcomingRound ? (
                  <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-sm text-gray-400">Round #{upcomingRound.roundNumber}</p>
                        <h3 className="text-xl font-bold text-white">Upcoming Round</h3>
                      </div>
                      <div className="bg-blue-500/20 px-4 py-2 rounded-xl border border-blue-500/30">
                        <p className="text-sm font-bold text-blue-400">Coming Soon</p>
                      </div>
                    </div>

                    <div className="text-center py-8">
                      <Calendar className="mx-auto mb-4 text-blue-500" size={48} />
                      <p className="text-gray-300 text-lg mb-2">This round will start after</p>
                      <p className="text-gray-400 mb-6">the current round ends</p>

                      <div className="bg-slate-900/50 p-4 rounded-xl inline-block">
                        <p className="text-xs text-gray-400 mb-1">Scheduled Start Time</p>
                        <p className="text-xl font-bold text-white">
                          {new Date(upcomingRound.startTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <p className="text-blue-400 text-sm text-center flex items-center justify-center gap-2">
                        <Zap size={16} />
                        Tip: Prepare your strategy while waiting!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-3xl p-12 border border-dashed border-slate-700 text-center">
                    <Timer className="mx-auto mb-4 text-gray-600" size={48} />
                    <p className="text-gray-500 text-lg">No upcoming round scheduled</p>
                    <p className="text-gray-600 text-sm mt-2">One will be created automatically</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== BET AMOUNT SELECTOR ==================== */}
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-primary" />
              <p className="text-white font-bold">Select Bet Amount</p>
            </div>
            <p className="text-sm text-gray-400">
              Available: <span className="text-green-400 font-bold">₦{formatCurrency(availableBalance)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            {[100, 500, 1000, 2000, 5000, 10000, 50000].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={amt > availableBalance}
                className={`px-4 py-3 rounded-xl font-bold transition-all ${
                  betAmount === amt
                    ? 'bg-primary text-white scale-105 shadow-lg shadow-primary/30'
                    : amt > availableBalance
                    ? 'bg-slate-800 text-gray-600 cursor-not-allowed'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                ₦{amt.toLocaleString()}
              </button>
            ))}

            <div className="relative">
              <input
                type="number"
                placeholder="Custom"
                value={betAmount || ''}
                min="100"
                max={availableBalance}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white w-32 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <span>Min: ₦100</span>
            <span>•</span>
            <span>Max: ₦100,000</span>
            <span>•</span>
            <span className="text-primary">No upfront fees!</span>
          </div>
        </div>

        {/* ==================== MY ACTIVE BETS ==================== */}
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity size={20} className="text-primary" />
              My Active Bets
            </h3>
            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold">
              {myActiveBets.length} Active
            </span>
          </div>

          {myActiveBets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Activity size={48} className="mb-4 opacity-20" />
              <p className="text-lg">No active bets</p>
              <p className="text-sm text-gray-600 mt-1">Place a bet to see it here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myActiveBets.map(bet => {
                const betAmount = parseFloat(bet.stakeAmount || bet.amount);
                const multiplier = bet.currentMultiplierRaw || 1.7;
                const potentialPayout = roundToTwo(betAmount * multiplier);
                const potentialProfit = roundToTwo(potentialPayout - betAmount);

                return (
                  <div
                    key={bet.id}
                    className={`bg-slate-900/50 p-4 rounded-2xl border transition-all ${
                      bet.prediction === 'up' 
                        ? 'border-green-500/30 hover:border-green-500/50' 
                        : 'border-red-500/30 hover:border-red-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className={`text-sm font-bold uppercase flex items-center gap-1 ${
                          bet.prediction === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {bet.prediction === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          {bet.prediction}
                        </p>
                        <p className="text-white font-bold text-lg">
                          ₦{formatCurrency(bet.amount || bet.stakeAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Potential Win</p>
                        <p className="text-lg font-bold text-primary">
                          ₦{formatCurrency(potentialPayout)}
                        </p>
                        <p className={`text-xs ${potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          +₦{formatCurrency(potentialProfit)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-700">
                      <span className="text-gray-500">Round #{bet.roundNumber}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-bold">{multiplier}x</span>
                        {bet.isCurrentlyWinning !== undefined && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bet.isCurrentlyWinning 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-red-500/20 text-red-500'
                          }`}>
                            {bet.isCurrentlyWinning ? '✓ Winning' : '✗ Losing'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
