
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
  Download,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Wallet,
  Activity,
  Clock,
  Award,
  XCircle,
  CreditCard,
  Users as UsersIcon
} from 'lucide-react';
import adminService from '../../services/adminService'; // ✅ Changed from adminApi
import toast from 'react-hot-toast';

const UserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (userId) {
      loadUserDetails();
    }
  }, [userId]);

  const loadUserDetails = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUserDetails(userId);
      
      // ✅ Fixed data extraction
      if (res.success) {
        setData(res.data);
      } else {
        toast.error('Failed to load user details');
        setData(null);
      }
    } catch (error) {
      console.error('Failed to load user details:', error);
      toast.error(error.message || 'Failed to load user details');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUserDetails();
  };

  const copyToClipboard = async (text, fieldId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast.success('Copied!', { duration: 1500 });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleStatusChange = async (isActive) => {
    const actionText = isActive ? 'activate' : 'deactivate';
    
    if (!window.confirm(`Are you sure you want to ${actionText} this user?`)) {
      return;
    }

    const reason = prompt(`Reason for ${actionText}ing user (optional):`);

    setProcessing(true);
    try {
      const res = await adminService.updateUserStatus(userId, { 
        isActive, 
        reason: reason?.trim() || `User ${actionText}d by admin` 
      });
      
      if (res.success) {
        toast.success(`✅ User ${actionText}d successfully!`);
        loadUserDetails();
      } else {
        toast.error(res.message || `Failed to ${actionText} user`);
      }
    } catch (error) {
      console.error('Status change error:', error);
      toast.error(error.message || `Failed to ${actionText} user`);
    } finally {
      setProcessing(false);
    }
  };

  const handleKYCUpdate = async (kycStatus) => {
    const actionText = kycStatus === 'approved' ? 'approve' : 'reject';
    
    if (!window.confirm(`Are you sure you want to ${actionText} this user's KYC?`)) {
      return;
    }

    const reason = prompt(`Reason for ${actionText}ing KYC (${kycStatus === 'rejected' ? 'required' : 'optional'}):`);
    
    if (kycStatus === 'rejected' && (!reason || !reason.trim())) {
      toast.error('Rejection reason is required');
      return;
    }

    setProcessing(true);
    try {
      const res = await adminService.updateUserStatus(userId, { 
        kycStatus, 
        reason: reason?.trim() || `KYC ${kycStatus} by admin` 
      });
      
      if (res.success) {
        toast.success(`✅ KYC ${kycStatus} successfully!`);
        loadUserDetails();
      } else {
        toast.error(res.message || `Failed to update KYC status`);
      }
    } catch (error) {
      console.error('KYC update error:', error);
      toast.error(error.message || 'Failed to update KYC status');
    } finally {
      setProcessing(false);
    }
  };

  const exportUserData = () => {
    if (!data) return;

    const user = data.user;
    const stats = data.statistics;
    
    try {
      const csvContent = [
        ['Field', 'Value'],
        ['User ID', user.id],
        ['Username', user.username],
        ['Email', user.email],
        ['Full Name', user.fullName || 'N/A'],
        ['Phone', user.phoneNumber || 'N/A'],
        ['Role', user.role || 'user'],
        ['Referral Code', user.referralCode || 'N/A'],
        [''],
        ['=== WALLET ===', ''],
        ['Balance', `₦${parseFloat(user.wallet?.nairaBalance || 0).toLocaleString()}`],
        ['Locked Balance', `₦${parseFloat(user.wallet?.lockedBalance || 0).toLocaleString()}`],
        ['Total Deposited', `₦${parseFloat(user.wallet?.totalDeposited || 0).toLocaleString()}`],
        ['Total Withdrawn', `₦${parseFloat(user.wallet?.totalWithdrawn || 0).toLocaleString()}`],
        ['Total Won', `₦${parseFloat(user.wallet?.totalWon || 0).toLocaleString()}`],
        ['Total Lost', `₦${parseFloat(user.wallet?.totalLost || 0).toLocaleString()}`],
        [''],
        ['=== BETTING STATS ===', ''],
        ['Total Bets', stats?.bets?.total || 0],
        ['Wins', stats?.bets?.wins || 0],
        ['Losses', stats?.bets?.losses || 0],
        ['Win Rate', `${stats?.bets?.winRate || 0}%`],
        ['Total Wagered', `₦${parseFloat(stats?.bets?.totalWagered || 0).toLocaleString()}`],
        ['Net Profit/Loss', `₦${parseFloat(stats?.bets?.netProfit || 0).toLocaleString()}`],
        [''],
        ['=== ACCOUNT ===', ''],
        ['Joined', new Date(user.createdAt).toLocaleString()],
        ['Last Login', user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'],
        ['Status', user.isActive ? 'Active' : 'Inactive'],
        ['KYC Status', user.kycStatus || 'pending'],
        ['Referrals', stats?.referrals || 0],
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_${user.username}_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('User data exported!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const CopyButton = ({ text, fieldId }) => {
    const isCopied = copiedField === fieldId;
    return (
      <button
        onClick={() => copyToClipboard(text, fieldId)}
        className={`p-1 rounded transition ${
          isCopied ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'
        }`}
        title={isCopied ? 'Copied!' : 'Copy'}
      >
        {isCopied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading user details...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">User Not Found</h3>
        <p className="text-gray-500 mb-4">The user you're looking for doesn't exist or has been deleted.</p>
        <button
          onClick={() => navigate('/admin/users')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Back to Users
        </button>
      </div>
    );
  }

  const { user, statistics, recentTransactions, recentBets, pendingDeposits } = data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
            <p className="text-gray-600">View and manage user account</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportUserData}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-4xl font-bold text-blue-600 shadow-lg">
              {user.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="text-white text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-2 mb-1">
                <h2 className="text-3xl font-bold">{user.username}</h2>
                {user.role === 'admin' && (
                  <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded font-medium">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-blue-100 text-lg">{user.fullName || 'No name set'}</p>
              
              {/* Status Badges */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  user.isActive 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {user.isActive ? '✓ Active' : '✗ Inactive'}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  user.kycStatus === 'approved'
                    ? 'bg-green-500 text-white'
                    : user.kycStatus === 'rejected'
                    ? 'bg-red-500 text-white'
                    : 'bg-yellow-500 text-white'
                }`}>
                  KYC: {user.kycStatus || 'pending'}
                </span>
                {user.isVerified && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-sm truncate">{user.email}</span>
              <CopyButton text={user.email} fieldId="email" />
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{user.phoneNumber || 'Not set'}</span>
              {user.phoneNumber && <CopyButton text={user.phoneNumber} fieldId="phone" />}
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm">Joined {formatDate(user.createdAt).split(',')[0]}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <UsersIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{statistics?.referrals || 0} referrals</span>
            </div>
          </div>
        </div>

        {/* User ID & Referral Code */}
        <div className="px-6 py-3 border-b bg-gray-50/50">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">User ID:</span>
              <code className="bg-gray-200 px-2 py-0.5 rounded font-mono">{user.id?.slice(0, 12)}...</code>
              <CopyButton text={user.id} fieldId="userId" />
            </div>
            {user.referralCode && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Referral Code:</span>
                <code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-bold">
                  {user.referralCode}
                </code>
                <CopyButton text={user.referralCode} fieldId="referralCode" />
              </div>
            )}
            {user.lastLogin && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Last Login:</span>
                <span className="text-gray-700">{formatDate(user.lastLogin)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 flex flex-wrap gap-3">
          {user.isActive ? (
            <button
              onClick={() => handleStatusChange(false)}
              disabled={processing}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
              Deactivate User
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange(true)}
              disabled={processing}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Activate User
            </button>
          )}

          {user.kycStatus !== 'approved' && (
            <button
              onClick={() => handleKYCUpdate('approved')}
              disabled={processing}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <Shield className="h-4 w-4 mr-2" />
              Approve KYC
            </button>
          )}

          {user.kycStatus !== 'rejected' && (
            <button
              onClick={() => handleKYCUpdate('rejected')}
              disabled={processing}
              className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject KYC
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="text-2xl font-black text-gray-900">
                ₦{formatCurrency(user.wallet?.nairaBalance)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          {parseFloat(user.wallet?.lockedBalance || 0) > 0 && (
            <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
              🔒 Locked: ₦{formatCurrency(user.wallet?.lockedBalance)}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Deposited</p>
              <p className="text-2xl font-black text-green-600">
                ₦{formatCurrency(user.wallet?.totalDeposited)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Withdrawn</p>
              <p className="text-2xl font-black text-red-600">
                ₦{formatCurrency(user.wallet?.totalWithdrawn)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Win Rate</p>
              <p className="text-2xl font-black text-purple-600">
                {statistics?.bets?.winRate || 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {statistics?.bets?.wins || 0}W / {statistics?.bets?.losses || 0}L ({statistics?.bets?.total || 0} total)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="border-b">
          <nav className="flex overflow-x-auto" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'transactions', label: 'Transactions', icon: CreditCard },
              { id: 'bets', label: 'Bets', icon: Target },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-6 border-b-2 font-medium text-sm whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Betting Stats */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Target size={18} className="text-purple-600" />
                  Betting Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Total Bets</span>
                    <span className="font-bold text-lg">{statistics?.bets?.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Wins / Losses</span>
                    <span className="font-bold">
                      <span className="text-green-600">{statistics?.bets?.wins || 0}W</span>
                      {' / '}
                      <span className="text-red-600">{statistics?.bets?.losses || 0}L</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Total Wagered</span>
                    <span className="font-bold">₦{formatCurrency(statistics?.bets?.totalWagered)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Net Profit/Loss</span>
                    <span className={`font-bold text-lg ${
                      (statistics?.bets?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(statistics?.bets?.netProfit || 0) >= 0 ? '+' : ''}₦{formatCurrency(statistics?.bets?.netProfit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign size={18} className="text-blue-600" />
                  Financial Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-gray-600">Total Won</span>
                    <span className="font-bold text-green-600">
                      ₦{formatCurrency(user.wallet?.totalWon)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-gray-600">Total Lost</span>
                    <span className="font-bold text-red-600">
                      ₦{formatCurrency(user.wallet?.totalLost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-gray-600">Net Position</span>
                    <span className={`font-bold ${
                      ((user.wallet?.totalDeposited || 0) - (user.wallet?.totalWithdrawn || 0)) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      ₦{formatCurrency(
                        (user.wallet?.totalDeposited || 0) - (user.wallet?.totalWithdrawn || 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Lifetime Volume</span>
                    <span className="font-bold text-purple-600">
                      ₦{formatCurrency(
                        (user.wallet?.totalDeposited || 0) + 
                        (user.wallet?.totalWon || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pending Deposits Warning */}
              {pendingDeposits && pendingDeposits.length > 0 && (
                <div className="lg:col-span-2 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                    <AlertCircle size={18} />
                    Pending Deposits ({pendingDeposits.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingDeposits.map((deposit) => (
                      <div key={deposit.id} className="flex justify-between items-center bg-white p-3 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{deposit.reference}</p>
                          <p className="text-xs text-gray-500">{formatDate(deposit.createdAt)}</p>
                        </div>
                        <span className="font-bold text-yellow-700">₦{formatCurrency(deposit.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentTransactions && recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            tx.type === 'deposit' 
                              ? 'bg-green-100 text-green-800'
                              : tx.type === 'withdrawal'
                              ? 'bg-red-100 text-red-800'
                              : tx.type === 'bet_win'
                              ? 'bg-blue-100 text-blue-800'
                              : tx.type === 'bet_loss'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {tx.type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold">
                          ₦{formatCurrency(tx.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            tx.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : tx.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-500 font-mono">{tx.reference?.slice(0, 15)}...</span>
                            <CopyButton text={tx.reference} fieldId={`tx-${tx.id}`} />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(tx.createdAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No transactions found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Bets Tab */}
          {activeTab === 'bets' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Round</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Prediction</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stake</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Result</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Profit/Loss</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentBets && recentBets.length > 0 ? (
                    recentBets.map((bet) => (
                      <tr key={bet.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-blue-600">#{bet.round?.roundNumber}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
                            bet.prediction === 'up'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {bet.prediction === 'up' ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                            {bet.prediction?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          ₦{formatCurrency(bet.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
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
                        <td className={`px-6 py-4 whitespace-nowrap font-bold ${
                          parseFloat(bet.profit || 0) > 0 
                            ? 'text-green-600' 
                            : parseFloat(bet.profit || 0) < 0
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}>
                          {parseFloat(bet.profit || 0) > 0 ? '+' : ''}₦{formatCurrency(bet.profit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(bet.createdAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No bets found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
