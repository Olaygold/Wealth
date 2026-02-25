
// src/pages/admin/RoundDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import adminService from '../../services/adminService'; // ✅ Changed from adminApi
import toast from 'react-hot-toast';

const RoundDetails = () => {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (roundId) {
      loadRoundDetails();
    }
  }, [roundId]);

  const loadRoundDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getRoundDetails(roundId);
      
      if (res.success) {
        setData(res.data); // Backend returns: { success: true, data: { round: {...}, statistics: {...} } }
      } else {
        setError('Failed to load round details');
        toast.error('Failed to load round details');
      }
    } catch (error) {
      console.error('Failed to load round details:', error);
      setError(error.message || 'Failed to load round details');
      toast.error(error.message || 'Failed to load round details');
    } finally {
      setLoading(false);
    }
  };

  const exportBets = () => {
    if (!data?.round?.bets || data.round.bets.length === 0) {
      toast.error('No bets to export');
      return;
    }

    try {
      const headers = ['User', 'Email', 'Prediction', 'Stake Amount', 'Total Amount', 'Result', 'Payout', 'Profit', 'Placed At'];
      const csvData = data.round.bets.map(bet => [
        bet.user?.username || 'N/A',
        bet.user?.email || 'N/A',
        bet.prediction?.toUpperCase() || '-',
        parseFloat(bet.stakeAmount || 0).toFixed(2),
        parseFloat(bet.totalAmount || 0).toFixed(2),
        bet.result || 'pending',
        parseFloat(bet.payout || 0).toFixed(2),
        parseFloat(bet.profit || 0).toFixed(2),
        new Date(bet.createdAt).toLocaleString()
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `round_${data.round.roundNumber}_bets_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Bets exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export bets');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading round details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Round</h3>
        <p className="text-gray-500 mb-4">{error || 'Round not found'}</p>
        <div className="space-x-3">
          <button
            onClick={() => navigate('/admin/rounds')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            Back to Rounds
          </button>
          <button
            onClick={loadRoundDetails}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { round, statistics } = data;

  // Calculate price change
  const priceChange = round.endPrice && round.startPrice 
    ? parseFloat(round.endPrice) - parseFloat(round.startPrice)
    : null;

  const priceChangePercent = priceChange && round.startPrice
    ? (priceChange / parseFloat(round.startPrice)) * 100
    : null;

  // Format currency
  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/rounds')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Round #{round.roundNumber}</h1>
            <p className="text-gray-600">Detailed round information and bets</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadRoundDetails}
            className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          {round.bets?.length > 0 && (
            <button
              onClick={exportBets}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Round Info Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className={`px-6 py-4 ${
          round.result === 'up' 
            ? 'bg-gradient-to-r from-green-600 to-green-700' 
            : round.result === 'down'
            ? 'bg-gradient-to-r from-red-600 to-red-700'
            : round.status === 'active'
            ? 'bg-gradient-to-r from-blue-600 to-blue-700'
            : 'bg-gradient-to-r from-gray-600 to-gray-700'
        } text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-8 w-8 mr-3" />
              <div>
                <h2 className="text-xl font-bold">Round #{round.roundNumber}</h2>
                <p className="opacity-90 flex items-center gap-2">
                  {round.status === 'active' && <Clock size={16} />}
                  {round.status === 'completed' && <CheckCircle size={16} />}
                  {round.status === 'cancelled' && <XCircle size={16} />}
                  {round.status.toUpperCase()}
                </p>
              </div>
            </div>
            {round.result && round.result !== 'cancelled' && (
              <div className="flex items-center text-2xl font-bold">
                {round.result === 'up' ? (
                  <>
                    <TrendingUp className="h-8 w-8 mr-2" /> 
                    UP WON
                  </>
                ) : round.result === 'down' ? (
                  <>
                    <TrendingDown className="h-8 w-8 mr-2" /> 
                    DOWN WON
                  </>
                ) : (
                  <span className="text-lg">TIE</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Start Price</p>
              <p className="text-xl font-bold text-gray-900">
                ${formatCurrency(round.startPrice)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">End Price</p>
              <p className="text-xl font-bold text-gray-900">
                {round.endPrice ? `$${formatCurrency(round.endPrice)}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Price Change</p>
              {priceChange !== null ? (
                <div>
                  <p className={`text-xl font-bold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {priceChange >= 0 ? '+' : ''}${Math.abs(priceChange).toFixed(2)}
                  </p>
                  {priceChangePercent !== null && (
                    <p className={`text-sm ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(3)}%)
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xl font-bold text-gray-400">-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Created At</p>
              <p className="text-sm text-gray-900">
                {new Date(round.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-600">
                {new Date(round.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Time details */}
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Start Time</p>
              <p className="text-gray-900 font-medium">
                {new Date(round.startTime).toLocaleString()}
              </p>
            </div>
            {round.lockTime && (
              <div>
                <p className="text-gray-500">Lock Time</p>
                <p className="text-gray-900 font-medium">
                  {new Date(round.lockTime).toLocaleString()}
                </p>
              </div>
            )}
            {round.endTime && (
              <div>
                <p className="text-gray-500">End Time</p>
                <p className="text-gray-900 font-medium">
                  {new Date(round.endTime).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bets</p>
              <p className="text-2xl font-bold text-gray-900">{statistics?.totalBets || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex space-x-4 text-sm">
            <span className="text-green-600 flex items-center">
              <TrendingUp size={14} className="mr-1" />
              {statistics?.upBets || 0} UP
            </span>
            <span className="text-red-600 flex items-center">
              <TrendingDown size={14} className="mr-1" />
              {statistics?.downBets || 0} DOWN
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Wagered</p>
              <p className="text-2xl font-bold text-gray-900">
                ₦{formatCurrency(statistics?.totalWagered)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            <div>UP: ₦{formatCurrency(statistics?.totalUpAmount)}</div>
            <div>DOWN: ₦{formatCurrency(statistics?.totalDownAmount)}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Results</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-green-600">{statistics?.winners || 0}</p>
                <span className="text-gray-400">/</span>
                <p className="text-2xl font-bold text-red-600">{statistics?.losers || 0}</p>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Winners / Losers
            {statistics?.refunds > 0 && ` • ${statistics.refunds} refunds`}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Paid Out</p>
              <p className="text-2xl font-bold text-green-600">
                ₦{formatCurrency(statistics?.totalPaidOut)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Bets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            All Bets ({round.bets?.length || 0})
          </h3>
          {round.bets?.length > 0 && (
            <span className="text-sm text-gray-500">
              Total Pool: ₦{formatCurrency((statistics?.totalUpAmount || 0) + (statistics?.totalDownAmount || 0))}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prediction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit/Loss
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!round.bets || round.bets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No bets placed in this round</p>
                  </td>
                </tr>
              ) : (
                round.bets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {bet.user?.username || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {bet.user?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                        bet.prediction === 'up'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {bet.prediction === 'up' ? (
                          <><TrendingUp size={12} className="mr-1" /> UP</>
                        ) : (
                          <><TrendingDown size={12} className="mr-1" /> DOWN</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₦{formatCurrency(bet.totalAmount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Stake: ₦{formatCurrency(bet.stakeAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        bet.result === 'win'
                          ? 'bg-green-100 text-green-800'
                          : bet.result === 'loss'
                          ? 'bg-red-100 text-red-800'
                          : bet.result === 'refund'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {bet.result === 'win' && <CheckCircle size={12} className="mr-1" />}
                        {bet.result === 'loss' && <XCircle size={12} className="mr-1" />}
                        {bet.result || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₦{formatCurrency(bet.payout)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                      parseFloat(bet.profit || 0) > 0 
                        ? 'text-green-600' 
                        : parseFloat(bet.profit || 0) < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}>
                      {parseFloat(bet.profit || 0) > 0 ? '+' : ''}₦{formatCurrency(bet.profit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(bet.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoundDetails;
