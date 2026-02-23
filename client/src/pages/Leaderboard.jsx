
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Trophy, Medal, Crown, AlertCircle } from 'lucide-react';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState('all'); // all, today, week, month
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ FIXED: res is already response.data from interceptor
      const res = await api.get(`/trading/leaderboard?period=${period}&limit=50`);
      
      console.log('Leaderboard Response:', res); // Debug log
      
      // ✅ Access directly without .data
      if (res.success) {
        setLeaderboard(res.leaderboard || []);
      } else {
        setError('Failed to load leaderboard');
      }
    } catch (err) {
      console.error('Leaderboard error:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="text-yellow-500" size={24} />;
    if (rank === 2) return <Medal className="text-gray-400" size={24} />;
    if (rank === 3) return <Medal className="text-orange-600" size={24} />;
    return <span className="text-gray-500 font-bold">#{rank}</span>;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-slate-500/20 border-gray-400/50';
    if (rank === 3) return 'bg-gradient-to-r from-orange-600/20 to-red-600/20 border-orange-600/50';
    return 'bg-slate-800/40 border-slate-700';
  };

  return (
    <div className="min-h-screen bg-darker p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3 mb-2">
            <Trophy className="text-yellow-500" size={36} /> Leaderboard
          </h1>
          <p className="text-gray-400">Top traders ranked by profit</p>
        </div>

        {/* Period Filter */}
        <div className="flex gap-2 mb-8 bg-slate-800/40 p-2 rounded-2xl border border-slate-700">
          {[
            { value: 'all', label: 'All Time' },
            { value: 'month', label: 'This Month' },
            { value: 'week', label: 'This Week' },
            { value: 'today', label: 'Today' }
          ].map(p => (
            <button 
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`flex-1 py-2 rounded-xl font-semibold transition-all ${period === p.value ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle size={24} />
              <div>
                <p className="font-bold">Error Loading Leaderboard</p>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
            <button 
              onClick={fetchLeaderboard}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Leaderboard List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading leaderboard...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-700">
            <Trophy size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg">No data for this period</p>
            <p className="text-gray-500 text-sm mt-2">
              {period === 'today' && 'No winning bets today yet'}
              {period === 'week' && 'No winning bets this week yet'}
              {period === 'month' && 'No winning bets this month yet'}
              {period === 'all' && 'No winning bets yet - be the first!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((user, index) => (
              <div 
                key={user.username || index} 
                className={`${getRankBg(user.rank)} backdrop-blur-md rounded-2xl p-6 border transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between">
                  
                  {/* Left: Rank & Username */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center">
                      {getRankIcon(user.rank)}
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">{user.username || 'Anonymous'}</p>
                      <p className="text-sm text-gray-400">{user.totalWins || 0} wins</p>
                    </div>
                  </div>

                  {/* Right: Profit & Payout */}
                  <div className="text-right">
                    <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">Total Profit</p>
                    <p className="text-2xl font-black text-green-500">
                      ₦{parseFloat(user.totalProfit || 0).toLocaleString()}
                    </p>
                    {user.totalPayout && (
                      <p className="text-xs text-gray-500 mt-1">
                        Payout: ₦{parseFloat(user.totalPayout).toLocaleString()}
                      </p>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default Leaderboard;
