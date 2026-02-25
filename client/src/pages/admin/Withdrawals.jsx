
// src/pages/admin/Withdrawals.jsx
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User, 
  DollarSign, 
  RefreshCw,
  Loader2,
  Clock,
  CreditCard,
  Building,
  Phone,
  Mail,
  Shield,
  Copy,
  Check
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

// Bank codes to names mapping (Nigerian banks)
const BANK_NAMES = {
  '044': 'Access Bank',
  '023': 'Citibank Nigeria',
  '063': 'Diamond Bank',
  '050': 'Ecobank Nigeria',
  '084': 'Enterprise Bank',
  '070': 'Fidelity Bank',
  '011': 'First Bank of Nigeria',
  '214': 'First City Monument Bank',
  '058': 'Guaranty Trust Bank (GTBank)',
  '030': 'Heritage Bank',
  '301': 'Jaiz Bank',
  '082': 'Keystone Bank',
  '526': 'Parallex Bank',
  '076': 'Polaris Bank',
  '101': 'Providus Bank',
  '221': 'Stanbic IBTC Bank',
  '068': 'Standard Chartered Bank',
  '232': 'Sterling Bank',
  '100': 'Suntrust Bank',
  '032': 'Union Bank of Nigeria',
  '033': 'United Bank for Africa (UBA)',
  '215': 'Unity Bank',
  '035': 'Wema Bank',
  '057': 'Zenith Bank',
  '999': 'NIP Virtual Bank',
  '090110': 'VFD Microfinance Bank',
  '090267': 'Kuda Bank',
  '090115': 'TCF MFB',
  '100004': 'Opay',
  '100033': 'PalmPay',
  '090405': 'Moniepoint MFB',
  '120001': 'PocketMoni',
};

const getBankName = (bankCode) => {
  if (!bankCode) return 'Unknown Bank';
  return BANK_NAMES[bankCode] || `Bank (${bankCode})`;
};

