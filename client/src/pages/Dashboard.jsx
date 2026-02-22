
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
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
  Gift,
  Shield,
  TrendingUp as TrendUp,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

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
      content: "Each round lasts 5 minutes. You can place bets while the round is ACTIVE. Betting closes 30 seconds before the round ends.",
      tip: "Watch the countdown timer - don't miss your chance to bet!"
    },
    {
      icon: <DollarSign className="w-12 h-12 text-green-500" />,
      title: "Placing a Bet 💰",
      content: "1. Select your bet amount (min ₦100)\n2. Click 'PREDICT UP' if you think price will rise\n3. Click 'PREDICT DOWN' if you think price will fall",
      tip: "Start small while learning, then increase your bets!"
    },
    {
      icon: <Trophy className="w-12 h-12 text-yellow-500" />,
      title: "Winning & Payouts 🏆",
      content: "If your prediction is correct, you WIN! Your payout depends on the pool ratio. More people betting against you = higher payout!",
      tip: "The multiplier shows your potential payout (e.g., 1.8x means ₦1000 bet = ₦1800 return)"
    },
    {
      icon: <Zap className="w-12 h-12 text-orange-500" />,
      title: "Swipe Between Rounds 👆",
      content: "• Swipe LEFT to see PREVIOUS round results\n• CENTER shows CURRENT active round\n• Swipe RIGHT to see UPCOMING round",
      tip: "Learn from previous rounds to make better predictions!"
    },
    {
      icon: <Shield className="w-12 h-12 text-purple-500" />,
      title: "Important Rules 📋",
      content: "• 20% platform fee on each bet\n• One bet per round\n• No betting in last 30 seconds\n• Ties = full refund",
      tip: "Trade responsibly and only bet what you can afford!"
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl max-w-md w-full border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
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
          <p className="text-gray-300 whitespace-pre-line text-center mb-4">
            {steps[currentStep].content}
          </p>
          
          {/* Tip Box */}
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
            <Info className="text-primary flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-primary">{steps[currentStep].tip}</p>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 pb-4">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep ? 'w-8 bg-primary' : 'w-2 bg-gray-600'
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

  // ========== STATES ==========
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceHistory, setPriceHistory] = useState([]);
  const [rounds, setRounds] = useState({
    previous: null,
    current: null,
    upcoming: null
  });
  const [activeSlide, setActiveSlide] = useState(1); // 0=previous, 1=current, 2=upcoming
  const [betAmount, setBetAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myActiveBets, setMyActiveBets] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [roundStartPrice, setRoundStartPrice] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // ========== GET WALLET BALANCE ==========
  const getUserBalance = useCallback(() => {
    if (!user) return 0;
    
    // Try all possible locations for balance
    const balance = 
      user?.wallet?.nairaBalance ||
      user?.wallet?.balance ||
      user?.nairaBalance ||
      user?.balance ||
      0;
    
    return parseFloat(balance) || 0;
  }, [user]);

  // Update wallet balance when user changes
  useEffect(() => {
    const balance = getUserBalance();
    setWalletBalance(balance);
  }, [user, getUserBalance]);

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
        fetchAllRounds(),
        fetchMyBets(),
        fetchCurrentPrice(),
        fetchWalletBalance()
      ]);
    } catch (err) {
      console.error('Dashboard init error:', err);
      toast.error('Failed to load dashboard');
    } finally {
      setDataLoading(false);
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    await initDashboard();
    setRefreshing(false);
    toast.success('Data refreshed!');
  };

  // ========== FETCH WALLET BALANCE ==========
  const fetchWalletBalance = async () => {
    try {
      const res = await api.get('/wallet/balance');
      if (res.data?.data) {
        setWalletBalance(parseFloat(res.data.data.nairaBalance) || 0);
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
      // Fallback to user context
      setWalletBalance(getUserBalance());
    }
  };

  // ========== FETCH ALL ROUNDS ==========
  const fetchAllRounds = async () => {
    try {
      const res = await api.get('/trading/rounds/all');
      if (res.data) {
        setRounds({
          previous: res.data.previousRound,
          current: res.data.currentRound,
          upcoming: res.data.upcomingRound
        });
        
        if (res.data.currentRound?.startPrice) {
          setRoundStartPrice(parseFloat(res.data.currentRound.startPrice));
        }
      }
    } catch (err) {
      console.error('Rounds fetch error:', err);
      // Try alternative endpoint
      try {
        const currentRes = await api.get('/trading/current-round');
        if (currentRes.data?.round) {
          setRounds(prev => ({
            ...prev,
            current: currentRes.data.round
          }));
          if (currentRes.data.round?.startPrice) {
            setRoundStartPrice(parseFloat(currentRes.data.round.startPrice));
          }
        }
      } catch (e) {
        console.error('Alternative fetch also failed:', e);
      }
    }
  };

  // ========== FETCH CURRENT PRICE ==========
  const fetchCurrentPrice = async () => {
    try {
      const res = await api.get('/trading/current-price');
      if (res.data?.price) {
        setCurrentPrice(res.data.price);
        setPriceHistory([{
          time: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }),
          price: res.data.price
        }]);
      }
    } catch (err) {
      console.error('Price fetch error:', err);
      // Set fallback price
      setCurrentPrice(43250.00);
    }
  };

  // ========== FETCH MY BETS ==========
  const fetchMyBets = async () => {
    try {
      const res = await api.get('/trading/my-bets/active');
      setMyActiveBets(res.data?.activeBets || []);
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
        setCurrentPrice(data.price);
        setPriceHistory(prev => {
          const newHistory = [...prev, {
            time: new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }),
            price: data.price
          }];
          return newHistory.slice(-60); // Keep last 60 points (5 minutes at 5-second intervals)
        });
      }
    });

    // Round started
    socket.on('round_start', (data) => {
      fetchAllRounds();
      fetchMyBets();
      setRoundStartPrice(data.startPrice);
      toast.success(`🚀 Round #${data.roundNumber} Started!`, { duration: 3000 });
      // Auto-switch to current round
      setActiveSlide(1);
    });

    // Round ended
    socket.on('round_end', (data) => {
      fetchAllRounds();
      fetchMyBets();
      fetchWalletBalance();
      
      const emoji = data.result === 'up' ? '📈' : '📉';
      const color = data.result === 'up' ? 'green' : 'red';
      toast.success(`${emoji} Round #${data.roundNumber} Ended: ${data.result.toUpperCase()}!`, {
        duration: 4000,
        style: { borderLeft: `4px solid ${color}` }
      });
    });

    // Round locked
    socket.on('round_lock', (data) => {
      fetchAllRounds();
      toast('🔒 Betting closed for this round!', { icon: '⏰' });
    });

    // Balance update
    socket.on('balance_update', (data) => {
      if (data?.nairaBalance !== undefined) {
        setWalletBalance(parseFloat(data.nairaBalance));
      }
    });

    return () => {
      socket.off('price_update');
      socket.off('round_start');
      socket.off('round_end');
      socket.off('round_lock');
      socket.off('balance_update');
    };
  }, [socket, isConnected]);

  // ========== COUNTDOWN TIMER ==========
  useEffect(() => {
    if (!rounds.current?.endTime) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(rounds.current.endTime).getTime();
      const diff = end - now;
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 100); // Update every 100ms for accuracy

    return () => clearInterval(interval);
  }, [rounds.current]);

  // ========== PLACE BET ==========
  const handlePlaceBet = async (prediction) => {
    // Validations
    if (!rounds.current) {
      toast.error('⏳ No active round. Please wait for the next round.');
      return;
    }

    if (rounds.current.status !== 'active') {
      toast.error('🔒 Betting is closed for this round.');
      return;
    }

    if (timeLeft < 10) {
      toast.error('⏰ Too late! Round is ending soon.');
      return;
    }

    if (!betAmount || betAmount < 100) {
      toast.error('💰 Minimum bet is ₦100');
      return;
    }

    if (betAmount > walletBalance) {
      toast.error(`❌ Insufficient balance! You have ₦${walletBalance.toLocaleString()}`);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/trading/bet', {
        roundId: rounds.current.id,
        prediction: prediction.toLowerCase(),
        amount: betAmount
      });

      // Success!
      toast.success(`✅ Bet placed on ${prediction.toUpperCase()}! Good luck! 🍀`, {
        duration: 4000
      });

      // Update local state
      if (response.data?.wallet) {
        setWalletBalance(parseFloat(response.data.wallet.nairaBalance));
      }

      // Refresh data
      await Promise.all([fetchMyBets(), fetchAllRounds()]);

    } catch (err) {
      console.error('Bet error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to place bet. Please try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ========== HELPERS ==========
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const priceChange = roundStartPrice > 0 
    ? ((currentPrice - roundStartPrice) / roundStartPrice) * 100 
    : 0;

  const canBet = rounds.current?.status === 'active' && timeLeft >= 10;

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
    <div className="min-h-screen bg-darker pb-20 lg:pb-8">
      {/* User Guide Modal */}
      <UserGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-3 flex items-center justify-center gap-2">
          <AlertCircle className="text-yellow-500" size={18} />
          <p className="text-yellow-500 text-sm">Reconnecting to live data...</p>
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
            <p className="text-gray-400 text-sm lg:text-base">BTC/USD 5-Minute Prediction</p>
          </div>

          {/* Balance Card & Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Help Button */}
            <button
              onClick={() => setShowGuide(true)}
              className="p-3 bg-slate-800 text-gray-400 hover:text-white rounded-xl border border-slate-700 transition"
              title="How to Play"
            >
              <HelpCircle size={20} />
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 bg-slate-800 text-gray-400 hover:text-white rounded-xl border border-slate-700 transition disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {/* Balance Display */}
            <div className="flex-1 lg:flex-none flex items-center gap-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-2xl border border-green-500/30">
              <div className="text-right flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Available Balance</p>
                <p className="text-xl lg:text-2xl font-black text-green-400">
                  ₦{formatCurrency(walletBalance)}
                </p>
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
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Live BTC Price</p>
                <h2 className="text-2xl lg:text-3xl font-black text-white">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h2>
              </div>
            </div>
            
            {roundStartPrice > 0 && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                priceChange >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
              }`}>
                {priceChange >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                <span className="font-bold">
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
                </span>
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
                className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-gray-400 min-w-[150px] text-center">
                {activeSlide === 0 ? '📊 Previous Round' : 
                 activeSlide === 1 ? '🔴 LIVE - Current Round' : 
                 '⏳ Upcoming Round'}
              </span>
              <button
                onClick={() => setActiveSlide(prev => Math.min(2, prev + 1))}
                disabled={activeSlide === 2}
                className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition"
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
                {rounds.previous ? (
                  <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-sm text-gray-400">Round #{rounds.previous.roundNumber}</p>
                        <h3 className="text-xl font-bold text-white">Previous Round (Closed)</h3>
                      </div>
                      <div className={`px-4 py-2 rounded-xl font-bold text-lg ${
                        rounds.previous.result === 'up' 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {rounds.previous.result === 'up' ? '📈 UP' : '📉 DOWN'}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <p className="text-xs text-gray-400 mb-1">Start Price</p>
                        <p className="text-lg font-bold text-white">
                          ${parseFloat(rounds.previous.startPrice || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <p className="text-xs text-gray-400 mb-1">End Price</p>
                        <p className="text-lg font-bold text-white">
                          ${parseFloat(rounds.previous.endPrice || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <p className="text-xs text-gray-400 mb-1">Change</p>
                        <p className={`text-lg font-bold ${
                          (rounds.previous.endPrice - rounds.previous.startPrice) >= 0 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }`}>
                          {(((rounds.previous.endPrice - rounds.previous.startPrice) / rounds.previous.startPrice) * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-500/10 p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-green-400 text-sm">Total UP</span>
                          <span className="text-green-400 text-xs">{rounds.previous.totalUpBets || 0} bets</span>
                        </div>
                        <p className="text-xl font-bold text-green-500 mt-1">
                          ₦{formatCurrency(rounds.previous.totalUpAmount)}
                        </p>
                      </div>
                      <div className="bg-red-500/10 p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-red-400 text-sm">Total DOWN</span>
                          <span className="text-red-400 text-xs">{rounds.previous.totalDownBets || 0} bets</span>
                        </div>
                        <p className="text-xl font-bold text-red-500 mt-1">
                          ₦{formatCurrency(rounds.previous.totalDownAmount)}
                        </p>
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
                {rounds.current ? (
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border-2 border-primary/50 shadow-lg shadow-primary/10">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                          <p className="text-sm text-primary font-bold">LIVE • Round #{rounds.current.roundNumber}</p>
                        </div>
                        <h3 className="text-xl font-bold text-white">Current Round</h3>
                      </div>
                      
                      {/* Timer */}
                      <div className="bg-slate-900/80 px-5 py-3 rounded-2xl border border-slate-700">
                        <p className="text-xs text-gray-400 text-center">Time Remaining</p>
                        <p className={`text-3xl font-mono font-bold text-center ${
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
                          <p className="text-xl font-bold text-white">
                            ${roundStartPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400 mb-1">Current Price</p>
                          <p className="text-xl font-bold text-white">
                            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Price Change Indicator */}
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="text-gray-400 text-sm">Change:</span>
                        <span className={`font-bold text-lg flex items-center gap-1 ${
                          priceChange >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {priceChange >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
                        </span>
                      </div>
                    </div>

                    {/* Mini Chart */}
                    <div className="h-[150px] mb-4">
                      {priceHistory.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={priceHistory}>
                            <defs>
                              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['dataMin - 50', 'dataMax + 50']} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
                              labelStyle={{ color: '#94a3b8' }}
                              itemStyle={{ color: '#fff' }}
                            />
                            {roundStartPrice > 0 && (
                              <ReferenceLine y={roundStartPrice} stroke="#f59e0b" strokeDasharray="5 5" />
                            )}
                            <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} fill="url(#priceGradient)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          <Activity className="animate-pulse mr-2" size={24} />
                          <span>Loading chart...</span>
                        </div>
                      )}
                    </div>

                    {/* Betting Buttons */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <button
                        onClick={() => handlePlaceBet('up')}
                        disabled={loading || !canBet}
                        className="relative bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500/50 p-6 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed group overflow-hidden"
                      >
                        <div className="relative z-10">
                          <ArrowUpRight 
                            size={36} 
                            className="text-green-500 mx-auto mb-2 group-hover:scale-110 transition-transform" 
                          />
                          <p className="text-xl font-black text-green-500">PREDICT UP</p>
                          <p className="text-xs text-green-400 mt-1">
                            Payout: {rounds.current.upMultiplier || '1.80'}x
                          </p>
                        </div>
                        {loading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </button>

                      <button
                        onClick={() => handlePlaceBet('down')}
                        disabled={loading || !canBet}
                        className="relative bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/50 p-6 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed group overflow-hidden"
                      >
                        <div className="relative z-10">
                          <ArrowDownRight 
                            size={36} 
                            className="text-red-500 mx-auto mb-2 group-hover:scale-110 transition-transform" 
                          />
                          <p className="text-xl font-black text-red-500">PREDICT DOWN</p>
                          <p className="text-xs text-red-400 mt-1">
                            Payout: {rounds.current.downMultiplier || '1.80'}x
                          </p>
                        </div>
                        {loading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Status Message */}
                    {!canBet && rounds.current.status === 'locked' && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center mb-4">
                        <p className="text-yellow-500 text-sm flex items-center justify-center gap-2">
                          <Clock size={16} />
                          Betting closed - Waiting for results...
                        </p>
                      </div>
                    )}

                    {/* Pool Statistics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-500/10 p-3 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-green-400 text-sm">UP Pool</span>
                          <span className="text-green-400 text-xs">{rounds.current.totalUpBets || 0} bets</span>
                        </div>
                        <p className="text-lg font-bold text-green-500">
                          ₦{formatCurrency(rounds.current.totalUpAmount)}
                        </p>
                      </div>
                      <div className="bg-red-500/10 p-3 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-red-400 text-sm">DOWN Pool</span>
                          <span className="text-red-400 text-xs">{rounds.current.totalDownBets || 0} bets</span>
                        </div>
                        <p className="text-lg font-bold text-red-500">
                          ₦{formatCurrency(rounds.current.totalDownAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-3xl p-12 border border-dashed border-slate-700 text-center">
                    <Clock className="mx-auto mb-4 text-gray-600 animate-pulse" size={48} />
                    <p className="text-gray-500 text-lg">Waiting for next round...</p>
                    <p className="text-gray-600 text-sm mt-2">A new round will start soon</p>
                    <button
                      onClick={handleRefresh}
                      className="mt-4 px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/80 transition"
                    >
                      Refresh
                    </button>
                  </div>
                )}
              </div>

              {/* ===== SLIDE 3: UPCOMING ROUND ===== */}
              <div className="min-w-full px-1">
                {rounds.upcoming ? (
                  <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-sm text-gray-400">Round #{rounds.upcoming.roundNumber}</p>
                        <h3 className="text-xl font-bold text-white">Upcoming Round</h3>
                      </div>
                      <div className="bg-blue-500/20 px-4 py-2 rounded-xl">
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
                          {new Date(rounds.upcoming.startTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <p className="text-blue-400 text-sm text-center">
                        💡 Tip: Prepare your strategy while waiting!
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
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={20} className="text-primary" />
            <p className="text-white font-bold">Select Bet Amount</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {[500, 1000, 2000, 5000, 10000, 50000].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                className={`px-5 py-3 rounded-xl font-bold transition-all ${
                  betAmount === amt
                    ? 'bg-primary text-white scale-105 shadow-lg shadow-primary/30'
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
                value={betAmount}
                min="100"
                max={walletBalance}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white w-32 focus:outline-none focus:ring-2 focus:ring-primary"
                onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Quick Info */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-400">
            <span>Min: ₦100</span>
            <span>•</span>
            <span>Max: ₦100,000</span>
            <span>•</span>
            <span>Fee: 20%</span>
            <span>•</span>
            <span className="text-green-400">Your Balance: ₦{formatCurrency(walletBalance)}</span>
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
              {myActiveBets.map(bet => (
                <div 
                  key={bet.id} 
                  className={`bg-slate-900/50 p-4 rounded-2xl border ${
                    bet.prediction === 'up' ? 'border-green-500/30' : 'border-red-500/30'
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
                        ₦{formatCurrency(bet.amount || bet.totalAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Potential Win</p>
                      <p className="text-md font-bold text-primary">
                        ₦{formatCurrency((bet.amount || bet.totalAmount) * 1.8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Round #{bet.roundNumber}</span>
                    {bet.isCurrentlyWinning !== undefined && (
                      <span className={bet.isCurrentlyWinning ? 'text-green-500' : 'text-red-500'}>
                        {bet.isCurrentlyWinning ? '✓ Winning' : '✗ Losing'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
