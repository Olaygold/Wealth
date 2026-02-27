// src/pages/Referrals.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  DollarSign, 
  TrendingUp,
  Gift,
  ArrowDownToLine,
  RefreshCw,
  Star,
  UserPlus,
  Wallet,
  ChevronRight,
  Info
} from 'lucide-react';
import referralService from '../services/referralService';
import toast from 'react-hot-toast';

const Referrals = () => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [copied, setCopied] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, earnings

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await referralService.getDashboard();
      if (data?.success) {
        setDashboard(data.data);
      } else {
        throw new Error(data?.message || 'Failed to load referral data');
      }
    } catch (error) {
      console.error('Load dashboard error:', error);
      toast.error(error.message || 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < 100) {
      toast.error('Minimum withdrawal is ₦100');
      return;
    }

    if (amount > dashboard?.referralBalance) {
      toast.error('Insufficient referral balance');
      return;
    }

    setWithdrawing(true);
    try {
      const data = await referralService.withdrawToWallet(amount);
      if (data?.success) {
        toast.success(data.message || 'Transfer successful!');
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        loadDashboard(); // Refresh data
      } else {
        throw new Error(data?.message || 'Transfer failed');
      }
    } catch (error) {
      toast.error(error.message || 'Transfer failed');
    } finally {
      setWithdrawing(false);
    }
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading referral data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darker p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Gift className="text-primary" />
              Referral Program
            </h1>
            <p className="text-gray-400 mt-1">
              Invite friends and earn commissions
            </p>
          </div>
          <button
            onClick={loadDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-dark rounded-lg text-gray-300 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Referral Type Badge */}
        <div className={`p-4 rounded-xl ${
          dashboard?.referralType === 'influencer' 
            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30' 
            : 'bg-gradient-to-r from-primary/20 to-blue-500/20 border border-primary/30'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {dashboard?.referralType === 'influencer' ? (
                <Star className="w-8 h-8 text-purple-400" />
              ) : (
                <Users className="w-8 h-8 text-primary" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {dashboard?.referralType === 'influencer' ? 'Influencer Account' : 'Standard Referrer'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {dashboard?.explanation}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-white">{dashboard?.percentage}%</span>
              <p className="text-gray-400 text-sm">Commission Rate</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Referral Balance */}
          <div className="bg-dark rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Referral Balance</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-green-400">
              ₦{formatCurrency(dashboard?.referralBalance)}
            </p>
            {dashboard?.referralBalance > 0 && (
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ArrowDownToLine className="w-3 h-3" />
                Transfer to Wallet
              </button>
            )}
          </div>

          {/* Total Earnings */}
          <div className="bg-dark rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Total Earned</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-white">
              ₦{formatCurrency(dashboard?.totalEarnings)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {dashboard?.stats?.totalTransactions || 0} transactions
            </p>
          </div>

          {/* Total Referrals */}
          <div className="bg-dark rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <UserPlus className="w-4 h-4" />
              <span className="text-sm">People Referred</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-white">
              {dashboard?.referralCount || 0}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {dashboard?.referredUsers?.filter(u => u.hasPlacedBet).length || 0} active
            </p>
          </div>

          {/* Commission Rate */}
          <div className="bg-dark rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Your Rate</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-primary">
              {dashboard?.percentage}%
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {dashboard?.referralType === 'influencer' ? 'Per loss' : 'First bet'}
            </p>
          </div>
        </div>

        {/* Referral Link Card */}
        <div className="bg-dark rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Your Referral Link
          </h3>
          
          <div className="space-y-4">
            {/* Referral Code */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Referral Code</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-darker rounded-lg px-4 py-3 font-mono text-lg text-white border border-gray-700">
                  {dashboard?.referralCode}
                </div>
                <button
                  onClick={() => copyToClipboard(dashboard?.referralCode)}
                  className="p-3 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Referral Link */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Full Link</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-darker rounded-lg px-4 py-3 text-sm text-gray-300 border border-gray-700 truncate">
                  {dashboard?.referralLink}
                </div>
                <button
                  onClick={() => copyToClipboard(dashboard?.referralLink)}
                  className="p-3 bg-primary/20 rounded-lg text-primary hover:bg-primary/30 transition"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href={`https://wa.me/?text=Join%20Wealth%20Trading%20and%20start%20earning!%20${encodeURIComponent(dashboard?.referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 rounded-lg text-white text-sm hover:bg-green-700 transition"
              >
                Share on WhatsApp
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(dashboard?.referralLink)}&text=Join%20Wealth%20Trading!`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition"
              >
                Share on Telegram
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=Join%20Wealth%20Trading!&url=${encodeURIComponent(dashboard?.referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-700 rounded-lg text-white text-sm hover:bg-gray-600 transition"
              >
                Share on X
              </a>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800">
          {['overview', 'users', 'earnings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium capitalize transition ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-dark rounded-xl border border-gray-800 overflow-hidden">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
              
              <div className="space-y-4">
                {dashboard?.referralType === 'influencer' ? (
                  <>
                    <div className="flex items-start gap-4 p-4 bg-darker rounded-lg">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold">1</div>
                      <div>
                        <h4 className="text-white font-medium">Share Your Link</h4>
                        <p className="text-gray-400 text-sm">Share your referral link with your audience</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-darker rounded-lg">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold">2</div>
                      <div>
                        <h4 className="text-white font-medium">They Sign Up & Trade</h4>
                        <p className="text-gray-400 text-sm">Users register and start placing bets</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-darker rounded-lg">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold">3</div>
                      <div>
                        <h4 className="text-white font-medium">Earn {dashboard?.percentage}% on Every Loss</h4>
                        <p className="text-gray-400 text-sm">You earn commission every time they lose a bet</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-4 p-4 bg-darker rounded-lg">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">1</div>
                      <div>
                        <h4 className="text-white font-medium">Share Your Link</h4>
                        <p className="text-gray-400 text-sm">Share your referral link with friends</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-darker rounded-lg">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">2</div>
                      <div>
                        <h4 className="text-white font-medium">They Sign Up</h4>
                        <p className="text-gray-400 text-sm">Friends register using your referral code</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-darker rounded-lg">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">3</div>
                      <div>
                        <h4 className="text-white font-medium">Earn 5% on First Bet</h4>
                        <p className="text-gray-400 text-sm">You earn 5% of their first bet amount</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-300 text-sm">
                    {dashboard?.referralType === 'influencer' 
                      ? 'As an influencer, you earn commission on every loss from your referrals. The more active users you bring, the more you earn!'
                      : 'You earn a one-time 5% commission when each referred user places their first bet.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              {dashboard?.referredUsers?.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Referrals Yet</h3>
                  <p className="text-gray-400">Share your referral link to start earning!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-darker">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">First Bet</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Deposited</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {dashboard?.referredUsers?.map((user) => (
                        <tr key={user.id} className="hover:bg-darker/50">
                          <td className="px-6 py-4">
                            <span className="text-white font-medium">{user.username}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-sm">
                            {formatDate(user.joinedAt)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.isActive 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.hasPlacedBet 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {user.hasPlacedBet ? 'Yes' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-white">
                            ₦{formatCurrency(user.totalDeposited)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <div>
              {dashboard?.recentEarnings?.length === 0 ? (
                <div className="p-12 text-center">
                  <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Earnings Yet</h3>
                  <p className="text-gray-400">Your earnings will appear here when you start earning!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-darker">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Bet Amount</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Your Earning</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {dashboard?.recentEarnings?.map((earning) => (
                        <tr key={earning.id} className="hover:bg-darker/50">
                          <td className="px-6 py-4">
                            <span className="text-white font-medium">{earning.username}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              earning.type === 'first_bet' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {earning.typeLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-400">
                            ₦{formatCurrency(earning.betAmount)}
                          </td>
                          <td className="px-6 py-4 text-right text-green-400 font-medium">
                            +₦{formatCurrency(earning.earnedAmount)}
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-sm">
                            {formatDate(earning.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Transfer to Wallet</h2>
            
            <p className="text-gray-400 mb-4">
              Available balance: <span className="text-green-400 font-medium">₦{formatCurrency(dashboard?.referralBalance)}</span>
            </p>

            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₦</span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-darker border border-gray-700 rounded-lg py-3 pl-8 pr-4 text-white placeholder-gray-500 focus:border-primary focus:outline-none"
                  min="100"
                  max={dashboard?.referralBalance}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum: ₦100</p>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mb-6">
              {[100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setWithdrawAmount(amt.toString())}
                  disabled={amt > dashboard?.referralBalance}
                  className="flex-1 py-2 bg-darker border border-gray-700 rounded-lg text-white text-sm hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ₦{amt}
                </button>
              ))}
              <button
                onClick={() => setWithdrawAmount(dashboard?.referralBalance?.toString())}
                className="flex-1 py-2 bg-primary/20 border border-primary rounded-lg text-primary text-sm hover:bg-primary/30"
              >
                Max
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-3 bg-gray-700 rounded-lg text-white font-medium hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawAmount}
                className="flex-1 py-3 bg-primary rounded-lg text-white font-medium hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {withdrawing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-4 h-4" />
                    Transfer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referrals;
