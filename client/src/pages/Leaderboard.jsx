import { useState, useEffect } from 'react';
import api from '../services/api';
import { Trophy, Medal, Crown } from 'lucide-react';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState('all'); // all, today, week, month
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/trading/leaderboard?period=${period}&limit=50`);
      setLeaderboard(res.data.leaderboard);
    } catch (err) {
      console.error(err);
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

        {/* Leaderboard List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy size={48} className="mx-auto mb-4 opacity-20" />
            <p>No data for this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((user, index) => (
              <div 
                key={index} 
                className={`${getRankBg(user.rank)} backdrop-blur-md rounded-2xl p-6 border transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between">
                  
                  {/* Left: Rank & Username */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center">
                      {getRankIcon(user.rank)}
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">{user.username}</p>
                      <p className="text-sm text-gray-400">{user.totalWins} wins</p>
                    </div>
                  </div>

                  {/* Right: Profit */}
                  <div className="text-right">
                    <p className="text-sm text-gray-400 uppercase tracking-wide">Total Profit</p>
                    <p className="text-2xl font-black text-green-500">
                      ₦{user.totalProfit.toLocaleString()}
                    </p>
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
