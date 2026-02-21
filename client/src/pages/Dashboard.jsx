import { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  TrendingUp, TrendingDown, Clock, Users, 
  ArrowUpRight, ArrowDownRight, Wallet as WalletIcon, 
  ChevronRight, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

const Dashboard = () => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  
  // States
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceHistory, setPriceHistory] = useState([]);
  const [round, setRound] = useState(null);
  const [betAmount, setBetAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myActiveBets, setMyActiveBets] = useState([]);

  // Fetch initial data
  useEffect(() => {
    fetchCurrentRound();
    fetchMyBets();
  }, []);

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('price_update', (data) => {
      setCurrentPrice(data.price);
      setPriceHistory(prev => {
        const newHistory = [...prev, { time: new Date().toLocaleTimeString(), price: data.price }];
        return newHistory.slice(-20); // Keep last 20 points
      });
    });

    socket.on('round_start', (data) => {
      setRound(data);
      toast.success(`Round #${data.roundNumber} Started!`);
    });

    socket.on('round_end', (data) => {
      fetchCurrentRound();
      fetchMyBets();
      if (data.result === 'up') toast.success('Round Ended: BTC went UP! 📈');
      else toast.error('Round Ended: BTC went DOWN! 📉');
    });

    return () => {
      socket.off('price_update');
      socket.off('round_start');
      socket.off('round_end');
    };
  }, [socket]);

  // Timer Logic
  useEffect(() => {
    if (!round) return;
    const interval = setInterval(() => {
      const diff = new Date(round.endTime) - new Date();
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [round]);

  const fetchCurrentRound = async () => {
    try {
      const res = await api.get('/trading/current-round');
      setRound(res.data.round);
    } catch (err) { console.error(err); }
  };

  const fetchMyBets = async () => {
    try {
      const res = await api.get('/trading/my-bets/active');
      setMyActiveBets(res.data.activeBets);
    } catch (err) { console.error(err); }
  };

  const handlePlaceBet = async (prediction) => {
    if (betAmount < 100) return toast.error('Minimum bet is ₦100');
    setLoading(true);
    try {
      await api.post('/trading/bet', {
        roundId: round.id,
        prediction,
        amount: betAmount
      });
      toast.success(`Bet placed on ${prediction.toUpperCase()}!`);
      fetchMyBets();
    } catch (err) {
      toast.error(err.message || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-darker p-4 lg:p-8">
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
            <p className="text-xl font-bold text-green-400">₦{parseFloat(user?.wallet?.nairaBalance || 0).toLocaleString()}</p>
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
                  <h2 className="text-3xl font-black text-white">${currentPrice.toLocaleString()}</h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Round Time Left</p>
                <div className="flex items-center gap-2 text-2xl font-mono font-bold text-primary">
                  <Clock size={20} /> {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Betting Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => handlePlaceBet('up')}
              disabled={loading || timeLeft < 30}
              className="group relative overflow-hidden bg-green-500/10 hover:bg-green-500/20 border border-green-500/50 p-8 rounded-3xl transition-all disabled:opacity-50"
            >
              <div className="relative z-10 flex flex-col items-center gap-2">
                <ArrowUpRight size={40} className="text-green-500 group-hover:scale-125 transition-transform" />
                <span className="text-2xl font-black text-green-500 uppercase tracking-tighter">Predict UP</span>
                <span className="text-xs text-green-400 opacity-60">Payout Ratio: {round?.upMultiplier || 1.8}x</span>
              </div>
            </button>

            <button 
              onClick={() => handlePlaceBet('down')}
              disabled={loading || timeLeft < 30}
              className="group relative overflow-hidden bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 p-8 rounded-3xl transition-all disabled:opacity-50"
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
                   className={`px-6 py-3 rounded-xl font-bold transition-all ${betAmount === amt ? 'bg-primary text-white scale-105 shadow-lg shadow-primary/30' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                 >
                   ₦{amt.toLocaleString()}
                 </button>
               ))}
               <input 
                 type="number" 
                 placeholder="Other" 
                 className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white w-32 focus:outline-none focus:ring-2 focus:ring-primary"
                 onChange={(e) => setBetAmount(Number(e.target.value))}
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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Up Stake</span>
                <span className="text-green-400 font-bold">₦{round?.totalUpAmount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Down Stake</span>
                <span className="text-red-400 font-bold">₦{round?.totalDownAmount?.toLocaleString() || 0}</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden flex">
                <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${(round?.totalUpAmount / (round?.totalUpAmount + round?.totalDownAmount)) * 100 || 50}%` }}></div>
                <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${(round?.totalDownAmount / (round?.totalUpAmount + round?.totalDownAmount)) * 100 || 50}%` }}></div>
              </div>
            </div>
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
                        {bet.prediction}
                      </p>
                      <p className="text-white font-bold">₦{bet.totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Potential</p>
                      <p className="text-sm font-bold text-primary">₦{(bet.totalAmount * 1.8).toLocaleString()}</p>
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
