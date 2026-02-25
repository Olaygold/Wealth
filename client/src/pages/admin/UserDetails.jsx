// src/pages/admin/UserDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Ban,
  CheckCircle,
  Shield,
  Download
} from 'lucide-react';
import adminApi from '../../services/adminApi';

const UserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  const loadUserDetails = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUserDetails(userId);
      setData(res.data.data);
    } catch (error) {
      console.error('Failed to load user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (isActive) => {
    const reason = prompt(`Reason for ${isActive ? 'activating' : 'deactivating'} user:`);
    if (reason === null) return;

    try {
      await adminApi.updateUserStatus(userId, { isActive, reason });
      loadUserDetails();
    } catch (error) {
      alert('Failed to update user status');
    }
  };

  const handleKYCUpdate = async (kycStatus) => {
    const reason = prompt(`Reason for ${kycStatus} KYC:`);
    if (reason === null) return;

    try {
      await adminApi.updateUserStatus(userId, { kycStatus, reason });
      loadUserDetails();
    } catch (error) {
      alert('Failed to update KYC status');
    }
  };

  const exportUserData = () => {
    const user = data.user;
    const stats = data.statistics;
    
    const csvContent = [
      ['Field', 'Value'],
      ['Username', user.username],
      ['Email', user.email],
      ['Phone', user.phoneNumber || 'N/A'],
      ['Balance', user.wallet?.nairaBalance || 0],
      ['Total Deposited', user.wallet?.totalDeposited || 0],
      ['Total Withdrawn', user.wallet?.totalWithdrawn || 0],
      ['Total Won', user.wallet?.totalWon || 0],
      ['Total Lost', user.wallet?.totalLost || 0],
      ['Total Bets', stats.bets.total],
      ['Win Rate', `${stats.bets.winRate}%`],
      ['Net Profit', stats.bets.netProfit],
      ['Joined', new Date(user.createdAt).toLocaleDateString()],
      ['Status', user.isActive ? 'Active' : 'Inactive'],
      ['KYC Status', user.kycStatus || 'pending']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_${user.username}_data.csv`;
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
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  const { user, statistics, recentTransactions, recentBets, pendingDeposits } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
            <p className="text-gray-600">Manage user account</p>
          </div>
        </div>
        <button
          onClick={exportUserData}
          className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </button>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-blue-600">
              {user.username?.charAt(0).toUpperCase()}
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">{user.username}</h2>
              <p className="opacity-90">{user.fullName || 'No name set'}</p>
              <div className="flex items-center space-x-3 mt-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  user.isActive 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  user.kycStatus === 'approved'
                    ? 'bg-green-500 text-white'
                    : user.kycStatus === 'rejected'
                    ? 'bg-red-500 text-white'
                    : 'bg-yellow-500 text-white'
                }`}>
                  KYC: {user.kycStatus || 'pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <Mail className="h-4 w-4" />
              <span className="text-sm">{user.email}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Phone className="h-4 w-4" />
              <span className="text-sm">{user.phoneNumber || 'Not set'}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <User className="h-4 w-4" />
              <span className="text-sm">{statistics.referrals} referrals</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 flex flex-wrap gap-3">
          {user.isActive ? (
            <button
              onClick={() => handleStatusChange(false)}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
            >
              <Ban className="h-4 w-4 mr-2" />
              Deactivate User
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange(true)}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Activate User
            </button>
          )}

          {user.kycStatus !== 'approved' && (
            <button
              onClick={() => handleKYCUpdate('approved')}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              <Shield className="h-4 w-4 mr-2" />
              Approve KYC
            </button>
          )}

          {user.kycStatus !== 'rejected' && (
            <button
              onClick={() => handleKYCUpdate('rejected')}
              className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
            >
              <Shield className="h-4 w-4 mr-2" />
              Reject KYC
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                ₦{parseFloat(user.wallet?.nairaBalance || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          {parseFloat(user.wallet?.lockedBalance || 0) > 0 && (
            <p className="text-xs text-orange-600 mt-2">
              Locked: ₦{parseFloat(user.wallet.lockedBalance).toLocaleString()}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Deposited</p>
              <p className="text-2xl font-bold text-green-600">
                ₦{parseFloat(user.wallet?.totalDeposited || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Withdrawn</p>
              <p className="text-2xl font-bold text-red-600">
                ₦{parseFloat(user.wallet?.totalWithdrawn || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Win Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {statistics.bets.winRate}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {statistics.bets.wins}W / {statistics.bets.losses}L
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {['overview', 'transactions', 'bets'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Betting Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Betting Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Bets</span>
                    <span className="font-medium">{statistics.bets.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Wagered</span>
                    <span className="font-medium">₦{statistics.bets.totalWagered.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Profit/Loss</span>
                    <span className={`font-medium ${
                      statistics.bets.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {statistics.bets.netProfit >= 0 ? '+' : ''}₦{statistics.bets.netProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Won</span>
                    <span className="font-medium text-green-600">
                      ₦{parseFloat(user.wallet?.totalWon || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Lost</span>
                    <span className="font-medium text-red-600">
                      ₦{parseFloat(user.wallet?.totalLost || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fees Paid</span>
                    <span className="font-medium">
                      ₦{((parseFloat(user.wallet?.totalDeposited || 0) + parseFloat(user.wallet?.totalWon || 0)) * 0.01).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          tx.type === 'deposit' 
                            ? 'bg-green-100 text-green-800'
                            : tx.type === 'withdrawal'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        ₦{parseFloat(tx.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          tx.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : tx.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentTransactions.length === 0 && (
                <p className="text-center py-8 text-gray-500">No transactions found</p>
              )}
            </div>
          )}

          {activeTab === 'bets' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Round</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prediction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stake</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentBets.map((bet) => (
                    <tr key={bet.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        #{bet.round?.roundNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          bet.prediction === 'up'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {bet.prediction?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ₦{parseFloat(bet.totalAmount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          bet.result === 'win'
                            ? 'bg-green-100 text-green-800'
                            : bet.result === 'loss'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bet.result || 'pending'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap font-medium ${
                        parseFloat(bet.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {parseFloat(bet.profit || 0) >= 0 ? '+' : ''}₦{parseFloat(bet.profit || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(bet.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentBets.length === 0 && (
                <p className="text-center py-8 text-gray-500">No bets found</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
