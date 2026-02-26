
// src/pages/admin/Settings.jsx
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  DollarSign, 
  Target, 
  Clock, 
  RefreshCw,
  Server,
  Database,
  Cpu,
  HardDrive,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSystemHealth();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await adminService.getSettings();
      
      if (response.data?.success) {
        setSettings(response.data.data);
      } else {
        throw new Error(response.data?.message || 'Failed to load settings');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error(error.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await adminService.getSystemHealth();
      
      if (response.data?.success) {
        setSystemHealth(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
      // Don't show toast for health - it's optional
    } finally {
      setHealthLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await adminService.clearCache();
      
      if (response.data?.success) {
        toast.success('Cache cleared successfully');
      } else {
        throw new Error(response.data?.message || 'Failed to clear cache');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast.error(error.response?.data?.message || 'Failed to clear cache');
    }
  };

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('en-NG');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-gray-600 mt-1">View platform configuration and system status</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSettings}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={clearCache}
            className="flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
          >
            <HardDrive className="h-4 w-4 mr-2" />
            Clear Cache
          </button>
        </div>
      </div>

      {/* System Health */}
      {systemHealth && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <Server className="h-5 w-5 text-indigo-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
            </div>
            <button
              onClick={loadSystemHealth}
              disabled={healthLoading}
              className="text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${healthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Server Status */}
              <div className="flex items-center gap-3">
                {systemHealth.status === 'online' ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-gray-500">Server</p>
                  <p className={`font-semibold ${systemHealth.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                    {systemHealth.status?.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Database Status */}
              <div className="flex items-center gap-3">
                <Database className={`h-8 w-8 ${systemHealth.database === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <p className="text-sm text-gray-500">Database</p>
                  <p className={`font-semibold ${systemHealth.database === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                    {systemHealth.database?.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Uptime */}
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Uptime</p>
                  <p className="font-semibold text-gray-900">
                    {systemHealth.uptime?.formatted || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Memory */}
              <div className="flex items-center gap-3">
                <Cpu className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Memory Used</p>
                  <p className="font-semibold text-gray-900">
                    {systemHealth.memory?.heapUsed || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-500">
              <span>Node: {systemHealth.nodeVersion}</span>
              <span>•</span>
              <span>Heap Total: {systemHealth.memory?.heapTotal}</span>
              <span>•</span>
              <span>RSS: {systemHealth.memory?.rss}</span>
              <span>•</span>
              <span>Last Check: {new Date(systemHealth.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Fee Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <DollarSign className="h-5 w-5 text-green-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Fee Settings</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Fee Percentage
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={settings?.fees?.platformFeePercentage || 1}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Fee charged on each bet</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Losers Pool Platform Cut
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={settings?.fees?.losersPoolPlatformCut || 30}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Platform's share from losers pool</p>
            </div>
          </div>
        </div>
      </div>

      {/* Betting Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <Target className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Betting Settings</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Bet Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                <input
                  type="text"
                  value={formatNumber(settings?.betting?.minBetAmount || 100)}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Bet Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                <input
                  type="text"
                  value={formatNumber(settings?.betting?.maxBetAmount || 1000000)}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Round Duration
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={settings?.betting?.roundDurationMinutes || 5}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">mins</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <Clock className="h-5 w-5 text-purple-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Payment Settings</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Deposit
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                <input
                  type="text"
                  value={formatNumber(settings?.payments?.minDeposit || 100)}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Deposit
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                <input
                  type="text"
                  value={formatNumber(settings?.payments?.maxDeposit || 5000000)}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Withdrawal
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                <input
                  type="text"
                  value={formatNumber(settings?.payments?.minWithdrawal || 1000)}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Variables Reference */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <SettingsIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Environment Variables</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            To modify these settings, update the following environment variables on your server:
          </p>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-green-400 font-mono">
{`# Fee Settings
PLATFORM_FEE_PERCENTAGE=${settings?.fees?.platformFeePercentage || 1}
LOSERS_POOL_PLATFORM_CUT=${settings?.fees?.losersPoolPlatformCut || 30}

# Betting Settings
MIN_BET_AMOUNT=${settings?.betting?.minBetAmount || 100}
MAX_BET_AMOUNT=${settings?.betting?.maxBetAmount || 1000000}
ROUND_DURATION_MINUTES=${settings?.betting?.roundDurationMinutes || 5}

# Payment Settings
MIN_DEPOSIT=${settings?.payments?.minDeposit || 100}
MAX_DEPOSIT=${settings?.payments?.maxDeposit || 5000000}
MIN_WITHDRAWAL=${settings?.payments?.minWithdrawal || 1000}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Settings are Read-Only</p>
            <p className="text-sm text-yellow-700 mt-1">
              These settings are configured in the server environment variables. 
              To change them, update the environment variables on Render (or your hosting provider) and restart the service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
