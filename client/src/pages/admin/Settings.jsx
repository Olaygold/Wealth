
// src/pages/admin/Settings.jsx
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, DollarSign, Target, Clock, Save } from 'lucide-react';
import adminApi from '../../services/adminApi';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await adminApi.getSettings();
      setSettings(res.data.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-600 mt-1">View and manage platform configuration</p>
      </div>

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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
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
                  type="number"
                  value={settings?.betting?.minBetAmount || 100}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
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
                  type="number"
                  value={settings?.betting?.maxBetAmount || 1000000}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
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
                  type="number"
                  value={settings?.payments?.minDeposit || 100}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
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
                  type="number"
                  value={settings?.payments?.maxDeposit || 5000000}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
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
                  type="number"
                  value={settings?.payments?.minWithdrawal || 1000}
                  readOnly
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
        <div className="flex">
          <SettingsIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Settings are Read-Only</p>
            <p className="text-sm text-yellow-700 mt-1">
              These settings are configured in the server environment variables. 
              To change them, update the .env file and restart the server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
