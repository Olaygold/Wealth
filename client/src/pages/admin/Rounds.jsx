
// src/pages/admin/Rounds.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Eye, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  DollarSign
} from 'lucide-react';
import adminService from '../../services/adminService'; // ✅ Changed from adminApi
import toast from 'react-hot-toast';

const Rounds = () => {
  const navigate = useNavigate();
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    loadRounds();
  }, [filters]);

  const loadRounds = async () => {
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit
      };
      
      if (filters.status) {
        params.status = filters.status;
      }

      const res = await adminService.getAllRounds(params);
      
      if (res.success) {
        setRounds(res.data.rounds || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      } else {
        setRounds([]);
        toast.error('Failed to load rounds');
      }
    } catch (error) {
      console.error('Failed to load rounds:', error);
      toast.error(error.message || 'Failed to load rounds');
      setRounds([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRounds();
  };

  const handleCancelRound = async (roundId, roundNumber) => {
    const reason = prompt(`Enter reason for cancelling Round #${roundNumber}:`);
    if (!reason || !reason.trim()) {
      toast.error('Cancellation reason is required');
      return;
    }

    const confirmCancel = window.confirm(
      `⚠️ Are you sure you want to cancel Round #${roundNumber}?\n\nThis will:\n• Refund ALL bets to users\n• Mark round as cancelled\n\nThis action cannot be undone.`
    );
    
    if (!confirmCancel) return;

    setCancelling(roundId);
    try {
      const res = await adminService.cancelRound(roundId, { reason: reason.trim() });
      
      if (res.success) {
        toast.success(`Round #${roundNumber} cancelled! All bets refunded.`);
        loadRounds();
      } else {
        toast.error(res.message || 'Failed to cancel round');
      }
    } catch (error) {
      console.error('Cancel round error:', error);
      toast.error(error.message || 'Failed to cancel round');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      upcoming: 'bg-gray-100 text-gray-800',
      waiting: 'bg-gray-100 text-gray-800',
      active: 'bg-blue-100 text-blue-800',
      locked: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <Clock size={14} className="mr-1" />;
      case 'locked':
        return <AlertCircle size={14} className="mr-1" />;
      case 'completed':
        return <CheckCircle size={14} className="mr-1" />;
      case 'cancelled':
        return <XCircle size={14} className="mr-1" />;
      default:
        return null;
    }
  };

  const getResultDisplay = (round) => {
    if (!round.result || round.status !== 'completed') {
      return <span className="text-gray-400">-</span>;
    }

    if (round.result === 'up') {
      return (
        <div className="flex items-center">
          <TrendingUp className="h-5 w-5 text-green-600 mr-1" />
          <span className="text-sm font-bold text-green-600">UP</span>
        </div>
      );
    }
    
    if (round.result === 'down') {
      return (
        <div className="flex items-center">
          <TrendingDown className="h-5 w-5 text-red-600 mr-1" />
          <span className="text-sm font-bold text-red-600">DOWN</span>
        </div>
      );
    }

    if (round.result === 'tie') {
      return <span className="text-yellow-600 font-medium">TIE</span>;
    }

    return <span className="text-gray-400">{round.result}</span>;
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const canCancelRound = (round) => {
    return ['upcoming', 'waiting', 'active', 'locked'].includes(round.status);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-8 w-8 text-blue-600" />
            Rounds Management
          </h1>
          <p className="text-gray-600 mt-1">View and manage all trading rounds</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Total: <span className="font-bold text-gray-900">{pagination.total}</span> rounds
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="locked">Locked</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Per Page</label>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value), page: 1 })}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {filters.status && (
            <button
              onClick={() => setFilters({ status: '', page: 1, limit: filters.limit })}
              className="mt-5 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Rounds Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Round
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prices
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pool
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform Cut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                      <span className="text-gray-500">Loading rounds...</span>
                    </div>
                  </td>
                </tr>
              ) : rounds.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No rounds found</p>
                    {filters.status && (
                      <button
                        onClick={() => setFilters({ ...filters, status: '', page: 1 })}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                rounds.map((round) => {
                  const totalPool = parseFloat(round.totalUpAmount || 0) + parseFloat(round.totalDownAmount || 0);
                  const totalBets = (round.totalUpBets || 0) + (round.totalDownBets || 0);
                  
                  return (
                    <tr key={round.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Target className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <p className="font-bold text-gray-900">#{round.roundNumber}</p>
                            <p className="text-xs text-gray-500">ID: {round.id?.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(round.status)}`}>
                          {getStatusIcon(round.status)}
                          {round.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="text-gray-900">
                            Start: <span className="font-medium">${formatCurrency(round.startPrice)}</span>
                          </p>
                          {round.endPrice ? (
                            <p className={`text-xs ${
                              parseFloat(round.endPrice) >= parseFloat(round.startPrice) 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              End: ${formatCurrency(round.endPrice)}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">End: -</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getResultDisplay(round)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Users size={14} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{totalBets}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="text-green-600">↑{round.totalUpBets || 0}</span>
                          <span className="mx-1">/</span>
                          <span className="text-red-600">↓{round.totalDownBets || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">₦{formatCurrency(totalPool)}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="text-green-600">₦{formatCurrency(round.totalUpAmount)}</span>
                          <span className="mx-1">/</span>
                          <span className="text-red-600">₦{formatCurrency(round.totalDownAmount)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-green-600">
                          ₦{formatCurrency(round.platformCut || round.totalFeeCollected || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <p>{new Date(round.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs">{new Date(round.createdAt).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/admin/rounds/${round.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          {canCancelRound(round) && (
                            <button
                              onClick={() => handleCancelRound(round.id, round.roundNumber)}
                              disabled={cancelling === round.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              title="Cancel Round"
                            >
                              {cancelling === round.id ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <XCircle className="h-5 w-5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                <span className="font-medium">{pagination.pages}</span>
                {' '}({pagination.total} total rounds)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilters({ ...filters, page: 1 })}
                  disabled={filters.page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Prev
                </button>
                
                {/* Page numbers */}
                <div className="hidden sm:flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (filters.page <= 3) {
                      pageNum = i + 1;
                    } else if (filters.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = filters.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setFilters({ ...filters, page: pageNum })}
                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                          filters.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page === pagination.pages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.pages })}
                  disabled={filters.page === pagination.pages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {!loading && rounds.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Current View Stats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{rounds.length}</p>
              <p className="text-xs text-gray-500">Rounds Shown</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {rounds.filter(r => r.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {rounds.filter(r => r.status === 'active').length}
              </p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {rounds.filter(r => r.status === 'cancelled').length}
              </p>
              <p className="text-xs text-gray-500">Cancelled</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rounds;
