// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  Activity,
  Target
} from 'lucide-react';
import adminService from '../../services/adminService'; // ✅ FIXED
import StatCard from '../../components/admin/StatCard';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await adminService.getDashboardStats(); // ✅ FIXED
      setStats(res.data); // ✅ FIXED - backend returns { success: true, data: {...} }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Alerts */}
      {(stats?.pending?.withdrawals > 0 || stats?.pending?.amountMismatches > 0) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Action Required
              </p>
              <div className="text-sm text-yellow-700 mt-1 space-x-4">
                {stats.pending.withdrawals > 0 && (
                  <span>• {stats.pending.withdrawals} pending withdrawals</span>
                )}
                {stats.pending.amountMismatches > 0 && (
                  <span>• {stats.pending.amountMismatches} deposit mismatches</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users */}
        <StatCard
          title="Total Users"
          value={stats?.users?.total?.toLocaleString()}
          change={`+${stats?.users?.new24h || 0} today`}
          icon={Users}
          color="blue"
        />

        {/* Revenue */}
        <StatCard
          title="Total Revenue"
          value={`₦${stats?.financials?.totalRevenue?.toLocaleString() || 0}`}
          subtitle="Platform earnings"
          icon={DollarSign}
          color="green"
        />

        {/* Deposits */}
        <StatCard
          title="Total Deposits"
          value={`₦${stats?.financials?.totalDeposits?.toLocaleString() || 0}`}
          subtitle="All time deposits"
          icon={TrendingUp}
          color="purple"
        />

        {/* Bets */}
        <StatCard
          title="Total Bets"
          value={stats?.bets?.total?.toLocaleString() || 0}
          change={`+${stats?.bets?.new24h || 0} today`}
          icon={Target}
          color="orange"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
          <div className="mt-2 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">
              {stats?.users?.active?.toLocaleString() || 0}
            </p>
            <p className="ml-2 text-sm text-gray-600">
              of {stats?.users?.total?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        {/* Total Bet Volume */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Bet Volume</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            ₦{stats?.bets?.volume?.toLocaleString() || 0}
          </p>
        </div>

        {/* Completed Rounds */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Completed Rounds</h3>
          <div className="mt-2 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">
              {stats?.rounds?.completed?.toLocaleString() || 0}
            </p>
            <p className="ml-2 text-sm text-gray-600">
              of {stats?.rounds?.total?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Financial Overview</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Total User Balance</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                ₦{stats?.financials?.totalUserBalance?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Locked: ₦{stats?.financials?.totalLocked?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Entry Fees Collected</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                ₦{stats?.financials?.entryFees?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Platform Cuts</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                ₦{stats?.financials?.platformCuts?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Last 24 Hours
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {stats?.recentActivity?.newUsers || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">New Users</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {stats?.recentActivity?.newDeposits || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">New Deposits</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {stats?.recentActivity?.newBets || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">New Bets</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
