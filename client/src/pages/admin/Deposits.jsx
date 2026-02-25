
// src/pages/admin/Deposits.jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, DollarSign, RefreshCw } from 'lucide-react';
import adminService from '../../services/adminService'; // ✅ Use adminService
import toast from 'react-hot-toast';

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
      const res = await adminService.getAmountMismatches();
      
      // Backend returns: { success: true, data: { count: 5, deposits: [...] } }
      if (res.success) {
        setMismatches(res.data.deposits || []);
      } else {
        setMismatches([]);
      }
    } catch (error) {
      console.error('Failed to load mismatches:', error);
      toast.error('Failed to load deposit mismatches');
      setMismatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (deposit) => {
    // More user-friendly approval dialog
    const receivedAmount = deposit.receivedAmount;
    const expectedAmount = deposit.expectedAmount;
    
    const message = `
Deposit Mismatch Details:
━━━━━━━━━━━━━━━━━━━━━━━━
Expected: ₦${expectedAmount.toLocaleString()}
Received: ₦${receivedAmount.toLocaleString()}
Difference: ₦${Math.abs(deposit.difference).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━

How much should be credited to user ${deposit.user.username}?
(Enter amount in Naira)
    `.trim();

    const creditAmount = prompt(message, receivedAmount);
    
    if (!creditAmount) {
      toast.error('Approval cancelled');
      return;
    }

    const amount = parseFloat(creditAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount entered');
      return;
    }

    if (amount > receivedAmount) {
      const confirmOvercredit = confirm(
        `⚠️ WARNING: You're crediting ₦${amount.toLocaleString()} but only ₦${receivedAmount.toLocaleString()} was received.\n\nAre you sure?`
      );
      if (!confirmOvercredit) {
        toast.error('Approval cancelled');
        return;
      }
    }

    setProcessing(deposit.reference);
    
    try {
      const res = await adminService.approveMismatch(deposit.reference, { 
        creditAmount: amount 
      });
      
      if (res.success) {
        toast.success(`✅ Approved! ₦${amount.toLocaleString()} credited to ${deposit.user.username}`);
        loadMismatches(); // Reload list
      } else {
        toast.error(res.message || 'Failed to approve deposit');
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to approve deposit');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (deposit) => {
    const confirmReject = confirm(
      `Are you sure you want to REJECT this deposit?\n\nUser: ${deposit.user.username}\nAmount: ₦${deposit.receivedAmount.toLocaleString()}\n\nThis action cannot be undone.`
    );

    if (!confirmReject) return;

    const reason = prompt('Enter rejection reason:');
    if (!reason) {
      toast.error('Rejection cancelled - reason required');
      return;
    }

    setProcessing(deposit.reference);
    
    try {
      // You might need to add this endpoint to backend
      // await adminService.rejectMismatch(deposit.reference, { reason });
      toast.success('Deposit rejected');
      loadMismatches();
    } catch (error) {
      toast.error('Failed to reject deposit');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading deposit mismatches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deposit Amount Mismatches</h1>
          <p className="text-gray-600 mt-1">
            {mismatches.length} deposit{mismatches.length !== 1 ? 's' : ''} requiring manual review
          </p>
        </div>
        <button
          onClick={loadMismatches}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Manual Review Required</h3>
            <p className="text-sm text-yellow-700 mt-1">
              These deposits have amount mismatches and require your approval before crediting.
              Verify the received amount matches the bank statement before approving.
            </p>
          </div>
        </div>
      </div>

      {/* Mismatches List */}
      {mismatches.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
          <p className="text-gray-600 mt-2">No amount mismatches to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mismatches.map((deposit) => (
            <div 
              key={deposit.reference} 
              className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-400 hover:shadow-xl transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="font-semibold text-gray-900 text-lg">Amount Mismatch Detected</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">User:</span> {deposit.user.username}
                    </p>
                    <p className="text-sm text-gray-600">{deposit.user.email}</p>
                    {deposit.user.phone && (
                      <p className="text-sm text-gray-600">📱 {deposit.user.phone}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    Ref: {deposit.reference}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm text-gray-700">
                    {new Date(deposit.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(deposit.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Amount Comparison - Enhanced */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 mb-4 border border-gray-200">
                <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3 flex items-center">
                  <DollarSign size={14} className="mr-1" />
                  Amount Comparison
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 font-medium">Expected</p>
                    <p className="text-xl font-bold text-blue-600">
                      ₦{deposit.expectedAmount?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">User's deposit request</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 font-medium">Received</p>
                    <p className="text-xl font-bold text-green-600">
                      ₦{deposit.receivedAmount?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Actual bank credit</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 font-medium">Difference</p>
                    <p className={`text-xl font-bold ${
                      deposit.difference > 0 ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      {deposit.difference > 0 ? '-' : '+'}₦{Math.abs(deposit.difference || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {deposit.difference > 0 ? 'Underpaid' : 'Overpaid'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                <h4 className="text-xs font-semibold text-blue-800 uppercase mb-3">
                  Payment Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs">Account Number</p>
                    <p className="font-mono font-semibold text-gray-900">{deposit.account?.number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Bank</p>
                    <p className="font-medium text-gray-900">{deposit.account?.bank || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600 text-xs">Payer Name</p>
                    <p className="font-medium text-gray-900">{deposit.payer || 'Unknown'}</p>
                  </div>
                  {deposit.aspfiyRef && (
                    <div className="col-span-2">
                      <p className="text-gray-600 text-xs">Aspfiy Reference</p>
                      <p className="font-mono text-xs text-gray-700">{deposit.aspfiyRef}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => handleApprove(deposit)}
                  disabled={processing === deposit.reference}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {processing === deposit.reference ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Approve & Credit
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleReject(deposit)}
                  disabled={processing === deposit.reference}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Deposits;
