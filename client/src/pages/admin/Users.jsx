
// src/pages/admin/Users.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Ban, 
  CheckCircle, 
  Eye,
  RefreshCw,
  Loader2,
  Users as UsersIcon,
  Mail,
  Phone,
  Calendar,
  Wallet,
  Shield,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Copy,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService'; // ✅ Changed from adminApi
import toast from 'react-hot-toast';

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [copiedId, setCopiedId] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    kycStatus: '',
    page: 1,
    limit: 20
  });

  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [filters.status, filters.kycStatus, filters.page]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    
    const timeout = setTimeout(() => {
      if (filters.search !== '') {
        loadUsers();
      }
    }, 500);
    
    setSearchTimeout(timeout);
    
    return () => clearTimeout(timeout);
  }, [filters.search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit
      };
      
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.kycStatus) params.kycStatus = filters.kycStatus;

      const res = await adminService.getAllUsers(params);
      
      // ✅ Fixed data extraction
      if (res.success) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      } else {
        setUsers([]);
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error(error.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleSearch = (e) => {
    setFilters({ ...filters, search: e.target.value, page: 1 });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      kycStatus: '',
      page: 1,
      limit: 20
    });
  };

  const handleStatusChange = async (userId, username, isActive) => {
    const actionText = isActive ? 'activate' : 'deactivate';
    
    if (!window.confirm(`Are you sure you want to ${actionText} user "${username}"?`)) {
      return;
    }

    const reason = prompt(`Enter reason for ${actionText}ing this user (optional):`);

    setProcessing(userId);
    try {
      const res = await adminService.updateUserStatus(userId, { 
        isActive, 
        reason: reason?.trim() || `User ${actionText}d by admin` 
      });
      
      if (res.success) {
        toast.success(`✅ User "${username}" ${actionText}d successfully!`);
        loadUsers();
      } else {
        toast.error(res.message || `Failed to ${actionText} user`);
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error(error.message || `Failed to ${actionText} user`);
    } finally {
      setProcessing(null);
    }
  };

  const copyUserId = async (userId) => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedId(userId);
      toast.success('User ID copied!', { duration: 1500 });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getKYCBadge = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon className="h-8 w-8 text-blue-600" />
            User Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage all platform users ({pagination.total} total)
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => u.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border-l-4 border-red-500">
          <p className="text-sm text-gray-600">Inactive</p>
          <p className="text-2xl font-bold text-red-600">
            {users.filter(u => !u.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border-l-4 border-purple-500">
          <p className="text-sm text-gray-600">KYC Approved</p>
          <p className="text-2xl font-bold text-purple-600">
            {users.filter(u => u.kycStatus === 'approved').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by username, email, or name..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.search}
              onChange={handleSearch}
            />
          </div>

          {/* Status Filter */}
          <select
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="">All Status</option>
            <option value="active">✅ Active</option>
            <option value="inactive">❌ Inactive</option>
          </select>

          {/* KYC Filter */}
          <select
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            value={filters.kycStatus}
            onChange={(e) => setFilters({ ...filters, kycStatus: e.target.value, page: 1 })}
          >
            <option value="">All KYC Status</option>
            <option value="pending">⏳ Pending</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
          </select>

          {/* Clear Filters */}
          {(filters.search || filters.status || filters.kycStatus) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        {(filters.search || filters.status || filters.kycStatus) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Active filters:</span>
            {filters.search && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                Search: "{filters.search}"
              </span>
            )}
            {filters.status && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                Status: {filters.status}
              </span>
            )}
            {filters.kycStatus && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                KYC: {filters.kycStatus}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Totals
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  KYC
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                      <span className="text-gray-500">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No users found</p>
                    {(filters.search || filters.status || filters.kycStatus) && (
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    {/* User Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-bold text-gray-900 flex items-center gap-1">
                            {user.username}
                            {user.role === 'admin' && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <button
                              onClick={() => copyUserId(user.id)}
                              className="hover:text-blue-600 flex items-center gap-1"
                              title="Copy User ID"
                            >
                              ID: {user.id?.slice(0, 8)}...
                              {copiedId === user.id ? (
                                <Check size={12} className="text-green-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 flex items-center gap-1">
                          <Mail size={12} className="text-gray-400" />
                          {user.email}
                        </div>
                        {user.phoneNumber && (
                          <div className="text-gray-500 flex items-center gap-1 mt-1">
                            <Phone size={12} className="text-gray-400" />
                            {user.phoneNumber}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          ₦{formatCurrency(user.wallet?.balance)}
                        </div>
                        {user.wallet?.locked > 0 && (
                          <div className="text-xs text-orange-600 flex items-center gap-1">
                            🔒 Locked: ₦{formatCurrency(user.wallet.locked)}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Totals */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Deposited:</span>
                          <span className="text-green-600 font-medium">
                            ₦{formatCurrency(user.wallet?.totalDeposited)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Withdrawn:</span>
                          <span className="text-red-600 font-medium">
                            ₦{formatCurrency(user.wallet?.totalWithdrawn)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-gray-100 pt-1">
                          <span className="text-gray-500">Won:</span>
                          <span className="text-blue-600 font-medium">
                            ₦{formatCurrency(user.wallet?.totalWon)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* KYC Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex items-center text-xs font-semibold rounded-full ${getKYCBadge(user.kycStatus)}`}>
                        {user.kycStatus === 'approved' && <Shield size={12} className="mr-1" />}
                        {user.kycStatus || 'pending'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex items-center text-xs font-semibold rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? (
                          <>
                            <CheckCircle size={12} className="mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <Ban size={12} className="mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(user.createdAt)}
                      </div>
                      {user.lastLogin && (
                        <div className="text-xs text-gray-400 mt-1">
                          Last login: {formatDate(user.lastLogin)}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        {/* View Details */}
                        <button
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>

                        {/* Toggle Status */}
                        <button
                          onClick={() => handleStatusChange(user.id, user.username, !user.isActive)}
                          disabled={processing === user.id}
                          className={`p-2 rounded-lg transition ${
                            user.isActive 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-green-600 hover:bg-green-50'
                          } disabled:opacity-50`}
                          title={user.isActive ? 'Deactivate User' : 'Activate User'}
                        >
                          {processing === user.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : user.isActive ? (
                            <UserX size={18} />
                          ) : (
                            <UserCheck size={18} />
                          )}
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
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Showing page <span className="font-bold">{pagination.page}</span> of{' '}
                <span className="font-bold">{pagination.pages}</span>
                {' '}({pagination.total} total users)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: 1 })}
                  disabled={filters.page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>

                {/* Page Numbers */}
                <div className="hidden sm:flex items-center gap-1">
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
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
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
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.pages })}
                  disabled={filters.page === pagination.pages}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500">
          💡 <strong>Tip:</strong> Click on a user row's eye icon to view full details including bet history and transactions.
        </p>
      </div>
    </div>
  );
};

export default Users;
