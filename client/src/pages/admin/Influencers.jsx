// src/pages/admin/Influencers.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Search,
  UserPlus,
  Users,
  DollarSign,
  TrendingUp,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Percent
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const Influencers = () => {
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Modals
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Selected user/influencer
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [influencerDetails, setInfluencerDetails] = useState(null);
  
  // Form state
  const [percentage, setPercentage] = useState(5);
  const [processing, setProcessing] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadInfluencers();
    loadStats();
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // =====================================================
  // API CALLS
  // =====================================================

  const loadInfluencers = async (page = 1) => {
    setLoading(true);
    try {
      const data = await adminService.getAllInfluencers({ page, limit: 20 });
      
      if (data?.success) {
        setInfluencers(data.data.influencers || []);
        setPagination(data.data.pagination || { page: 1, pages: 1, total: 0 });
      } else {
        throw new Error(data?.message || 'Failed to load influencers');
      }
    } catch (error) {
      console.error('Load influencers error:', error);
      toast.error(error.message || 'Failed to load influencers');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await adminService.getReferralStats();
      if (data?.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const searchUsers = async () => {
    setSearching(true);
    try {
      const data = await adminService.searchUsers(searchQuery);
      if (data?.success) {
        setSearchResults(data.data.users || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const loadInfluencerDetails = async (userId) => {
    try {
      const data = await adminService.getInfluencerDetails(userId);
      if (data?.success) {
        setInfluencerDetails(data.data);
        setShowDetailsModal(true);
      } else {
        throw new Error(data?.message || 'Failed to load details');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load details');
    }
  };

  // =====================================================
  // ACTIONS
  // =====================================================

  const handleUpgrade = async () => {
    if (!selectedUser || !percentage) return;

    if (percentage < 1 || percentage > 10) {
      toast.error('Percentage must be between 1 and 10');
      return;
    }

    setProcessing(true);
    try {
      const data = await adminService.upgradeToInfluencer(selectedUser.id, percentage);
      
      if (data?.success) {
        toast.success(data.message || `${selectedUser.username} is now an influencer!`);
        setShowUpgradeModal(false);
        setSelectedUser(null);
        setSearchQuery('');
        setSearchResults([]);
        setPercentage(5);
        loadInfluencers();
        loadStats();
      } else {
        throw new Error(data?.message || 'Upgrade failed');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to upgrade user');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePercentage = async () => {
    if (!selectedInfluencer || !percentage) return;

    if (percentage < 1 || percentage > 10) {
      toast.error('Percentage must be between 1 and 10');
      return;
    }

    setProcessing(true);
    try {
      const data = await adminService.updateInfluencerPercentage(selectedInfluencer.id, percentage);
      
      if (data?.success) {
        toast.success(data.message || 'Percentage updated!');
        setShowEditModal(false);
        setSelectedInfluencer(null);
        setPercentage(5);
        loadInfluencers();
      } else {
        throw new Error(data?.message || 'Update failed');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update percentage');
    } finally {
      setProcessing(false);
    }
  };

  const handleDowngrade = async () => {
    if (!selectedInfluencer) return;

    setProcessing(true);
    try {
      const data = await adminService.downgradeInfluencer(selectedInfluencer.id);
      
      if (data?.success) {
        toast.success(data.message || `${selectedInfluencer.username} is now a normal referrer`);
        setShowDowngradeModal(false);
        setSelectedInfluencer(null);
        loadInfluencers();
        loadStats();
      } else {
        throw new Error(data?.message || 'Downgrade failed');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to downgrade influencer');
    } finally {
      setProcessing(false);
    }
  };

  // =====================================================
  // HELPERS
  // =====================================================

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

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6 p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Star className="h-8 w-8 text-purple-600" />
            Influencer Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage influencers and their commission rates
          </p>
        </div>
        <button
          onClick={loadInfluencers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Star className="w-4 h-4 text-purple-500" />
              <span className="text-sm">Total Influencers</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.overview?.totalInfluencers || 0}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm">Normal Referrers</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.overview?.normalReferrers || 0}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-sm">Total Paid Out</span>
            </div>
            <p className="text-2xl font-bold text-green-600">₦{formatCurrency(stats.overview?.totalEarningsPaid)}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Gift className="w-4 h-4 text-orange-500" />
              <span className="text-sm">Total Referred</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.overview?.totalReferred || 0}</p>
          </div>
        </div>
      )}

      {/* Earnings by Type */}
      {stats?.earningsByType && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">First Bet Commissions (Normal)</p>
                <p className="text-xl font-bold text-blue-600">₦{formatCurrency(stats.earningsByType.firstBet?.total)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Count</p>
                <p className="text-xl font-bold text-gray-900">{stats.earningsByType.firstBet?.count || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Loss Commissions (Influencer)</p>
                <p className="text-xl font-bold text-purple-600">₦{formatCurrency(stats.earningsByType.lossCommission?.total)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Count</p>
                <p className="text-xl font-bold text-gray-900">{stats.earningsByType.lossCommission?.count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Add Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-purple-600" />
          Add New Influencer
        </h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by username, email, or referral code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{user.username}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400">Code: {user.referralCode}</p>
                </div>
                <div className="flex items-center gap-3">
                  {user.isInfluencer ? (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      Already Influencer ({user.percentage}%)
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setPercentage(5);
                        setShowUpgradeModal(true);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      Make Influencer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
          <p className="mt-4 text-gray-500 text-center py-4">No users found matching "{searchQuery}"</p>
        )}
      </div>

      {/* Influencers Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-600" />
            Current Influencers
            <span className="text-sm font-normal text-gray-500">({pagination.total} total)</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referral Code</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Referrals</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Earnings</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-gray-500">Loading influencers...</span>
                    </div>
                  </td>
                </tr>
              ) : influencers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No influencers yet</p>
                    <p className="text-sm text-gray-400">Search and add users above</p>
                  </td>
                </tr>
              ) : (
                influencers.map((inf) => (
                  <tr key={inf.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{inf.username}</p>
                        <p className="text-sm text-gray-500">{inf.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{inf.referralCode}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                        <Percent className="w-3 h-3" />
                        {inf.percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium text-gray-900">{inf.referralCount}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-green-600">₦{formatCurrency(inf.totalEarnings)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-blue-600">₦{formatCurrency(inf.referralBalance)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        inf.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {inf.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => loadInfluencerDetails(inf.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInfluencer(inf);
                            setPercentage(inf.percentage);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="Edit Percentage"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInfluencer(inf);
                            setShowDowngradeModal(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Downgrade to Normal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => loadInfluencers(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => loadInfluencers(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Referrers */}
      {stats?.topReferrers?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Top Referrers
          </h2>
          <div className="space-y-3">
            {stats.topReferrers.slice(0, 5).map((referrer, index) => (
              <div key={referrer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{referrer.username}</p>
                    <p className="text-sm text-gray-500">
                      {referrer.type === 'influencer' ? (
                        <span className="text-purple-600">Influencer ({referrer.percentage}%)</span>
                      ) : (
                        <span className="text-blue-600">Normal (5%)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">₦{formatCurrency(referrer.totalEarnings)}</p>
                  <p className="text-sm text-gray-500">{referrer.referralCount} referrals</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================
          MODALS
          ===================================================== */}

      {/* Upgrade to Influencer Modal */}
      {showUpgradeModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Upgrade to Influencer</h2>
                <p className="text-gray-500">Set commission rate for {selectedUser.username}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission Percentage (1-10%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={percentage}
                  onChange={(e) => setPercentage(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="w-20 text-center">
                  <span className="text-3xl font-bold text-purple-600">{percentage}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {selectedUser.username} will earn {percentage}% of every loss from their referrals.
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-purple-800">
                <strong>Example:</strong> If a referred user loses ₦10,000, {selectedUser.username} earns ₦{(10000 * percentage / 100).toLocaleString()}.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={processing}
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4" />
                    Upgrade
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Percentage Modal */}
      {showEditModal && selectedInfluencer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Edit className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Update Commission</h2>
                <p className="text-gray-500">Change rate for {selectedInfluencer.username}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Commission Percentage (1-10%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={percentage}
                  onChange={(e) => setPercentage(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="w-20 text-center">
                  <span className="text-3xl font-bold text-blue-600">{percentage}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Current: {selectedInfluencer.percentage}% → New: {percentage}%
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedInfluencer(null);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePercentage}
                disabled={processing || percentage === selectedInfluencer.percentage}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Update
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downgrade Confirmation Modal */}
      {showDowngradeModal && selectedInfluencer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Downgrade Influencer</h2>
                <p className="text-gray-500">Remove influencer status</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to downgrade <strong>{selectedInfluencer.username}</strong> from 
              influencer ({selectedInfluencer.percentage}% per loss) to normal referrer (5% first bet only)?
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Their existing referral balance (₦{formatCurrency(selectedInfluencer.referralBalance)}) will remain unchanged. 
                They just won't earn loss commissions anymore.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDowngradeModal(false);
                  setSelectedInfluencer(null);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDowngrade}
                disabled={processing}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Downgrade
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Influencer Details Modal */}
      {showDetailsModal && influencerDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{influencerDetails.user.username}</h2>
                    <p className="text-gray-500">{influencerDetails.user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Commission Rate</p>
                  <p className="text-xl font-bold text-purple-600">{influencerDetails.user.percentage}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Earnings</p>
                  <p className="text-xl font-bold text-green-600">₦{formatCurrency(influencerDetails.user.totalEarnings)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className="text-xl font-bold text-blue-600">₦{formatCurrency(influencerDetails.user.referralBalance)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Referrals</p>
                  <p className="text-xl font-bold text-gray-900">{influencerDetails.user.referralCount}</p>
                </div>
              </div>

              {/* Earnings Summary */}
              {influencerDetails.earningsSummary?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Earnings Breakdown</h3>
                  <div className="space-y-2">
                    {influencerDetails.earningsSummary.map((summary) => (
                      <div key={summary.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">
                          {summary.type === 'first_bet' ? 'First Bet Commissions' : 'Loss Commissions'}
                        </span>
                        <div className="text-right">
                          <span className="font-bold text-green-600">₦{formatCurrency(summary.total)}</span>
                          <span className="text-gray-400 text-sm ml-2">({summary.count} transactions)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Earnings */}
              {influencerDetails.recentEarnings?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Earnings</h3>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-500">User</th>
                          <th className="px-4 py-2 text-right text-gray-500">Bet</th>
                          <th className="px-4 py-2 text-right text-gray-500">Earned</th>
                          <th className="px-4 py-2 text-left text-gray-500">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {influencerDetails.recentEarnings.map((earning) => (
                          <tr key={earning.id}>
                            <td className="px-4 py-2 text-gray-900">{earning.username}</td>
                            <td className="px-4 py-2 text-right text-gray-500">₦{formatCurrency(earning.betAmount)}</td>
                            <td className="px-4 py-2 text-right text-green-600 font-medium">+₦{formatCurrency(earning.earnedAmount)}</td>
                            <td className="px-4 py-2 text-gray-400">{formatDate(earning.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Referred Users */}
              {influencerDetails.referredUsers?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Referred Users ({influencerDetails.referredUsers.length})</h3>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-500">Username</th>
                          <th className="px-4 py-2 text-center text-gray-500">Status</th>
                          <th className="px-4 py-2 text-right text-gray-500">Deposited</th>
                          <th className="px-4 py-2 text-right text-gray-500">Lost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {influencerDetails.referredUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="px-4 py-2 text-gray-900">{user.username}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right text-gray-500">₦{formatCurrency(user.totalDeposited)}</td>
                            <td className="px-4 py-2 text-right text-red-600">₦{formatCurrency(user.totalLost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Influencers;
