
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  TrendingUp, TrendingDown, Clock, Users, Trophy,
  ArrowUpRight, ArrowDownRight, Wallet as WalletIcon,
  ChevronRight, ChevronLeft, Activity, AlertCircle,
  Calendar, DollarSign, Timer
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const { socket, isConnected } = useSocket();
  const { user, loading: authLoading } = useAuth();
  const scrollContainerRef = useRef(null);

  // States
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

  // Get user balance - FIX FOR SHOWING 0
  const userBalance = user?.wallet?.balance || 
                      user?.wallet?.nairaBalance || 
                      user?.balance || 
                      user?.nairaBalance || 
                      0;

  // Initialize dashboard
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
        fetchInitialPrice()
      ]);
    } catch (err) {
      console.error('Init error:', err);
      toast.error('Failed to load dashboard');
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch all rounds (previous, current, upcoming)
  const fetchAllRounds = async () => {
    try {
      const res = await api.get('/trading/rounds/all');
      setRounds({
        previous: res.data.previousRound,
        current: res.data.currentRound,
        upcoming: res.data.upcomingRound
      });
      
      if (res.data.currentRound?.startPrice) {
        setRoundStartPrice(res.data.currentRound.startPrice);
      }
    } catch (err) {
      console.error('Rounds fetch error:', err);
    }
  };

  // Fetch initial price
  const fetchInitialPrice = async () => {
    try {
      const res = await api.get('/trading/current-price');
      if (res.data?.price) {
        setCurrentPrice(res.data.price);
        setPriceHistory([
          { time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), 
            price: res.data.price }
        ]);
      }
    } catch (err) {
      console.error('Price fetch error:', err);
      setCurrentPrice(43250.00);
      setPriceHistory([{ time: new Date().toLocaleTimeString(), price: 43250.00 }]);
    }
  };

  // Socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

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
          return newHistory.slice(-60); // Keep last 60 points (1 per 5 seconds = 5 minutes)
        });
      }
    });

    socket.on('round_start', (data) => {
      fetchAllRounds();
      setRoundStartPrice(data.startPrice);
      toast.success(`🚀 Round #${data.roundNumber} Started!`, { duration: 3000 });
    });

    socket.on('round_end', (data) => {
      fetchAllRounds();
      fetchMyBets();
      
      const resultEmoji = data.result === 'up' ? '📈' : '📉';
      const resultText = data.result === 'up' ? 'UP' : 'DOWN';
      toast.success(`${resultEmoji} Round Ended: ${resultText}!`, { duration: 4000 });
    });

    return () => {
      socket.off('price_update');
      socket.off('round_start');
      socket.off('round_end');
    };
  }, [socket, isConnected]);

  // Accurate 5-minute countdown timer
  useEffect(() => {
    if (!rounds.current || !rounds.current.endTime) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const end = new Date(rounds.current.endTime).getTime();
      const diff = end - now;
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    }, 100); // Update every 100ms for accuracy

    return () => clearInterval(interval);
  }, [rounds.current]);

  // Fetch my bets
  const fetchMyBets = async () => {
    try {
      const res = await api.get('/trading/my-bets/active');
      setMyActiveBets(res.data?.activeBets || []);
    } catch (err) {
      console.error('Bets fetch error:', err);
    }
  };

  // Place bet handler
  const handlePlaceBet = async (prediction) => {
    if (!rounds.current) {
      toast.error('⏳ No active round. Please wait.');
      return;
    }

    if (timeLeft < 10) {
      toast.error('⏰ Too late! Round ending soon.');
      return;
    }

    if (betAmount < 100) {
      toast.error('💰 Minimum bet is ₦100');
      return;
    }

    if (betAmount > userBalance) {
      toast.error(`❌ Insufficient balance! You have ₦${userBalance.toLocaleString()}`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/trading/bet', {
        roundId: rounds.current.id,
        prediction,
        amount: betAmount
      });

      toast.success(`✅ Bet placed on ${prediction.toUpperCase()}! 🍀`, { duration: 4000 });
      await Promise.all([fetchMyBets(), fetchAllRounds()]);
      
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to place bet';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Swipe/Slide handlers
  const handleSlideChange = (direction) => {
    if (direction === 'left' && activeSlide < 2) {
      setActiveSlide(prev => prev + 1);
    } else if (direction === 'right' && activeSlide > 0) {
      setActiveSlide(prev => prev - 1);
    }
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate price change
  const priceChange = roundStartPrice > 0 ? ((currentPrice - roundStartPrice) / roundStartPrice) * 100 : 0;

  // Loading state
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darker p-4 lg:p-8">
      {/* Connection Status */}
      {!isConnected && (
        <div className="max-w-7xl mx-auto mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-yellow-500" size={20} />
          <p className="text-yellow-500 text-sm">Reconnecting to live data...</p>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            Wealth Trading <Activity className="text-primary animate-pulse" />
          </h1>
          <p className="text-gray-400">BTC/USD 5-Minute Prediction</p>
        </div>
        
        {/* Balance Display - FIXED */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-2xl border border-green-500/30">
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-widest">Available Balance</p>
            <p className="text-2xl font-black text-green-400">
              ₦{parseFloat(userBalance || 0).toLocaleString('en-NG', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
            <WalletIcon size={24} />
          </div>
        </div>
      </div>

      {/* SWIPEABLE ROUNDS CONTAINER */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleSlideChange('right')}
              disabled={activeSlide === 0}
              className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm text-gray-400">
              {activeSlide === 0 ? 'Previous Round' : activeSlide === 1 ? 'Current Round (Live)' : 'Upcoming Round'}
            </span>
            <button 
              onClick={() => handleSlideChange('left')}
              disabled={activeSlide === 2}
              className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Slide Indicators */}
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div 
                key={i}
                className={`h-2 rounded-full transition-all ${
                  activeSlide === i ? 'w-8 bg-primary' : 'w-2 bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Rounds Slider */}
        <div className="overflow-hidden">
          <div 
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {/* PREVIOUS ROUND */}
            <div className="min-w-full px-2">
              {rounds.previous ? (
                <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm text-gray-400">Round #{rounds.previous.roundNumber}</p>
                      <h3 className="text-xl font-bold text-white">Previous Round (Closed)</h3>
                    </div>
                    <div className={`px-4 py-2 rounded-xl font-bold ${
                      rounds.previous.result === 'up' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {rounds.previous.result === 'up' ? '📈 UP' : '📉 DOWN'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl">
                      <p className="text-xs text-gray-400 mb-1">Start Price</p>
                      <p className="text-lg font-bold text-white">${rounds.previous.startPrice?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl">
                      <p className="text-xs text-gray-400 mb-1">End Price</p>
                      <p className="text-lg font-bold text-white">${rounds.previous.endPrice?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl">
                      <p className="text-xs text-gray-400 mb-1">Change</p>
                      <p className={`text-lg font-bold ${
                        (rounds.previous.endPrice - rounds.previous.startPrice) > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {((rounds.previous.endPrice - rounds.previous.startPrice) / rounds.previous.startPrice * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-green-500/10 p-3 rounded-xl">
                      <p className="text-xs text-green-400 mb-1">Total UP Stakes</p>
                      <p className="text-md font-bold text-green-500">₦{rounds.previous.totalUpAmount?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-red-500/10 p-3 rounded-xl">
                      <p className="text-xs text-red-400 mb-1">Total DOWN Stakes</p>
                      <p className="text-md font-bold text-red-500">₦{rounds.previous.totalDownAmount?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/20 rounded-3xl p-12 border border-dashed border-slate-700 text-center">
                  <Trophy className="mx-auto mb-3 text-gray-600" size={40} />
                  <p className="text-gray-500">No previous round data</p>
                </div>
              )}
            </div>

            {/* CURRENT ROUND (LIVE BETTING) */}
            <div className="min-w-full px-2">
              {rounds.current ? (
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border-2 border-primary/50 shadow-lg shadow-primary/20">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm text-primary font-bold">LIVE • Round #{rounds.current.roundNumber}</p>
                      <h3 className="text-xl font-bold text-white">Current Round (Active)</h3>
                    </div>
                    <div className="bg-primary/20 px-4 py-2 rounded-xl">
                      <p className="text-xs text-gray-400">Time Left</p>
                      <p className={`text-2xl font-mono font-bold ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                        {formatTime(timeLeft)}
                      </p>
                    </div>
                  </div>

                  {/* Live Price Display */}
                  <div className="bg-slate-900/50 p-6 rounded-2xl mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Start Price</p>
                        <p className="text-xl font-bold text-white">${roundStartPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Current Price</p>
                        <p className="text-xl font-bold text-white">${currentPrice.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <p className="text-sm text-gray-400">Change:</p>
                      <p className={`text-lg font-bold ${priceChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
                        {priceChange > 0 ? <TrendingUp className="inline ml-1" size={16} /> : <TrendingDown className="inline ml-1" size={16} />}
                      </p>
                    </div>
                  </div>

                  {/* Price Chart */}
                  <div className="h-[200px] mb-4">
                    {priceHistory.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={priceHistory}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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
                          <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} fill="url(#colorPrice)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <Activity className="animate-pulse" size={40} />
                      </div>
                    )}
                  </div>

                  {/* Betting Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handlePlaceBet('up')}
                      disabled={loading || timeLeft < 10}
                      className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 p-6 rounded-2xl transition-all disabled:opacity-30 group"
                    >
                      <ArrowUpRight size={32} className="text-green-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-xl font-black text-green-500">PREDICT UP</p>
                      <p className="text-xs text-green-400 mt-1">Payout: {rounds.current.upMultiplier || 1.8}x</p>
                    </button>

                    <button 
                      onClick={() => handlePlaceBet('down')}
                      disabled={loading || timeLeft < 10}
                      className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 p-6 rounded-2xl transition-all disabled:opacity-30 group"
                    >
                      <ArrowDownRight size={32} className="text-red-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-xl font-black text-red-500">PREDICT DOWN</p>
                      <p className="text-xs text-red-400 mt-1">Payout: {rounds.current.downMultiplier || 1.8}x</p>
                    </button>
                  </div>

                  {/* Pool Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-green-500/10 p-3 rounded-xl">
                      <p className="text-xs text-green-400 mb-1">Total UP Stakes</p>
                      <p className="text-md font-bold text-green-500">₦{rounds.current.totalUpAmount?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-red-500/10 p-3 rounded-xl">
                      <p className="text-xs text-red-400 mb-1">Total DOWN Stakes</p>
                      <p className="text-md font-bold text-red-500">₦{rounds.current.totalDownAmount?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/20 rounded-3xl p-12 border border-dashed border-slate-700 text-center">
                  <Clock className="mx-auto mb-3 text-gray-600 animate-spin" size={40} />
                  <p className="text-gray-500">Waiting for next round...</p>
                </div>
              )}
            </div>

            {/* UPCOMING ROUND */}
            <div className="min-w-full px-2">
              {rounds.upcoming ? (
                <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm text-gray-400">Round #{rounds.upcoming.roundNumber}</p>
                      <h3 className="text-xl font-bold text-white">Upcoming Round</h3>
                    </div>
                    <div className="bg-blue-500/20 px-4 py-2 rounded-xl">
                      <p className="text-sm font-bold text-blue-400">Coming Soon</p>
                    </div>
                  </div>
                  
                  <div className="text-center py-12">
                    <Calendar className="mx-auto mb-3 text-blue-500" size={48} />
                    <p className="text-gray-400 mb-2">This round will start after the current round ends</p>
                    <p className="text-sm text-gray-500">Get ready to place your bets!</p>
                  </div>

                  <div className="bg-slate-900/50 p-4 rounded-xl">
                    <p className="text-xs text-gray-400 mb-2">Scheduled Start Time</p>
                    <p className="text-lg font-bold text-white">
                      {new Date(rounds.upcoming.startTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/20 rounded-3xl p-12 border border-dashed border-slate-700 text-center">
                  <Timer className="mx-auto mb-3 text-gray-600" size={40} />
                  <p className="text-gray-500">No upcoming round scheduled</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bet Amount Selector */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700">
          <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-primary" />
            Select Investment Amount (₦)
          </p>
          <div className="flex flex-wrap gap-3">
            {[500, 1000, 5000, 10000, 50000].map(amt => (
              <button 
                key={amt}
                onClick={() => setBetAmount(amt)}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  betAmount === amt 
                    ? 'bg-primary text-white scale-105 shadow-lg shadow-primary/30' 
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                ₦{amt.toLocaleString()}
              </button>
            ))}
            <input 
              type="number"
              placeholder="Custom Amount"
              value={betAmount}
              min="100"
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white w-40 focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* My Active Bets */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity size={18} className="text-primary" /> My Active Bets
          </h3>
          {myActiveBets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
              <Activity size={40} className="mb-2 opacity-20" />
              <p>No active predictions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myActiveBets.map(bet => (
                <div key={bet.id} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className={`text-xs font-bold uppercase ${bet.prediction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {bet.prediction === 'up' ? '📈 UP' : '📉 DOWN'}
                      </p>
                      <p className="text-white font-bold text-lg">₦{bet.amount?.toLocaleString() || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Potential Win</p>
                      <p className="text-sm font-bold text-primary">
                        ₦{((bet.amount || 0) * (bet.prediction === 'up' ? rounds.current?.upMultiplier : rounds.current?.downMultiplier || 1.8)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Round #{bet.roundNumber || 'N/A'}
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
