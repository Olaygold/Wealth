// src/pages/admin/RoundDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, TrendingUp, TrendingDown, Users, DollarSign, Download } from 'lucide-react';
import adminApi from '../../services/adminApi';

const RoundDetails = () => {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoundDetails();
  }, [roundId]);

  const loadRoundDetails = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getRoundDetails(roundId);
      setData(res.data.data);
    } catch (error) {
      console.error('Failed to load round details:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportBets = () => {
    const headers = ['User', 'Prediction', 'Stake', 'Fee', 'Total', 'Result', 'Payout', 'Profit'];
    const csvData = data.round.bets.map(bet => [
      bet.user?.username || 'N/A',
      bet.prediction,
      bet.stakeAmount,
      bet.entryFee,
      bet.totalAmount,
      bet.result || 'pending',
      bet.payout || 0,
      bet.profit || 0
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `round_${data.round.roundNumber}_bets.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Round not found</p>
      </div>
    );
  }

  const { round, statistics } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/rounds')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Round #{round.roundNumber}</h1>
            <p className="text-gray-600">Round details and bets</p>
          </div>
        </div>
        {round.bets.length > 0 && (
          <button
            onClick={exportBets}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Bets
          </button>
        )}
      </div>

      {/* Round Info Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className={`px-6 py-4 ${
          round.result === 'up' 
            ? 'bg-gradient-to-r from-green-600 to-green-700' 
            : round.result === 'down'
            ? 'bg-gradient-to-r from-red-600 to-red-700'
            : 'bg-gradient-to-r from-gray-600 to-gray-700'
        } text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-8 w-8 mr-3" />
              <div>
                <h2 className="text-xl font-bold">Round #{round.roundNumber}</h2>
                <p className="opacity-90">{round.status.toUpperCase()}</p>
              </div>
            </div>
            {round.result && (
              <div className="flex items-center text-2xl font-bold">
                {round.result === 'up' ? (
                  <><TrendingUp className="h-8 w-8 mr-2" /> UP</>
                ) : (
                  <><TrendingDown className="h-8 w-8 mr-2" /> DOWN</>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Start Price</p>
              <p className="text-xl font-bold text-gray-900">
                ${parseFloat(round.startPrice || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">End Price</p>
              <p className="text-xl font-bold text-gray-900">
                {round.endPrice ? `$${parseFloat(round.endPrice).toLocaleString()}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Price Change</p>
              <p className={`text-xl font-bold ${
                (round.endPrice - round.startPrice) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {round.endPrice ? (
                  <>
                    {(round.endPrice - round.startPrice) >= 0 ? '+' : ''}
                    ${Math.abs(round.endPrice - round.startPrice).toFixed(2)}
                  </>
                ) : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="text-sm text-gray-900">
                {new Date(round.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bets</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalBets}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex space-x-4 text-sm">
            <span className="text-green-600">↑ {statistics.upBets} UP</span>
            <span className="text-red-600">↓ {statistics.downBets} DOWN</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Wagered</p>
              <p className="text-2xl font-bold text-gray-900">
                ₦{statistics.totalWagered?.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Winners / Losers</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.winners} / {statistics.losers}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Paid Out</p>
              <p className="text-2xl font-bold text-green-600">
                ₦{statistics.totalPaidOut?.toLocaleString()}
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
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Bets ({round.bets.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prediction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stake</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payout</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {round.bets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No bets placed in this round
                  </td>
                </tr>
              ) : (
                round.bets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {bet.user?.username || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {bet.user?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        bet.prediction === 'up'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {bet.prediction?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₦{parseFloat(bet.stakeAmount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₦{parseFloat(bet.entryFee).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₦{parseFloat(bet.totalAmount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        bet.result === 'win'
                          ? 'bg-green-100 text-green-800'
                          : bet.result === 'loss'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {bet.result || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₦{parseFloat(bet.payout || 0).toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      parseFloat(bet.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {parseFloat(bet.profit || 0) >= 0 ? '+' : ''}₦{parseFloat(bet.profit || 0).toLocaleString()}
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
