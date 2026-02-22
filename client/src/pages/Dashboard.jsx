
import { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  TrendingUp, TrendingDown, Clock, Users,
  ArrowUpRight, ArrowDownRight, Wallet as WalletIcon,
  ChevronRight, Activity, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const { socket, isConnected } = useSocket();
  const { user, loading: authLoading } = useAuth();

  // States
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceHistory, setPriceHistory] = useState([]);
  const [round, setRound] = useState(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myActiveBets, setMyActiveBets] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get user balance safely
  const userBalance = useMemo(() => {
    if (!user) return 0;
    // Try different possible balance locations
    return user.wallet?.nairaBalance || 
           user.nairaBalance || 
           user.balance || 
           0;
  }, [user]);

  // Fetch initial data
  useEffect(() => {
    const initDashboard = async () => {
      setDataLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchCurrentRound(),
          fetchMyBets(),
          fetchInitialPrice()
        ]);
      } catch (err) {
        console.error('Dashboard init error:', err);
        setError('Failed to load dashboard data');
        toast.error('Failed to load data. Please refresh.');
      } finally {
        setDataLoading(false);
      }
    };

    if (user) {
      initDashboard();
    }
  }, [user]);

  // Fetch initial price
  const fetchInitialPrice = async () => {
    try {
      const res = await api.get('/trading/current-price');
      if (res.data?.price) {
        setCurrentPrice(res.data.price);
        setPriceHistory([
          { time: new Date().toLocaleTimeString(), price: res.data.price }
        ]);
      }
    } catch (err) {
      console.error('Price fetch error:', err);
      // Set fallback price
      setCurrentPrice(43250.00);
      setPriceHistory([
        { time: new Date().toLocaleTimeString(), price: 43250.00 }
      ]);
    }
  };

  // Socket Listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('price_update', (data) => {
      if (data?.price) {
        setCurrentPrice(data.price);
        setPriceHistory(prev => {
          const newHistory = [...prev, { 
            time: new Date().toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            }), 
            price: data.price 
          }];
          return newHistory.slice(-30); // Keep last 30 points
        });
      }
    });

    socket.on('round_start', (data) => {
      setRound(data);
      toast.success(`Round #${data.roundNumber} Started! 🎯`, {
        duration: 3000,
        icon: '🚀'
      });
    });

    socket.on('round_end', (data) => {
      fetchCurrentRound();
      fetchMyBets();
      if (data.result === 'up') {
        toast.success('Round Ended: BTC went UP! 📈', { duration: 4000 });
      } else {
        toast.error('Round Ended: BTC went DOWN! 📉', { duration: 4000 });
      }
    });

    socket.on('connect_error', () => {
      toast.error('Connection lost. Reconnecting...', { id: 'socket-error' });
    });

    return () => {
      socket.off('price_update');
      socket.off('round_start');
      socket.off('round_end');
      socket.off('connect_error');
    };
  }, [socket, isConnected]);

  // Timer Logic
  useEffect(() => {
    if (!round || !round.endTime) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(round.endTime).getTime();
      const diff = end - now;
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [round]);

  // Fetch current round
  const fetchCurrentRound = async () => {
    try {
      const res = await api.get('/trading/current-round');
      if (res.data?.round) {
        setRound(res.data.round);
      } else {
        setRound(null);
      }
    } catch (err) {
      console.error('Round fetch error:', err);
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        // Optionally trigger logout
      }
    }
  };

  // Fetch my bets
  const fetchMyBets = async () => {
    try {
      const res = await api.get('/trading/my-bets/active');
      setMyActiveBets(res.data?.activeBets || []);
    } catch (err) {
      console.error('Bets fetch error:', err);
      setMyActiveBets([]);
    }
  };

  // Place bet handler
  const handlePlaceBet = async (prediction) => {
    // Validation checks
    if (!round) {
      toast.error('No active round. Please wait.');
      return;
    }

    if (timeLeft < 30) {
      toast.error('⏰ Too late! Round ending soon.');
      return;
    }

    if (betAmount < 100) {
      toast.error('Minimum bet is ₦100');
      return;
    }

    if (betAmount > userBalance) {
      toast.error('Insufficient balance!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/trading/bet', {
        roundId: round.id,
        prediction,
        amount: betAmount
      });

      toast.success(`✅ Bet placed on ${prediction.toUpperCase()}! Good luck! 🍀`, {
        duration: 4000
      });

      // Refresh data
      await Promise.all([fetchMyBets(), fetchCurrentRound()]);
      
    } catch (err) {
      console.error('Bet error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to place bet';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Format time helper
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-8 max-w-md text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary px-6 py-3 rounded-xl text-white font-bold"
          >
            Reload Page
          </button>
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

      {/* Header Section */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            Wealth Trading <Activity className="text-primary animate-pulse" />
          </h1>
          <p className="text-gray-400">BTC/USD 5-Minute Prediction</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-widest">Balance</p>
            <p className="text-xl font-bold text-green-400">
              ₦{parseFloat(userBalance).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
            <WalletIcon size={20} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left & Middle: Chart & Betting */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Chart Card */}
          <div className="bg-slate-800/40 backdrop-blur-md rounded-3xl p-6 border border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/20 rounded-2xl text-orange-500">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Live BTC Price</p>
                  <h2 className="text-3xl font-black text-white">
                    ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Round Time Left</p>
                <div className={`flex items-center gap-2 text-2xl font-mono font-bold ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                  <Clock size={20} /> {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              {priceHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceHistory}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#64748b" 
                      tick={{ fontSize: 10 }} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fontSize: 10 }}
                      domain={['dataMin - 100', 'dataMax + 100']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '12px',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                      }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#6366f1" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Activity size={40} className="mx-auto mb-2 opacity-20" />
                    <p>Waiting for price data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Betting Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => handlePlaceBet('up')}
              disabled={loading || timeLeft < 30 || !round}
              className="group relative overflow-hidden bg-green-500/10 hover:bg-green-500/20 border border-green-500/50 p-8 rounded-3xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <div className="relative z-10 flex flex-col items-center gap-2">
                <ArrowUpRight size={40} className="text-green-500 group-hover:scale-125 transition-transform" />
                <span className="text-2xl font-black text-green-500 uppercase tracking-tighter">Predict UP</span>
                <span className="text-xs text-green-400 opacity-60">Payout Ratio: {round?.upMultiplier || 1.8}x</span>
              </div>
            </button>

            <button 
              onClick={() => handlePlaceBet('down')}
              disabled={loading || timeLeft < 30 || !round}
              className="group relative overflow-hidden bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 p-8 rounded-3xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <div className="relative z-10 flex flex-col items-center gap-2">
                <ArrowDownRight size={40} className="text-red-500 group-hover:scale-125 transition-transform" />
                <span className="text-2xl font-black text-red-500 uppercase tracking-tighter">Predict DOWN</span>
                <span className="text-xs text-red-400 opacity-60">Payout Ratio: {round?.downMultiplier || 1.8}x</span>
              </div>
            </button>
          </div>

          {/* Bet Amount Selector */}
          <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700">
            <p className="text-sm text-gray-400 mb-4">Select Investment Amount (₦)</p>
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
                placeholder="Custom"
                value={betAmount}
                min="100"
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white w-32 focus:outline-none focus:ring-2 focus:ring-primary"
                onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar: Stats & My Bets */}
        <div className="space-y-6">
          {/* Round Stats */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users size={18} className="text-primary" /> Pool Stats
            </h3>
            {round ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Up Stake</span>
                  <span className="text-green-400 font-bold">₦{(round.totalUpAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Down Stake</span>
                  <span className="text-red-400 font-bold">₦{(round.totalDownAmount || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-green-500 h-full transition-all duration-500" 
                    style={{ 
                      width: `${((round.totalUpAmount || 0) / ((round.totalUpAmount || 0) + (round.totalDownAmount || 1))) * 100}%` 
                    }}
                  ></div>
                  <div 
                    className="bg-red-500 h-full transition-all duration-500" 
                    style={{ 
                      width: `${((round.totalDownAmount || 0) / ((round.totalUpAmount || 1) + (round.totalDownAmount || 0))) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No active round</p>
            )}
          </div>

          {/* My Active Bets */}
          <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 min-h-[300px]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              My Active Bets
            </h3>
            {myActiveBets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <Activity size={40} className="mb-2 opacity-20" />
                <p>No active predictions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myActiveBets.map(bet => (
                  <div key={bet.id} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex justify-between items-center">
                    <div>
                      <p className={`text-xs font-bold uppercase ${bet.prediction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {bet.prediction === 'up' ? '📈 UP' : '📉 DOWN'}
                      </p>
                      <p className="text-white font-bold">₦{bet.amount?.toLocaleString() || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Potential Win</p>
                      <p className="text-sm font-bold text-primary">
                        ₦{((bet.amount || 0) * (bet.prediction === 'up' ? round?.upMultiplier : round?.downMultiplier || 1.8)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="w-full mt-6 py-3 text-sm text-gray-400 hover:text-white transition flex items-center justify-center gap-1">
              View All History <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
