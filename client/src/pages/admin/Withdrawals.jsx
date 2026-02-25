// src/pages/admin/Withdrawals.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, User, DollarSign } from 'lucide-react';
import adminApi from '../../services/adminApi';

const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPendingWithdrawals();
      setWithdrawals(res.data.data.withdrawals);
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (transactionId, action) => {
    const actionText = action === 'approve' ? 'approve' : 'reject';
    const reason = prompt(`Enter reason for ${actionText}ing this withdrawal:`);
    
    if (reason === null) return; // User cancelled

    setProcessing(transactionId);
    try {
      await adminApi.processWithdrawal(transactionId, { action, reason });
      alert(`Withdrawal ${actionText}ed successfully!`);
      loadWithdrawals();
    } catch (error) {
      alert(`Failed to ${actionText} withdrawal`);
    } finally {
      setProcessing(null);
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
        <h1 className="text-3xl font-bold text-gray-900">Pending Withdrawals</h1>
        <p className="text-gray-600 mt-1">
          {withdrawals.length} withdrawal{withdrawals.length !== 1 ? 's' : ''} awaiting approval
        </p>
      </div>

      {/* Total Amount */}
      {withdrawals.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-800">Total Pending Amount</p>
              <p className="text-2xl font-bold text-blue-900">
                ₦{withdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawals Grid */}
      {withdrawals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
          <p className="text-gray-600 mt-2">No pending withdrawals at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-400">
              {/* User Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full mr-3">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{withdrawal.user.username}</p>
                    <p className="text-sm text-gray-600">{withdrawal.user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ₦{parseFloat(withdrawal.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(withdrawal.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Bank Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Account Name:</span>
                  <span className="font-medium text-gray-900">
                    {withdrawal.metadata?.accountName || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Account Number:</span>
                  <span className="font-medium text-gray-900">
                    {withdrawal.metadata?.accountNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bank Code:</span>
                  <span className="font-medium text-gray-900">
                    {withdrawal.metadata?.bankCode || 'N/A'}
                  </span>
                </div>
              </div>

              {/* User Wallet Info */}
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Current Balance:</p>
                    <p className="font-semibold text-gray-900">
                      ₦{withdrawal.user.wallet?.nairaBalance?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Deposited:</p>
                    <p className="font-semibold text-gray-900">
                      ₦{withdrawal.user.wallet?.totalDeposited?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* KYC Warning */}
              {withdrawal.user.kycStatus !== 'approved' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">KYC Not Approved</p>
                    <p className="text-yellow-700">
                      User's KYC status is: {withdrawal.user.kycStatus || 'pending'}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => handleProcess(withdrawal.id, 'approve')}
                  disabled={processing === withdrawal.id}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {processing === withdrawal.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Approve
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleProcess(withdrawal.id, 'reject')}
                  disabled={processing === withdrawal.id}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {processing === withdrawal.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 mr-2" />
                      Reject
                    </>
                  )}
                </button>
              </div>

              {/* Reference */}
              <div className="mt-3 text-xs text-gray-500 text-center">
                Ref: {withdrawal.reference}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Withdrawals;
