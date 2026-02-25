// src/pages/admin/Deposits.jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import adminApi from '../../services/adminApi';

const Deposits = () => {
  const [mismatches, setMismatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadMismatches();
  }, []);

  const loadMismatches = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAmountMismatches();
      setMismatches(res.data.data.deposits);
    } catch (error) {
      console.error('Failed to load mismatches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reference) => {
    const creditAmount = prompt('Enter amount to credit (in Naira):');
    
    if (!creditAmount) return;

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount');
      return;
    }

    setProcessing(reference);
    try {
      await adminApi.approveMismatch(reference, { creditAmount: amount });
      alert('Deposit approved and credited!');
      loadMismatches();
    } catch (error) {
      alert('Failed to approve deposit');
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
        <h1 className="text-3xl font-bold text-gray-900">Deposit Amount Mismatches</h1>
        <p className="text-gray-600 mt-1">
          {mismatches.length} deposit{mismatches.length !== 1 ? 's' : ''} requiring manual review
        </p>
      </div>

      {/* Mismatches */}
      {mismatches.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
          <p className="text-gray-600 mt-2">No amount mismatches to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mismatches.map((deposit) => (
            <div key={deposit.reference} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-400">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="font-semibold text-gray-900">Amount Mismatch Detected</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    User: <span className="font-medium">{deposit.user.username}</span> ({deposit.user.email})
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Reference: {deposit.reference}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(deposit.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Amount Comparison */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Expected Amount</p>
                    <p className="text-lg font-bold text-blue-600">
                      ₦{deposit.expectedAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Received Amount</p>
                    <p className="text-lg font-bold text-green-600">
                      ₦{deposit.receivedAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Difference</p>
                    <p className={`text-lg font-bold ${
                      deposit.difference > 0 ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      {deposit.difference > 0 ? '-' : '+'}₦{Math.abs(deposit.difference).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="bg-blue-50 rounded-lg p-3 mb-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">Account Number:</p>
                  <p className="font-medium">{deposit.account.number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Bank:</p>
                  <p className="font-medium">{deposit.account.bank}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Payer:</p>
                  <p className="font-medium">{deposit.payer || 'N/A'}</p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleApprove(deposit.reference)}
                disabled={processing === deposit.reference}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {processing === deposit.reference ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Approve & Credit Manually
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Deposits;