const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await adminService.getPendingWithdrawals();
      
      if (res.success) {
        setWithdrawals(res.data.withdrawals || []);
        setTotalAmount(res.data.totalAmount || 0);
      } else {
        setWithdrawals([]);
        toast.error('Failed to load withdrawals');
      }
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
      toast.error(error.message || 'Failed to load withdrawals');
      setWithdrawals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWithdrawals();
  };

  // ✅ Copy to clipboard function
  const copyToClipboard = async (text, fieldId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast.success('Copied to clipboard!', { duration: 1500 });
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedField(fieldId);
      toast.success('Copied to clipboard!', { duration: 1500 });
      
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    }
  };

  const handleProcess = async (transactionId, action, withdrawal) => {
    const actionText = action === 'approve' ? 'approve' : 'reject';
    const actionPast = action === 'approve' ? 'approved' : 'rejected';
    
    const confirmMessage = action === 'approve'
      ? `Approve withdrawal of ₦${formatCurrency(withdrawal.amount)} for ${withdrawal.user?.username}?\n\nBank: ${getBankName(withdrawal.metadata?.bankCode)}\nAccount: ${withdrawal.metadata?.accountNumber}\nName: ${withdrawal.metadata?.accountName}`
      : `Reject withdrawal of ₦${formatCurrency(withdrawal.amount)} for ${withdrawal.user?.username}?\n\nThe amount will be refunded to user's wallet.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const reason = prompt(
      action === 'approve' 
        ? 'Enter processing note (optional):' 
        : 'Enter rejection reason (required):'
    );
    
    if (action === 'reject' && (!reason || !reason.trim())) {
      toast.error('Rejection reason is required');
      return;
    }

    setProcessing(transactionId);
    
    try {
      const res = await adminService.processWithdrawal(transactionId, { 
        action, 
        reason: reason?.trim() || `${actionPast} by admin`
      });
      
      if (res.success) {
        toast.success(
          action === 'approve'
            ? `✅ Withdrawal approved! ₦${formatCurrency(withdrawal.amount)} to be sent to ${withdrawal.user?.username}`
            : `❌ Withdrawal rejected and ₦${formatCurrency(withdrawal.amount)} refunded to ${withdrawal.user?.username}`
        );
        loadWithdrawals();
      } else {
        toast.error(res.message || `Failed to ${actionText} withdrawal`);
      }
    } catch (error) {
      console.error(`Process withdrawal error:`, error);
      toast.error(error.message || `Failed to ${actionText} withdrawal`);
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ✅ Copy Button Component
  const CopyButton = ({ text, fieldId, label }) => {
    const isCopied = copiedField === fieldId;
    
    return (
      <button
        onClick={() => copyToClipboard(text, fieldId)}
        className={`ml-2 p-1.5 rounded-lg transition-all ${
          isCopied 
            ? 'bg-green-100 text-green-600' 
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
        }`}
        title={isCopied ? 'Copied!' : `Copy ${label}`}
      >
        {isCopied ? (
          <Check size={14} />
        ) : (
          <Copy size={14} />
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading pending withdrawals...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-orange-600" />
            Pending Withdrawals
          </h1>
          <p className="text-gray-600 mt-1">
            {withdrawals.length} withdrawal{withdrawals.length !== 1 ? 's' : ''} awaiting approval
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

      {/* Total Amount Banner */}
      {withdrawals.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Total Pending Amount</p>
              <p className="text-4xl font-bold mt-1">
                ₦{formatCurrency(totalAmount)}
              </p>
              <p className="text-orange-200 text-sm mt-2">
                Across {withdrawals.length} pending request{withdrawals.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl">
              <DollarSign className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Withdrawals Grid */}
      {withdrawals.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">All Clear!</h3>
          <p className="text-gray-600 mt-2">No pending withdrawals at the moment</p>
          <p className="text-gray-400 text-sm mt-4">New withdrawal requests will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {withdrawals.map((withdrawal) => (
            <div 
              key={withdrawal.id} 
              className="bg-white rounded-2xl shadow-lg overflow-hidden border-l-4 border-orange-500 hover:shadow-xl transition"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-50 to-white p-5 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-full mr-4">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">
                        {withdrawal.user?.username || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail size={12} />
                        {withdrawal.user?.email || 'N/A'}
                      </p>
                      {withdrawal.user?.phoneNumber && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone size={12} />
                          {withdrawal.user.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {/* ✅ Amount with Copy Button */}
                    <div className="flex items-center justify-end">
                      <p className="text-3xl font-black text-gray-900">
                        ₦{formatCurrency(withdrawal.amount)}
                      </p>
                      <CopyButton 
                        text={parseFloat(withdrawal.amount).toString()} 
                        fieldId={`amount-${withdrawal.id}`}
                        label="amount"
                      />
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-1">
                      <Clock size={12} />
                      {formatDate(withdrawal.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="p-5">
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                    <Building size={14} />
                    Bank Details
                  </h4>
                  <div className="space-y-3">
                    {/* Bank Name */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Bank Name:</span>
                      <span className="text-sm font-bold text-gray-900 bg-blue-50 px-3 py-1 rounded-lg">
                        🏦 {getBankName(withdrawal.metadata?.bankCode)}
                      </span>
                    </div>

                    {/* Account Name */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Account Name:</span>
                      <span className="text-sm font-semibold text-gray-900 text-right max-w-[60%]">
                        {withdrawal.metadata?.accountName || 'N/A'}
                      </span>
                    </div>

                    {/* ✅ Account Number with Copy Button */}
                    <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-200">
                      <span className="text-sm text-gray-600">Account Number:</span>
                      <div className="flex items-center">
                        <span className="text-lg font-mono font-bold text-gray-900 tracking-wider">
                          {withdrawal.metadata?.accountNumber || 'N/A'}
                        </span>
                        {withdrawal.metadata?.accountNumber && (
                          <CopyButton 
                            text={withdrawal.metadata.accountNumber} 
                            fieldId={`account-${withdrawal.id}`}
                            label="account number"
                          />
                        )}
                      </div>
                    </div>

                    {/* Bank Code (smaller) */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Bank Code:</span>
                      <span className="text-gray-500 font-mono">
                        {withdrawal.metadata?.bankCode || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ✅ Quick Copy All Button */}
                <button
                  onClick={() => {
                    const details = `Bank: ${getBankName(withdrawal.metadata?.bankCode)}\nAccount Name: ${withdrawal.metadata?.accountName}\nAccount Number: ${withdrawal.metadata?.accountNumber}\nAmount: ₦${formatCurrency(withdrawal.amount)}`;
                    copyToClipboard(details, `all-${withdrawal.id}`);
                  }}
                  className={`w-full mt-3 py-2 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                    copiedField === `all-${withdrawal.id}`
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {copiedField === `all-${withdrawal.id}` ? (
                    <>
                      <Check size={16} />
                      All Details Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy All Bank Details
                    </>
                  )}
                </button>

                {/* User Wallet Info */}
                <div className="bg-blue-50 rounded-xl p-4 mt-3">
                  <h4 className="text-xs font-semibold text-blue-600 uppercase mb-2">
                    User's Wallet
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 text-xs">Current Balance</p>
                      <p className="font-bold text-blue-900">
                        ₦{formatCurrency(withdrawal.user?.wallet?.nairaBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs">Total Deposited</p>
                      <p className="font-bold text-blue-900">
                        ₦{formatCurrency(withdrawal.user?.wallet?.totalDeposited)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs">Total Withdrawn</p>
                      <p className="font-bold text-blue-900">
                        ₦{formatCurrency(withdrawal.user?.wallet?.totalWithdrawn)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs">Net Position</p>
                      <p className={`font-bold ${
                        (withdrawal.user?.wallet?.totalDeposited - withdrawal.user?.wallet?.totalWithdrawn) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        ₦{formatCurrency(
                          (withdrawal.user?.wallet?.totalDeposited || 0) - 
                          (withdrawal.user?.wallet?.totalWithdrawn || 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* KYC Warning */}
                {withdrawal.user?.kycStatus !== 'approved' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-3 flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-800">⚠️ KYC Not Approved</p>
                      <p className="text-yellow-700 mt-0.5">
                        User's KYC status: <span className="font-medium uppercase">{withdrawal.user?.kycStatus || 'pending'}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* KYC Approved Badge */}
                {withdrawal.user?.kycStatus === 'approved' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3 flex items-center">
                    <Shield className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">✓ KYC Verified</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleProcess(withdrawal.id, 'approve', withdrawal)}
                    disabled={processing === withdrawal.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-green-600/20 hover:shadow-green-600/40"
                  >
                    {processing === withdrawal.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleProcess(withdrawal.id, 'reject', withdrawal)}
                    disabled={processing === withdrawal.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-red-600/20 hover:shadow-red-600/40"
                  >
                    {processing === withdrawal.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 mr-2" />
                        Reject
                      </>
                    )}
                  </button>
                </div>

                {/* Reference */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-2">
                  <p className="text-xs text-gray-400 font-mono">
                    Ref: {withdrawal.reference}
                  </p>
                  <CopyButton 
                    text={withdrawal.reference} 
                    fieldId={`ref-${withdrawal.id}`}
                    label="reference"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500">
          💡 <strong>Tip:</strong> Click the copy buttons to quickly copy account details for bank transfers. Rejected withdrawals are automatically refunded.
        </p>
      </div>
    </div>
  );
};

export default Withdrawals;
