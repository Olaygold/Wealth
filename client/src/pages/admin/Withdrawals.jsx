
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
  // Commercial Banks
  '044': 'Access Bank',
  '063': 'Access Bank (Diamond)',
  '035A': 'ALAT by WEMA',
  '401': 'ASO Savings and Loans',
  '023': 'Citibank Nigeria',
  '050': 'Ecobank Nigeria',
  '084': 'Enterprise Bank',
  '070': 'Fidelity Bank',
  '011': 'First Bank of Nigeria',
  '214': 'First City Monument Bank (FCMB)',
  '058': 'Guaranty Trust Bank (GTBank)',
  '030': 'Heritage Bank',
  '301': 'Jaiz Bank',
  '082': 'Keystone Bank',
  '076': 'Polaris Bank',
  '101': 'Providus Bank',
  '221': 'Stanbic IBTC Bank',
  '068': 'Standard Chartered Bank',
  '232': 'Sterling Bank',
  '100': 'Suntrust Bank',
  '302': 'TAJ Bank',
  '032': 'Union Bank of Nigeria',
  '033': 'United Bank for Africa (UBA)',
  '215': 'Unity Bank',
  '035': 'Wema Bank',
  '057': 'Zenith Bank',
  '303': 'Lotus Bank',
  '304': 'Premium Trust Bank',
  '305': 'Parallex Bank',
  '103': 'Globus Bank',
  '306': 'Signature Bank',
  '104': 'Titan Trust Bank',
  '105': 'Optimus Bank',

  // Digital/Mobile Banks
  '090267': 'Kuda Microfinance Bank',
  '999992': 'Opay Digital Services',
  '100004': 'Opay',
  '999991': 'PalmPay',
  '100033': 'PalmPay',
  '090405': 'Moniepoint MFB',
  '50211': 'Carbon',
  '100026': 'Carbon (OneFi)',
  '090326': 'Sparkle Microfinance Bank',
  '100025': 'FairMoney Microfinance Bank',
  '090175': 'Rubies Microfinance Bank',
  '090110': 'VFD Microfinance Bank',
  '100022': 'GoMoney',
  '090195': 'Mint Finex MFB',
  '090328': 'Eyowo',

  // Microfinance Banks (MFBs)
  '090001': 'ASOSavings & Loans',
  '090270': 'AB Microfinance Bank',
  '090260': 'Above Only Microfinance Bank',
  '090197': 'ABU Microfinance Bank',
  '090134': 'Accion Microfinance Bank',
  '090160': 'Addosser Microfinance Bank',
  '090268': 'Adeyemi College Staff Microfinance Bank',
  '090292': 'Afekhafe Microfinance Bank',
  '090285': 'Affluence Microfinance Bank',
  '100028': 'AG Mortgage Bank',
  '090259': 'Alekun Microfinance Bank',
  '090297': 'Alert Microfinance Bank',
  '090169': 'Alpha Kapital Microfinance Bank',
  '090116': 'AMML Microfinance Bank',
  '090282': 'Arise Microfinance Bank',
  '090287': 'Assetmatrix Microfinance Bank',
  '090172': 'Astrapolaris Microfinance Bank',
  '090264': 'Auchi Microfinance Bank',
  '090188': 'Baines Credit Microfinance Bank',
  '090581': 'Balogun Gambari Microfinance Bank',
  '090127': 'BC Kash Microfinance Bank',
  '090117': 'Boctrust Microfinance Bank',
  '090176': 'Bosak Microfinance Bank',
  '090308': 'Brightway Microfinance Bank',
  '090406': 'Business Support MFB',
  '090415': 'Calabash Microfinance Bank',
  '090360': 'Cashconnect Microfinance Bank',
  '090141': 'CEMCS Microfinance Bank',
  '090144': 'CIT Microfinance Bank',
  '090374': 'Coastline Microfinance Bank',
  '090130': 'Consumer Microfinance Bank',
  '090166': 'Credit Afrique Microfinance Bank',
  '090167': 'Daylight Microfinance Bank',
  '090156': 'e-Barcs Microfinance Bank',
  '090097': 'Ekondo Microfinance Bank',
  '090273': 'Emerald Microfinance Bank',
  '090114': 'Empire Trust Microfinance Bank',
  '090179': 'Esan Microfinance Bank',
  '090304': 'Evangel Microfinance Bank',
  '090332': 'Evergreen Microfinance Bank',
  '090266': 'Ezee Microfinance Bank',
  '090180': 'FAST Microfinance Bank',
  '090153': 'FBN Mortgages Limited',
  '090290': 'FCT Microfinance Bank',
  '090126': 'Fidfund Microfinance Bank',
  '090111': 'FinaTrust Microfinance Bank',
  '090400': 'Finca Microfinance Bank',
  '090366': 'Firmus Microfinance Bank',
  '090107': 'First Royal Microfinance Bank',
  '090164': 'First Multiple Microfinance Bank',
  '090298': 'Fedeth Microfinance Bank',
  '070002': 'Fortis Microfinance Bank',
  '090145': 'Fullrange Microfinance Bank',
  '090278': 'FundsGate Microfinance Bank',
  '090168': 'Gashua Microfinance Bank',
  '090186': 'Gateway Mortgage Bank',
  '090122': 'Gowans Microfinance Bank',
  '090178': 'Greenbank Microfinance Bank',
  '090408': 'Greenwich Microfinance Bank',
  '090147': 'Hackman Microfinance Bank',
  '090121': 'Haggai Mortgage Bank',
  '090363': 'Headway Microfinance Bank',
  '090118': 'IBILE Microfinance Bank',
  '090324': 'Ikenne Microfinance Bank',
  '090279': 'Ikire Microfinance Bank',
  '090370': 'Ilisan Microfinance Bank',
  '090258': 'Imo State Microfinance Bank',
  '090157': 'Infinity Microfinance Bank',
  '100029': 'Innovectives Kesh',
  '090149': 'IRL Microfinance Bank',
  '090377': 'Isaleoyo Microfinance Bank',
  '090263': 'Kadpoly Microfinance Bank',
  '090191': 'KCMB Microfinance Bank',
  '090299': 'Kontagora Microfinance Bank',
  '090380': 'Kredi Money Microfinance Bank',
  '090177': 'Lapo Microfinance Bank',
  '090271': 'Lavender Microfinance Bank',
  '090372': 'Legend Microfinance Bank',
  '090373': 'Lifegate Microfinance Bank',
  '090327': 'Links Microfinance Bank',
  '090435': 'Links MFB',
  '090289': 'Lovonus Microfinance Bank',
  '100035': 'M36',
  '090323': 'Mainland Microfinance Bank',
  '090174': 'Malachy Microfinance Bank',
  '090383': 'Manny Microfinance Bank',
  '090410': 'Maritime Microfinance Bank',
  '090171': 'Mainstreet Microfinance Bank',
  '090321': 'Mayfair Microfinance Bank',
  '090280': 'Megapraise Microfinance Bank',
  '090113': 'Microvis Microfinance Bank',
  '090281': 'Mint Microfinance Bank',
  '090192': 'Midland Microfinance Bank',
  '090136': 'Microcred Microfinance Bank',
  '090129': 'Money Trust Microfinance Bank',
  '090190': 'Mutual Benefits Microfinance Bank',
  '090151': 'Mutual Trust Microfinance Bank',
  '090152': 'Nagarta Microfinance Bank',
  '090283': 'NNEW Microfinance Bank',
  '090128': 'Ndiorah Microfinance Bank',
  '090108': 'New Prudential Bank',
  '090205': 'New Dawn Microfinance Bank',
  '090378': 'New Golden Pastures Microfinance Bank',
  '070001': 'NPF Microfinance Bank',
  '090364': 'Numo Microfinance Bank',
  '090275': 'Okuku Microfinance Bank',
  '090272': 'Olowolagba Microfinance Bank',
  '090295': 'Omiye Microfinance Bank',
  '090119': 'OPML Microfinance Bank',
  '090317': 'PatrickGold Microfinance Bank',
  '090004': 'Parralex Microfinance Bank',
  '090196': 'Pennywise Microfinance Bank',
  '090165': 'Petra Microfinance Bank',
  '090135': 'Personal Trust Microfinance Bank',
  '090296': 'Pillar Microfinance Bank',
  '090137': 'Pecan Trust Microfinance Bank',
  '090393': 'Platinum Integrated MFB',
  '090005': 'Prestige Microfinance Bank',
  '090303': 'Purplemoney Microfinance Bank',
  '090261': 'Quickfund Microfinance Bank',
  '090198': 'RenMoney Microfinance Bank',
  '090322': 'Rephidim Microfinance Bank',
  '090132': 'Richway Microfinance Bank',
  '090138': 'Royal Exchange Microfinance Bank',
  '090286': 'Safe Haven Microfinance Bank',
  '090006': 'SafeTrust Microfinance Bank',
  '090325': 'Seedvest Microfinance Bank',
  '090369': 'Shepherd Trust Microfinance Bank',
  '090162': 'Stanford Microfinance Bank',
  '090262': 'Stellas Microfinance Bank',
  '090305': 'Sulspap Microfinance Bank',
  '090007': 'SunTrust Microfinance Bank',
  '090115': 'TCF Microfinance Bank',
  '090373': 'Think Finance Microfinance Bank',
  '090115': 'Trident Microfinance Bank',
  '090276': 'Trustfund Microfinance Bank',
  '090251': 'UNN Microfinance Bank',
  '090331': 'UNAAB Microfinance Bank',
  '090193': 'Unical Microfinance Bank',
  '090338': 'UniUyo Microfinance Bank',
  '090123': 'Verite Microfinance Bank',
  '090150': 'Virtue Microfinance Bank',
  '090139': 'Visa Microfinance Bank',
  '090333': 'Abulesoro Microfinance Bank',
  '090124': 'XSLNCE Microfinance Bank',
  '090142': 'Yes Microfinance Bank',
  '090140': 'Sagamu Microfinance Bank',
  '090315': 'U & C Microfinance Bank',
  '090448': 'Yobe Microfinance Bank',
  '090466': 'YCT Microfinance Bank',
  '090420': 'Winview Microfinance Bank',
  '090419': 'Waya Microfinance Bank',
  '090472': 'Vconnect Microfinance Bank',
  '090158': 'Unilag Microfinance Bank',
  '090476': 'Spectrum Microfinance Bank',
  '090474': 'Smartcash MFB',
  '090409': 'Seedvest Microfinance Bank',
  '090399': 'Pristine Divitis MFB',
  '090432': 'Preeminent Microfinance Bank',
  '090391': 'Oyan Microfinance Bank',
  '090396': 'Oscotech Microfinance Bank',
  '090456': 'Ospoly Microfinance Bank',
  '090463': 'Olofin Owena MFB',
  '090460': 'Olowopora MFB',
  '090161': 'Okpoga Microfinance Bank',
  '090467': 'Nexim Microfinance Bank',
  '090329': 'Neptune Microfinance Bank',
  '090437': 'Minjibir Microfinance Bank',
  '090455': 'Mkobo Microfinance Bank',
  '090402': 'Lbic Microfinance Bank',
  '090450': 'Kwasu Microfinance Bank',
  '090452': 'Ikoyi-osun Microfinance Bank',
  '090439': 'Ibolo Microfinance Bank',
  '090434': 'Firstmidas Microfinance Bank',
  '090461': 'Fims Microfinance Bank',
  '090443': 'Edfin Microfinance Bank',
  '090425': 'Charitylove Microfinance Bank',
  '090440': 'Cherish Microfinance Bank',
  '090470': 'Citi Trust Microfinance Bank',
  '090397': 'Business Trust MFB',
  '090446': 'Borgu Microfinance Bank',
  '090504': 'Awo-ise Microfinance Bank',
  '090430': 'Arise MFB',
  '090412': 'Apple Microfinance Bank',
  '090477': 'Amac Microfinance Bank',
  '090394': 'Amac Microfinance Bank',
  '090388': 'Adroit Microfinance Bank',

  // Payment Service Banks (PSB)
  '120001': '9 Payment Service Bank (9PSB)',
  '120002': 'HopePSB',
  '120003': 'Momo Payment Service Bank',
  '120004': 'SmartCash PSB',
  '120005': 'Money Master PSB',

  // Merchant Banks
  '060001': 'Coronation Merchant Bank',
  '060002': 'FSDH Merchant Bank',
  '060003': 'Nova Merchant Bank',
  '060004': 'Greenwich Merchant Bank',
  '060005': 'Rand Merchant Bank',

  // Mobile Money Operators & Payment Providers
  '100001': 'FET',
  '100002': 'Paga',
  '100003': 'SafeTrust',
  '100005': 'Cellulant',
  '100006': 'eTranzact',
  '100007': 'Stanbic IBTC @Ease Wallet',
  '100008': 'Ecobank Xpress Account',
  '100009': 'GTMobile',
  '100010': 'TeasyMobile',
  '100011': 'Mkudi',
  '100012': 'VTNetworks',
  '100013': 'AccessMobile',
  '100014': 'FBNMobile',
  '100015': 'Zenith Mobile',
  '100016': 'Kegow',
  '100021': 'Eartholeum',
  '100023': 'TagPay',
  '100024': 'Imperial Homes Mortgage Bank',
  '100027': 'Intellifin',
  '100030': 'EcoMobile',
  '100031': 'FCMB Easy Account',
  '100032': 'Contec Global',
  '100034': 'Zenith Easy Wallet',

  // Virtual/NIP Banks
  '999': 'NIP Virtual Bank',

  // Mortgage Banks
  '070010': 'Abbey Mortgage Bank',
  '070011': 'Refuge Mortgage Bank',
  '070012': 'Lagos Building Investment Company',
  '070013': 'Platinum Mortgage Bank',
  '070014': 'First Generation Mortgage Bank',
  '070015': 'Brent Mortgage Bank',
  '070016': 'Infinity Trust Mortgage Bank',
  '070017': 'Delta Trust Mortgage Bank',
  '070019': 'Mayfresh Mortgage Bank',
  '070021': 'Coop Mortgage Bank',
  '070022': 'STB Mortgage Bank',
  '070023': 'Delta Trust Mortgage Bank',
  '070024': 'Homebase Mortgage Bank',
  '070025': 'Akwa Savings & Loans',
  '070026': 'FHA Mortgage Bank',
  '070027': 'Trustbond Mortgage Bank',
  '070028': 'Gateway Mortgage Bank',
  '070029': 'Livingtrust Mortgage Bank',
  '070031': 'New Prudential Building Society'
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
