
import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Calendar,
  AlertCircle
} from 'lucide-react';

const History = () => {
  const [bets, setBets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, win, loss

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filter !== 'all' ? { result: filter } : {};
      
      // ✅ FIXED: res is already response.data from interceptor
      const res = await api.get('/trading/my-bets/history', { params });
      
      console.log('History Response:', res); // Debug log
      
      // ✅ Access directly without .data
      if (res.success) {
        setBets(res.bets || []);
        setStats(res.statistics || null);
      } else {
        setError('Failed to load bet history');
      }
    } catch (err) {
      console.error('Fetch history error:', err);
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (result) => {
    switch (result) {
      case 'win':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm font-bold">
            <CheckCircle size={14} /> Win
          </span>
        );
      case 'loss':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-sm font-bold">
            <XCircle size={14} /> Loss
          </span>
        );
      case 'refund':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-500 rounded-full text-sm font-bold">
            <RotateCcw size={14} /> Refund
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-darker p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Calendar className="text-primary" /> Bet History
          </h1>
          <p className="text-gray-400 mt-2">Your trading performance</p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700">
              <p className="text-gray-400 text-sm mb-2">Total Bets</p>
              <p className="text-3xl font-black text-white">{stats.totalBets || 0}</p>
            </div>
            <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/30">
              <p className="text-green-300 text-sm mb-2">Wins</p>
              <p className="text-3xl font-black text-green-500">{stats.wins || 0}</p>
              <p className="text-xs text-green-400 mt-1">{stats.winRate || 0}% Win Rate</p>
            </div>
            <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/30">
              <p className="text-red-300 text-sm mb-2">Losses</p>
              <p className="text-3xl font-black text-red-500">{stats.losses || 0}</p>
            </div>
            <div className={`p-6 rounded-2xl border ${stats.netProfit >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <p className="text-gray-300 text-sm mb-2">Net Profit</p>
              <p className={`text-3xl font-black ${stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.netProfit >= 0 ? '+' : ''}₦{Math.abs(stats.netProfit || 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6 bg-slate-800/40 p-2 rounded-2xl border border-slate-700">
          {['all', 'win', 'loss'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl font-semibold capitalize transition-all ${filter === f ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {f === 'all' ? 'All Bets' : f === 'win' ? 'Wins Only' : 'Losses Only'}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle size={24} />
              <div>
                <p className="font-bold">Error Loading History</p>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
            <button 
              onClick={fetchHistory}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Bets List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading history...</p>
          </div>
        ) : bets.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-700">
            <Calendar size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg">No bets found</p>
            <p className="text-gray-500 text-sm mt-2">
              {filter !== 'all' 
                ? `You have no ${filter === 'win' ? 'winning' : 'losing'} bets yet` 
                : 'Start betting to see your history here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bets.map(bet => (
              <div key={bet.id} className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 border border-slate-700 hover:border-slate-600 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left: Round & Prediction */}
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${bet.prediction === 'up' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {bet.prediction === 'up' ? 
                        <TrendingUp className="text-green-500" size={24} /> : 
                        <TrendingDown className="text-red-500" size={24} />
                      }
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">
                        Round #{bet.round?.roundNumber || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(bet.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {bet.round?.startPrice && bet.round?.endPrice && (
                        <p className="text-xs text-gray-500 mt-1">
                          ${parseFloat(bet.round.startPrice).toLocaleString()} → ${parseFloat(bet.round.endPrice).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle: Amounts */}
                  <div className="text-center bg-slate-900/50 p-4 rounded-xl">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Bet Amount</p>
                    <p className="text-white font-bold text-xl">
                      ₦{parseFloat(bet.totalAmount || 0).toLocaleString()}
                    </p>
                    {bet.feeAmount && (
                      <p className="text-xs text-gray-500 mt-1">
                        Fee: ₦{parseFloat(bet.feeAmount).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="text-center bg-slate-900/50 p-4 rounded-xl">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Payout</p>
                    <p className={`font-bold text-xl ${parseFloat(bet.payout || 0) > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                      ₦{parseFloat(bet.payout || 0).toLocaleString()}
                    </p>
                  </div>

                  {/* Right: Result & Profit */}
                  <div className="text-right">
                    {getResultBadge(bet.result)}
                    <p className={`text-2xl font-black mt-2 ${parseFloat(bet.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {parseFloat(bet.profit || 0) >= 0 ? '+' : ''}₦{Math.abs(parseFloat(bet.profit || 0)).toLocaleString()}
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

export default History;
