
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
  DollarSign,
  Settings,
  Zap,
  Shield,
  ArrowUp,
  ArrowDown,
  X
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

// =====================================================
// ✅ MANIPULATION MODAL COMPONENT
// Only visible to admin — users never see this
// =====================================================
const ManipulationModal = ({ round, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    overridePrice: '',
    forcedResult: '',
    note: ''
  });
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('manipulate'); // 'manipulate' or 'forceEnd'

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.overridePrice && !formData.forcedResult) {
      toast.error('Set at least a price override or forced result');
      return;
    }

    if (formData.overridePrice) {
      const price = parseFloat(formData.overridePrice);
      if (isNaN(price) || price < 1000 || price > 500000) {
        toast.error('Price must be between $1,000 and $500,000');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {};
      if (formData.overridePrice) payload.overridePrice = parseFloat(formData.overridePrice);
      if (formData.forcedResult) payload.forcedResult = formData.forcedResult;
      if (formData.note) payload.note = formData.note;

      const res = await adminService.setRoundManipulation(round.id, payload);

      if (res.success) {
        toast.success(`Round #${round.roundNumber} manipulation activated!`);
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Failed to set manipulation');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to set manipulation');
    } finally {
      setLoading(false);
    }
  };

  const handleForceEnd = async () => {
    if (!formData.forcedResult) {
      toast.error('Select a result to force end the round');
      return;
    }

    const confirm = window.confirm(
      `⚠️ Force end Round #${round.roundNumber} as ${formData.forcedResult.toUpperCase()}?\n\nThis will immediately settle ALL bets with this result.\n\nThis cannot be undone.`
    );
    if (!confirm) return;

    setLoading(true);
    try {
      const res = await adminService.forceEndRound(round.id, {
        result: formData.forcedResult,
        reason: formData.note || `Force ended as ${formData.forcedResult.toUpperCase()} by admin`
      });

      if (res.success) {
        toast.success(`Round #${round.roundNumber} force-ended as ${formData.forcedResult.toUpperCase()}!`);
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Failed to force end round');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to force end round');
    } finally {
      setLoading(false);
    }
  };

  const handleClearManipulation = async () => {
    const confirm = window.confirm(
      `Clear all manipulation on Round #${round.roundNumber}?\n\nPrice will return to real BTC market price.`
    );
    if (!confirm) return;

    setLoading(true);
    try {
      const res = await adminService.clearRoundManipulation(round.id);
      if (res.success) {
        toast.success(`Manipulation cleared on Round #${round.roundNumber}`);
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Failed to clear manipulation');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to clear manipulation');
    } finally {
      setLoading(false);
    }
  };

  const isManipulated = round.manipulationInfo?.isActive;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Round #{round.roundNumber} Control
              </h2>
              <p className="text-sm text-gray-500">Admin only — not visible to users</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Current Status */}
        <div className="px-6 pt-4">
          <div className={`rounded-lg p-3 mb-4 ${
            isManipulated
              ? 'bg-orange-50 border border-orange-200'
              : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Current Status</p>
                <p className={`text-xs mt-1 ${isManipulated ? 'text-orange-600' : 'text-gray-500'}`}>
                  {isManipulated
                    ? `⚠️ MANIPULATION ACTIVE — Forced: ${round.manipulationInfo?.forcedResult?.toUpperCase() || 'NONE'} | Price Override: ${round.manipulationInfo?.overridePrice ? `$${round.manipulationInfo.overridePrice.toLocaleString()}` : 'NONE'}`
                    : '✅ Normal — Using real BTC market price'
                  }
                </p>
              </div>
              {isManipulated && (
                <button
                  onClick={handleClearManipulation}
                  disabled={loading}
                  className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('manipulate')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                mode === 'manipulate'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Settings size={14} className="inline mr-1" />
              Manipulate
            </button>
            <button
              onClick={() => setMode('forceEnd')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                mode === 'forceEnd'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Zap size={14} className="inline mr-1" />
              Force End
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 pb-6">
          {mode === 'manipulate' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Price Override */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Override Price (USD)
                  <span className="text-xs text-gray-400 ml-2">— Fake price users see on chart</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 95000"
                  value={formData.overridePrice}
                  onChange={(e) => setFormData({ ...formData, overridePrice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  min="1000"
                  max="500000"
                  step="0.01"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Current real price: ${parseFloat(round.startPrice || 0).toLocaleString()}
                </p>
              </div>

              {/* Forced Result */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Force Result
                  <span className="text-xs text-gray-400 ml-2">— Who wins at round end</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, forcedResult: 'up' })}
                    className={`py-3 px-4 rounded-lg border-2 font-medium text-sm transition flex items-center justify-center gap-2 ${
                      formData.forcedResult === 'up'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-green-300'
                    }`}
                  >
                    <ArrowUp size={16} />
                    UP Wins
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, forcedResult: 'down' })}
                    className={`py-3 px-4 rounded-lg border-2 font-medium text-sm transition flex items-center justify-center gap-2 ${
                      formData.forcedResult === 'down'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-red-300'
                    }`}
                  >
                    <ArrowDown size={16} />
                    DOWN Wins
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, forcedResult: '' })}
                    className={`py-3 px-4 rounded-lg border-2 font-medium text-sm transition ${
                      formData.forcedResult === ''
                        ? 'border-gray-500 bg-gray-50 text-gray-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    Natural
                  </button>
                </div>
              </div>

              {/* Admin Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Internal Note
                  <span className="text-xs text-gray-400 ml-2">— Never shown to users</span>
                </label>
                <input
                  type="text"
                  placeholder="Optional internal note..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || (!formData.overridePrice && !formData.forcedResult)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Shield size={18} />
                )}
                {loading ? 'Activating...' : 'Activate Manipulation'}
              </button>
            </form>
          ) : (
            // Force End Mode
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800">⚠️ Force End Warning</p>
                <p className="text-xs text-red-600 mt-1">
                  This immediately ends the round and settles ALL bets.
                  Choose the winning side carefully — this cannot be undone.
                </p>
              </div>

              {/* Forced Result for Force End */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Winning Side
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, forcedResult: 'up' })}
                    className={`py-4 px-4 rounded-xl border-2 font-bold text-base transition flex flex-col items-center gap-2 ${
                      formData.forcedResult === 'up'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-green-300'
                    }`}
                  >
                    <TrendingUp size={28} className="text-green-500" />
                    UP WINS
                    <span className="text-xs font-normal text-gray-500">
                      ₦{parseFloat(round.totalUpAmount || 0).toLocaleString()} pool
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, forcedResult: 'down' })}
                    className={`py-4 px-4 rounded-xl border-2 font-bold text-base transition flex flex-col items-center gap-2 ${
                      formData.forcedResult === 'down'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-red-300'
                    }`}
                  >
                    <TrendingDown size={28} className="text-red-500" />
                    DOWN WINS
                    <span className="text-xs font-normal text-gray-500">
                      ₦{parseFloat(round.totalDownAmount || 0).toLocaleString()} pool
                    </span>
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (Internal)
                </label>
                <input
                  type="text"
                  placeholder="Reason for force ending..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Bet Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Bet Summary</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">UP Bets:</span>
                    <span className="font-medium text-green-600">
                      {round.totalUpBets || 0} (₦{parseFloat(round.totalUpAmount || 0).toLocaleString()})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">DOWN Bets:</span>
                    <span className="font-medium text-red-600">
                      {round.totalDownBets || 0} (₦{parseFloat(round.totalDownAmount || 0).toLocaleString()})
                    </span>
                  </div>
                </div>
              </div>

              {/* Force End Button */}
              <button
                onClick={handleForceEnd}
                disabled={loading || !formData.forcedResult}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Zap size={18} />
                )}
                {loading
                  ? 'Processing...'
                  : formData.forcedResult
                    ? `Force End — ${formData.forcedResult.toUpperCase()} WINS`
                    : 'Select a side first'
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =====================================================
// ✅ MAIN ROUNDS COMPONENT
// =====================================================
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

  // ✅ Manipulation modal state
  const [manipulationModal, setManipulationModal] = useState(null);

  // ✅ Manipulation status from backend
  const [manipulationStatus, setManipulationStatus] = useState(null);

  useEffect(() => {
    loadRounds();
    loadManipulationStatus();
  }, [filters]);

  // ✅ Auto-refresh manipulation status every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadManipulationStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

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

  // ✅ Load manipulation status from backend
  const loadManipulationStatus = async () => {
    try {
      const res = await adminService.getManipulationStatus();
      if (res.success) {
        setManipulationStatus(res.data);
      }
    } catch (error) {
      // Silent fail — non-critical
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRounds();
    loadManipulationStatus();
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
        loadManipulationStatus();
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

  const canManipulateRound = (round) => {
    return ['active', 'locked'].includes(round.status);
  };

  return (
    <div className="space-y-6 p-6">

      {/* ✅ MANIPULATION STATUS BANNER */}
      {manipulationStatus?.priceInfo?.overrideActive && (
        <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-bold text-orange-800">
                  ⚠️ PRICE MANIPULATION ACTIVE
                </p>
                <p className="text-sm text-orange-600 mt-1">
                  Broadcast Price: <strong>${manipulationStatus.priceInfo.currentBroadcastPrice?.toLocaleString()}</strong>
                  {' '}|{' '}
                  Real Market Price: <strong>${manipulationStatus.priceInfo.realMarketPrice?.toLocaleString()}</strong>
                  {' '}|{' '}
                  Difference: <strong>${Math.abs(manipulationStatus.priceInfo.priceDifference || 0).toLocaleString()}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-8 w-8 text-blue-600" />
            Rounds Management
          </h1>
          <p className="text-gray-600 mt-1">View, manage and control all trading rounds</p>
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

      {/* ✅ ACTIVE ROUND QUICK ACTIONS */}
      {manipulationStatus?.rounds && manipulationStatus.rounds.filter(
        r => ['active', 'locked'].includes(r.status)
      ).length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Zap size={16} className="text-purple-600" />
            Live Round Controls
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {manipulationStatus.rounds
              .filter(r => ['active', 'locked'].includes(r.status))
              .map(r => (
                <div
                  key={r.id}
                  className={`rounded-lg border-2 p-3 ${
                    r.manipulation?.isActive
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-gray-900">Round #{r.roundNumber}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.status === 'active'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                      {r.manipulation?.isActive && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
                          MANIPULATED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pool info */}
                  <div className="text-xs text-gray-500 mb-3">
                    <span className="text-green-600 font-medium">
                      ↑ {r.totalUpBets} bets (₦{formatCurrency(r.totalUpAmount)})
                    </span>
                    {' / '}
                    <span className="text-red-600 font-medium">
                      ↓ {r.totalDownBets} bets (₦{formatCurrency(r.totalDownAmount)})
                    </span>
                  </div>

                  {/* Manipulation info if active */}
                  {r.manipulation?.isActive && (
                    <div className="text-xs bg-orange-100 rounded p-2 mb-2">
                      {r.manipulation.overridePrice && (
                        <p>Price Override: <strong>${r.manipulation.overridePrice.toLocaleString()}</strong></p>
                      )}
                      {r.manipulation.forcedResult && (
                        <p>Forced Result: <strong className={
                          r.manipulation.forcedResult === 'up' ? 'text-green-700' : 'text-red-700'
                        }>{r.manipulation.forcedResult.toUpperCase()} WINS</strong></p>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const fullRound = rounds.find(round => round.id === r.id) || r;
                        setManipulationModal(fullRound);
                      }}
                      className="flex-1 py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition flex items-center justify-center gap-1"
                    >
                      <Settings size={12} />
                      Control
                    </button>
                    <button
                      onClick={() => handleCancelRound(r.id, r.roundNumber)}
                      disabled={cancelling === r.id}
                      className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {cancelling === r.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <XCircle size={12} />
                      )}
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Round</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prices</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pool</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform Cut</th>
                {/* ✅ NEW COLUMN */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Control</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                      <span className="text-gray-500">Loading rounds...</span>
                    </div>
                  </td>
                </tr>
              ) : rounds.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center">
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
                  const isManipulated = round.manipulationInfo?.isManipulated;

                  return (
                    <tr
                      key={round.id}
                      className={`hover:bg-gray-50 transition ${
                        isManipulated ? 'bg-orange-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                            isManipulated ? 'bg-orange-100' : 'bg-blue-100'
                          }`}>
                            {isManipulated
                              ? <Shield className="h-5 w-5 text-orange-600" />
                              : <Target className="h-5 w-5 text-blue-600" />
                            }
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

                      {/* ✅ MANIPULATION STATUS COLUMN */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isManipulated ? (
                          <div className="space-y-1">
                            {round.manipulationInfo?.forcedResult && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                round.manipulationInfo.forcedResult === 'up'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {round.manipulationInfo.forcedResult === 'up'
                                  ? <ArrowUp size={10} className="mr-1" />
                                  : <ArrowDown size={10} className="mr-1" />
                                }
                                {round.manipulationInfo.forcedResult.toUpperCase()} FORCED
                              </span>
                            )}
                            {round.manipulationInfo?.overridePriceActive && (
                              <p className="text-xs text-orange-600">
                                Price: ${round.manipulationInfo.overridePrice?.toLocaleString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Normal</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <p>{new Date(round.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs">{new Date(round.createdAt).toLocaleTimeString()}</p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-2">
                          {/* View Details */}
                          <button
                            onClick={() => navigate(`/admin/rounds/${round.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>

                          {/* ✅ Manipulation Control Button */}
                          {canManipulateRound(round) && (
                            <button
                              onClick={() => setManipulationModal(round)}
                              className={`p-2 rounded-lg transition ${
                                isManipulated
                                  ? 'text-orange-600 hover:bg-orange-50'
                                  : 'text-purple-600 hover:bg-purple-50'
                              }`}
                              title="Round Control"
                            >
                              <Settings className="h-5 w-5" />
                            </button>
                          )}

                          {/* Cancel Button — always shown if cancellable */}
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
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
            {/* ✅ NEW — Manipulated count */}
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {rounds.filter(r => r.manipulationInfo?.isManipulated).length}
              </p>
              <p className="text-xs text-gray-500">Manipulated</p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MANIPULATION MODAL */}
      {manipulationModal && (
        <ManipulationModal
          round={manipulationModal}
          onClose={() => setManipulationModal(null)}
          onSuccess={() => {
            loadRounds();
            loadManipulationStatus();
          }}
        />
      )}
    </div>
  );
};

export default Rounds;
