
// pages/Wallet.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  Wallet as WalletIcon, 
  Plus, 
  Minus, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  AlertTriangle,
  Building,
  CreditCard,
  Timer,
  X,
  CheckCircle2
} from 'lucide-react';

const Wallet = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('deposit');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [walletData, setWalletData] = useState(null);

  // Deposit State
  const [depositAmount, setDepositAmount] = useState(1000);
  const [pendingDeposit, setPendingDeposit] = useState(null);
  const [depositStep, setDepositStep] = useState('amount');
  const [countdown, setCountdown] = useState(0);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Withdrawal State
  const [withdrawalData, setWithdrawalData] = useState({
    amount: '',
    bankCode: '058',
    accountNumber: '',
    accountName: ''
  });

  // Nigerian Banks List
  
  

const nigerianBanks = [
  // Commercial Banks
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank (Diamond)' },
  { code: '035A', name: 'ALAT by WEMA' },
  { code: '401', name: 'ASO Savings and Loans' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '084', name: 'Enterprise Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '302', name: 'TAJ Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '303', name: 'Lotus Bank' },
  { code: '304', name: 'Premium Trust Bank' },
  { code: '305', name: 'Parallex Bank' },
  { code: '103', name: 'Globus Bank' },
  { code: '306', name: 'Signature Bank' },
  { code: '104', name: 'Titan Trust Bank' },
  { code: '105', name: 'Optimus Bank' },

  // Digital/Mobile Banks
  { code: '090267', name: 'Kuda Microfinance Bank' },
  { code: '999992', name: 'Opay Digital Services' },
  { code: '999991', name: 'PalmPay' },
  { code: '100004', name: 'Paga' },
  { code: '100033', name: 'Moniepoint MFB' },
  { code: '090405', name: 'Moniepoint Microfinance Bank' },
  { code: '50211', name: 'Carbon' },
  { code: '090326', name: 'Sparkle Microfinance Bank' },
  { code: '100025', name: 'FairMoney Microfinance Bank' },
  { code: '090175', name: 'Rubies Microfinance Bank' },
  { code: '090110', name: 'VFD Microfinance Bank' },
  { code: '100022', name: 'GoMoney' },
  { code: '090195', name: 'Mint Finex MFB' },

  // Microfinance Banks (MFBs)
  { code: '090001', name: 'ASOSavings & Loans' },
  { code: '090270', name: 'AB Microfinance Bank' },
  { code: '090260', name: 'Above Only Microfinance Bank' },
  { code: '090197', name: 'ABU Microfinance Bank' },
  { code: '090134', name: 'Accion Microfinance Bank' },
  { code: '090160', name: 'Addosser Microfinance Bank' },
  { code: '090268', name: 'Adeyemi College Staff Microfinance Bank' },
  { code: '090292', name: 'Afekhafe Microfinance Bank' },
  { code: '090285', name: 'Affluence Microfinance Bank' },
  { code: '100028', name: 'AG Mortgage Bank' },
  { code: '090259', name: 'Alekun Microfinance Bank' },
  { code: '090297', name: 'Alert Microfinance Bank' },
  { code: '090169', name: 'Alpha Kapital Microfinance Bank' },
  { code: '090116', name: 'AMML Microfinance Bank' },
  { code: '090282', name: 'Arise Microfinance Bank' },
  { code: '090001', name: 'ASO Savings & Loans' },
  { code: '090287', name: 'Assetmatrix Microfinance Bank' },
  { code: '090172', name: 'Astrapolaris Microfinance Bank' },
  { code: '090264', name: 'Auchi Microfinance Bank' },
  { code: '090188', name: 'Baines Credit Microfinance Bank' },
  { code: '090326', name: 'Balogun Gambari Microfinance Bank' },
  { code: '090127', name: 'BC Kash Microfinance Bank' },
  { code: '090117', name: 'Boctrust Microfinance Bank' },
  { code: '090176', name: 'Bosak Microfinance Bank' },
  { code: '090308', name: 'Brightway Microfinance Bank' },
  { code: '090406', name: 'Business Support MFB' },
  { code: '090415', name: 'Calabash Microfinance Bank' },
  { code: '100026', name: 'Carbon (OneFi)' },
  { code: '090360', name: 'Cashconnect Microfinance Bank' },
  { code: '090141', name: 'CEMCS Microfinance Bank' },
  { code: '090144', name: 'CIT Microfinance Bank' },
  { code: '090374', name: 'Coastline Microfinance Bank' },
  { code: '090130', name: 'Consumer Microfinance Bank' },
  { code: '090166', name: 'Credit Afrique Microfinance Bank' },
  { code: '090167', name: 'Daylight Microfinance Bank' },
  { code: '090156', name: 'e-Barcs Microfinance Bank' },
  { code: '090097', name: 'Ekondo Microfinance Bank' },
  { code: '090273', name: 'Emerald Microfinance Bank' },
  { code: '090114', name: 'Empire Trust Microfinance Bank' },
  { code: '090179', name: 'FAST Microfinance Bank' },
  { code: '090179', name: 'Esan Microfinance Bank' },
  { code: '090304', name: 'Evangel Microfinance Bank' },
  { code: '090332', name: 'Evergreen Microfinance Bank' },
  { code: '090266', name: 'Ezee Microfinance Bank' },
  { code: '090179', name: 'Fast Microfinance Bank' },
  { code: '090153', name: 'FBN Mortgages Limited' },
  { code: '090290', name: 'FCT Microfinance Bank' },
  { code: '090126', name: 'Fidfund Microfinance Bank' },
  { code: '090111', name: 'FinaTrust Microfinance Bank' },
  { code: '090400', name: 'Finca Microfinance Bank' },
  { code: '090366', name: 'Firmus Microfinance Bank' },
  { code: '090107', name: 'First Royal Microfinance Bank' },
  { code: '090164', name: 'First Multiple Microfinance Bank' },
  { code: '090285', name: 'First Option Microfinance Bank' },
  { code: '090298', name: 'Fedeth Microfinance Bank' },
  { code: '070002', name: 'Fortis Microfinance Bank' },
  { code: '090145', name: 'Fullrange Microfinance Bank' },
  { code: '090278', name: 'FundsGate Microfinance Bank' },
  { code: '090146', name: 'Gashua Microfinance Bank' },
  { code: '090186', name: 'Gateway Mortgage Bank' },
  { code: '090122', name: 'Gowans Microfinance Bank' },
  { code: '090178', name: 'Greenbank Microfinance Bank' },
  { code: '090195', name: 'GroFin Microfinance Bank' },
  { code: '090147', name: 'Hackman Microfinance Bank' },
  { code: '090121', name: 'Haggai Mortgage Bank' },
  { code: '090363', name: 'Headway Microfinance Bank' },
  { code: '090118', name: 'IBILE Microfinance Bank' },
  { code: '090324', name: 'Ikenne Microfinance Bank' },
  { code: '090279', name: 'Ikire Microfinance Bank' },
  { code: '090370', name: 'Ilisan Microfinance Bank' },
  { code: '090258', name: 'Imo State Microfinance Bank' },
  { code: '090157', name: 'Infinity Microfinance Bank' },
  { code: '100029', name: 'Innovectives Kesh' },
  { code: '090149', name: 'IRL Microfinance Bank' },
  { code: '090377', name: 'Isaleoyo Microfinance Bank' },
  { code: '090263', name: 'Kadpoly Microfinance Bank' },
  { code: '090191', name: 'KCMB Microfinance Bank' },
  { code: '090299', name: 'Kontagora Microfinance Bank' },
  { code: '090380', name: 'Kredi Money Microfinance Bank' },
  { code: '090267', name: 'Kuda Microfinance Bank' },
  { code: '090177', name: 'Lapo Microfinance Bank' },
  { code: '090271', name: 'Lavender Microfinance Bank' },
  { code: '090372', name: 'Legend Microfinance Bank' },
  { code: '090372', name: 'Lifegate Microfinance Bank' },
  { code: '090327', name: 'Links Microfinance Bank' },
  { code: '090435', name: 'Links MFB' },
  { code: '090289', name: 'Lovonus Microfinance Bank' },
  { code: '100035', name: 'M36' },
  { code: '090323', name: 'Mainland Microfinance Bank' },
  { code: '090174', name: 'Malachy Microfinance Bank' },
  { code: '090383', name: 'Manny Microfinance Bank' },
  { code: '090410', name: 'Maritime Microfinance Bank' },
  { code: '090171', name: 'Mainstreet Microfinance Bank' },
  { code: '090321', name: 'Mayfair Microfinance Bank' },
  { code: '090280', name: 'Megapraise Microfinance Bank' },
  { code: '090113', name: 'Microvis Microfinance Bank' },
  { code: '090281', name: 'Mint Microfinance Bank' },
  { code: '090192', name: 'Midland Microfinance Bank' },
  { code: '090136', name: 'Microcred Microfinance Bank' },
  { code: '090129', name: 'Money Trust Microfinance Bank' },
  { code: '090190', name: 'Mutual Benefits Microfinance Bank' },
  { code: '090151', name: 'Mutual Trust Microfinance Bank' },
  { code: '090152', name: 'Nagarta Microfinance Bank' },
  { code: '999991', name: 'PalmPay' },
  { code: '090283', name: 'NNEW Microfinance Bank' },
  { code: '060003', name: 'Nova Merchant Bank' },
  { code: '090128', name: 'Ndiorah Microfinance Bank' },
  { code: '090108', name: 'New Prudential Bank' },
  { code: '090205', name: 'New Dawn Microfinance Bank' },
  { code: '090378', name: 'New Golden Pastures Microfinance Bank' },
  { code: '070001', name: 'NPF Microfinance Bank' },
  { code: '090364', name: 'Numo Microfinance Bank' },
  { code: '090275', name: 'Okuku Microfinance Bank' },
  { code: '090272', name: 'Olowolagba Microfinance Bank' },
  { code: '090295', name: 'Omiye Microfinance Bank' },
  { code: '090119', name: 'OPML Microfinance Bank' },
  { code: '100002', name: 'Paga' },
  { code: '311', name: 'Parkway - ReadyCash' },
  { code: '090317', name: 'PatrickGold Microfinance Bank' },
  { code: '090004', name: 'Parralex Microfinance Bank' },
  { code: '090196', name: 'Pennywise Microfinance Bank' },
  { code: '090165', name: 'Petra Microfinance Bank' },
  { code: '090135', name: 'Personal Trust Microfinance Bank' },
  { code: '090296', name: 'Pillar Microfinance Bank' },
  { code: '090137', name: 'Pecan Trust Microfinance Bank' },
  { code: '090393', name: 'Platinum Integrated MFB' },
  { code: '090005', name: 'Prestige Microfinance Bank' },
  { code: '090303', name: 'Purplemoney Microfinance Bank' },
  { code: '090261', name: 'Quickfund Microfinance Bank' },
  { code: '090198', name: 'RenMoney Microfinance Bank' },
  { code: '502', name: 'Rand Merchant Bank' },
  { code: '090322', name: 'Rephidim Microfinance Bank' },
  { code: '090132', name: 'Richway Microfinance Bank' },
  { code: '090405', name: 'Rolez Microfinance Bank' },
  { code: '090138', name: 'Royal Exchange Microfinance Bank' },
  { code: '090175', name: 'Rubies Microfinance Bank' },
  { code: '090286', name: 'Safe Haven Microfinance Bank' },
  { code: '090006', name: 'SafeTrust Microfinance Bank' },
  { code: '090325', name: 'Seedvest Microfinance Bank' },
  { code: '090369', name: 'Sherperd Trust Microfinance Bank' },
  { code: '090162', name: 'Stanford Microfinance Bank' },
  { code: '090262', name: 'Stellas Microfinance Bank' },
  { code: '090305', name: 'Sulspap Microfinance Bank' },
  { code: '090007', name: 'SunTrust Microfinance Bank' },
  { code: '090305', name: 'Support Microfinance Bank' },
  { code: '100023', name: 'TagPay' },
  { code: '090115', name: 'TCF Microfinance Bank' },
  { code: '100010', name: 'TeasyMobile' },
  { code: '090373', name: 'Think Finance Microfinance Bank' },
  { code: '090115', name: 'Trident Microfinance Bank' },
  { code: '090327', name: 'Trust Microfinance Bank' },
  { code: '090276', name: 'Trustfund Microfinance Bank' },
  { code: '090005', name: 'Trustbond Mortgage Bank' },
  { code: '090251', name: 'UNN Microfinance Bank' },
  { code: '090331', name: 'UNAAB Microfinance Bank' },
  { code: '090193', name: 'Unical Microfinance Bank' },
  { code: '090338', name: 'UniUyo Microfinance Bank' },
  { code: '110006', name: 'VFD Microfinance Bank' },
  { code: '090123', name: 'Verite Microfinance Bank' },
  { code: '090150', name: 'Virtue Microfinance Bank' },
  { code: '090139', name: 'Visa Microfinance Bank' },
  { code: '090333', name: 'Abulesoro Microfinance Bank' },
  { code: '090124', name: 'XSLNCE Microfinance Bank' },
  { code: '090142', name: 'Yes Microfinance Bank' },
  { code: '100034', name: 'Zenith Easy Wallet' },
  { code: '090140', name: 'Sagamu Microfinance Bank' },
  { code: '090328', name: 'Eyowo' },
  { code: '090315', name: 'U & C Microfinance Bank' },
  { code: '100032', name: 'Contec Global' },
  { code: '100016', name: 'Kegow' },

  // Payment Service Banks (PSB)
  { code: '120001', name: '9 Payment Service Bank (9PSB)' },
  { code: '120002', name: 'HopePSB' },
  { code: '120003', name: 'Momo PSB' },
  { code: '120004', name: 'SmartCash PSB' },
  { code: '120005', name: 'Money Master PSB' },

  // Merchant/Other Banks
  { code: '060001', name: 'Coronation Merchant Bank' },
  { code: '060002', name: 'FSDH Merchant Bank' },
  { code: '060003', name: 'Nova Merchant Bank' },
  { code: '060004', name: 'Greenwich Merchant Bank' },
  { code: '060005', name: 'Rand Merchant Bank' },

  // Mobile Money Operators
  { code: '100001', name: 'FET' },
  { code: '100003', name: 'SafeTrust' },
  { code: '100005', name: 'Cellulant' },
  { code: '100006', name: 'eTranzact' },
  { code: '100007', name: 'Stanbic IBTC @Ease Wallet' },
  { code: '100008', name: 'Ecobank Xpress Account' },
  { code: '100009', name: 'GTMobile' },
  { code: '100011', name: 'Mkudi' },
  { code: '100012', name: 'VTNetworks' },
  { code: '100013', name: 'AccessMobile' },
  { code: '100014', name: 'FBNMobile' },
  { code: '100015', name: 'Zenith Mobile' },
  { code: '100021', name: 'Eartholeum' },
  { code: '100024', name: 'Imperial Homes Mortgage Bank' },
  { code: '100027', name: 'Intellifin' },
  { code: '100030', name: 'EcoMobile' },
  { code: '100031', name: 'FCMB Easy Account' }
];
    
  useEffect(() => {
    loadInitialData();
  }, []);

  // Countdown timer for pending deposit
  useEffect(() => {
    if (pendingDeposit && pendingDeposit.expiresAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(pendingDeposit.expiresAt).getTime();
        const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
        
        setCountdown(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
          setPendingDeposit(null);
          setDepositStep('amount');
          toast.error('Deposit session expired. Please try again.');
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [pendingDeposit]);

  // Auto-check deposit status every 30 seconds
  useEffect(() => {
    if (pendingDeposit && depositStep === 'waiting') {
      const interval = setInterval(() => {
        checkDepositStatus(pendingDeposit.reference);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [pendingDeposit, depositStep]);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      await Promise.all([
        fetchWalletData(),
        fetchTransactions(),
        checkPendingDeposit()
      ]);
    } catch (err) {
      console.error('Load initial data error:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchWalletData = async () => {
    try {
      // api.get already returns response.data due to interceptor
      const response = await api.get('/wallet/balance');
      console.log('Wallet Response:', response);
      
      // Response is already { success: true, data: {...} }
      if (response.success && response.data) {
        setWalletData(response.data);
      }
    } catch (err) {
      console.error('Fetch wallet error:', err);
      toast.error(err.message || 'Failed to load wallet');
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/wallet/transactions?limit=50');
      console.log('Transactions Response:', response);
      
      if (response.success && response.data && response.data.transactions) {
        setTransactions(response.data.transactions);
      }
    } catch (err) {
      console.error('Fetch transactions error:', err);
    }
  };

  const checkPendingDeposit = async () => {
    try {
      const response = await api.get('/wallet/deposit/pending');
      console.log('Pending Deposit Response:', response);
      
      if (response.success && response.data) {
        setPendingDeposit(response.data);
        setDepositStep('payment');
      }
    } catch (err) {
      // Silent fail - it's normal to not have a pending deposit
      console.log('No pending deposit');
    }
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleDeposit = async () => {
    if (depositAmount < 100) {
      return toast.error('Minimum deposit is ₦100');
    }

    if (depositAmount > 5000000) {
      return toast.error('Maximum deposit is ₦5,000,000');
    }

    setLoading(true);
    try {
      const response = await api.post('/wallet/deposit/naira', { amount: depositAmount });
      console.log('Deposit Response:', response);
      
      if (response.success && response.data) {
        setPendingDeposit(response.data);
        setDepositStep('payment');
        toast.success('Deposit initiated! Transfer to the account below.');
      }
    } catch (err) {
      console.error('Deposit error:', err);
      toast.error(err.message || 'Failed to initiate deposit');
    } finally {
      setLoading(false);
    }
  };

  const checkDepositStatus = async (reference) => {
    if (!reference) return;
    
    setCheckingStatus(true);
    try {
      const response = await api.get(`/wallet/deposit/status/${reference}`);
      console.log('Status Response:', response);
      
      if (response.success && response.data) {
        const data = response.data;

        if (data.status === 'completed') {
          toast.success('🎉 Deposit confirmed! Your wallet has been credited.');
          setPendingDeposit(null);
          setDepositStep('amount');
          fetchWalletData();
          fetchTransactions();
        } else if (data.status === 'expired' || data.isExpired) {
          toast.error('Deposit session expired. Please try again.');
          setPendingDeposit(null);
          setDepositStep('amount');
        } else if (data.status === 'cancelled') {
          toast.error('Deposit was cancelled.');
          setPendingDeposit(null);
          setDepositStep('amount');
        }
      }
    } catch (err) {
      console.error('Check status error:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const cancelDeposit = async () => {
    if (!pendingDeposit?.reference) return;

    if (!window.confirm('Are you sure you want to cancel this deposit?')) return;

    setLoading(true);
    try {
      await api.post(`/wallet/deposit/cancel/${pendingDeposit.reference}`);
      toast.success('Deposit cancelled');
      setPendingDeposit(null);
      setDepositStep('amount');
    } catch (err) {
      toast.error(err.message || 'Failed to cancel deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferMade = () => {
    setDepositStep('waiting');
    toast.success('Great! We are checking for your payment...');
    if (pendingDeposit?.reference) {
      checkDepositStatus(pendingDeposit.reference);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();

    if (parseFloat(withdrawalData.amount) < 1000) {
      return toast.error('Minimum withdrawal is ₦1,000');
    }

    const available = (walletData?.nairaBalance || 0) - (walletData?.lockedBalance || 0);
    if (parseFloat(withdrawalData.amount) > available) {
      return toast.error('Insufficient balance');
    }

    if (!withdrawalData.accountNumber || withdrawalData.accountNumber.length !== 10) {
      return toast.error('Please enter a valid 10-digit account number');
    }

    if (!withdrawalData.accountName) {
      return toast.error('Please enter account name');
    }

    setLoading(true);
    try {
      await api.post('/wallet/withdraw', withdrawalData);
      toast.success('Withdrawal request submitted! Processing within 24 hours.');
      setWithdrawalData({ amount: '', bankCode: '058', accountNumber: '', accountName: '' });
      fetchTransactions();
      fetchWalletData();
    } catch (err) {
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalChange = (e) => {
    setWithdrawalData({ ...withdrawalData, [e.target.name]: e.target.value });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'pending':
        return <Clock className="text-yellow-500" size={18} />;
      case 'failed':
      case 'cancelled':
      case 'expired':
        return <XCircle className="text-red-500" size={18} />;
      case 'unmatched':
        return <AlertTriangle className="text-orange-500" size={18} />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type) => {
    if (type === 'deposit') return <ArrowDownRight className="text-green-500" size={18} />;
    if (type === 'withdrawal') return <ArrowUpRight className="text-red-500" size={18} />;
    if (type === 'bet_win' || type === 'refund') return <ArrowDownRight className="text-green-500" size={18} />;
    if (type === 'bet_placed' || type === 'bet_lost') return <ArrowUpRight className="text-red-500" size={18} />;
    return <WalletIcon size={18} className="text-gray-400" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'pending': return 'text-yellow-500';
      case 'failed':
      case 'cancelled':
      case 'expired': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darker p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <WalletIcon className="text-primary" /> My Wallet
          </h1>
          <p className="text-gray-400 mt-2">Manage your funds</p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-3xl shadow-2xl">
            <p className="text-green-100 text-sm uppercase tracking-wide mb-2">Total Balance</p>
            <h2 className="text-4xl font-black text-white">
              ₦{walletData?.nairaBalance 
                ? parseFloat(walletData.nairaBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })
                : '0.00'}
            </h2>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-3xl shadow-2xl">
            <p className="text-orange-100 text-sm uppercase tracking-wide mb-2">Locked in Bets</p>
            <h2 className="text-4xl font-black text-white">
              ₦{walletData?.lockedBalance 
                ? parseFloat(walletData.lockedBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })
                : '0.00'}
            </h2>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl shadow-2xl">
            <p className="text-blue-100 text-sm uppercase tracking-wide mb-2">Available</p>
            <h2 className="text-4xl font-black text-white">
              ₦{walletData 
                ? (parseFloat(walletData.nairaBalance || 0) - parseFloat(walletData.lockedBalance || 0)).toLocaleString('en-NG', { minimumFractionDigits: 2 })
                : '0.00'}
            </h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-slate-800/40 p-2 rounded-2xl border border-slate-700">
          <button 
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === 'deposit' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <Plus size={18} className="inline mr-2" /> Deposit
          </button>
          <button 
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === 'withdraw' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <Minus size={18} className="inline mr-2" /> Withdraw
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === 'history' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <Clock size={18} className="inline mr-2" /> History
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800/40 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-slate-700">
          
          {/* DEPOSIT TAB */}
          {activeTab === 'deposit' && (
            <div>
              {/* STEP 1: SELECT AMOUNT */}
              {depositStep === 'amount' && (
                <>
                  <h2 className="text-2xl font-bold text-white mb-6">Deposit Naira</h2>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-3">Select Amount</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {[500, 1000, 2000, 5000, 10000, 50000].map(amt => (
                        <button 
                          key={amt}
                          onClick={() => setDepositAmount(amt)}
                          className={`py-3 rounded-xl font-bold transition-all ${depositAmount === amt ? 'bg-primary text-white scale-105 shadow-lg' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                        >
                          ₦{amt.toLocaleString()}
                        </button>
                      ))}
                    </div>

                    <label className="block text-sm font-medium text-gray-300 mb-2">Or Enter Custom Amount</label>
                    <input 
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter amount"
                      min="100"
                      max="5000000"
                    />
                    <p className="text-xs text-gray-500 mt-2">Minimum: ₦100 | Maximum: ₦5,000,000</p>
                  </div>

                  <button 
                    onClick={handleDeposit}
                    disabled={loading || depositAmount < 100}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={20} />
                        Continue to Payment
                      </>
                    )}
                  </button>

                  <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <p className="text-sm text-blue-300">
                      ℹ️ You'll receive a virtual account number. Transfer to it, and your wallet will be credited automatically within 2 minutes.
                    </p>
                  </div>
                </>
              )}

              {/* STEP 2: PAYMENT DETAILS */}
              {depositStep === 'payment' && pendingDeposit && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Complete Your Deposit</h2>
                    <button 
                      onClick={cancelDeposit}
                      disabled={loading}
                      className="text-gray-400 hover:text-red-500 transition"
                      title="Cancel deposit"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Countdown Timer */}
                  {countdown > 0 && (
                    <div className={`flex items-center justify-center gap-2 mb-6 p-3 rounded-xl ${countdown < 300 ? 'bg-red-500/20 border border-red-500/50' : 'bg-yellow-500/20 border border-yellow-500/50'}`}>
                      <Timer size={20} className={countdown < 300 ? 'text-red-400' : 'text-yellow-400'} />
                      <span className={`font-mono text-xl font-bold ${countdown < 300 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {formatCountdown(countdown)}
                      </span>
                      <span className={`text-sm ${countdown < 300 ? 'text-red-300' : 'text-yellow-300'}`}>
                        remaining
                      </span>
                    </div>
                  )}

                  {/* Bank Account Details Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-primary/20 rounded-xl">
                        <Building className="text-primary" size={24} />
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Transfer to</p>
                        <p className="text-white font-bold text-lg">{pendingDeposit.bankName}</p>
                      </div>
                    </div>

                    {/* Account Number */}
                    <div className="bg-slate-800/80 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Account Number</p>
                          <p className="text-white text-2xl font-mono font-bold tracking-wider">
                            {pendingDeposit.accountNumber}
                          </p>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(pendingDeposit.accountNumber, 'Account number')}
                          className="p-3 bg-primary/20 hover:bg-primary/30 rounded-xl transition"
                        >
                          <Copy className="text-primary" size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Account Name */}
                    <div className="bg-slate-800/80 rounded-xl p-4 mb-4">
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Account Name</p>
                      <p className="text-white text-lg font-semibold">
                        {pendingDeposit.accountName}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-300 text-xs uppercase tracking-wide">Amount to Transfer</p>
                          <p className="text-green-400 text-3xl font-black">
                            ₦{parseFloat(pendingDeposit.amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(parseFloat(pendingDeposit.amount).toFixed(2), 'Amount')}
                          className="p-3 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition"
                        >
                          <Copy className="text-green-400" size={20} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={20} />
                      <div className="text-sm text-red-300 space-y-1">
                        <p className="font-semibold">Important:</p>
                        <ul className="list-disc list-inside space-y-1 text-red-200">
                          <li>Transfer <strong>EXACTLY ₦{parseFloat(pendingDeposit.amount).toFixed(2)}</strong> (including kobo)</li>
                          <li>Use your personal bank account only</li>
                          <li>Complete transfer before timer expires</li>
                          <li>Incorrect amount may delay your deposit</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={cancelDeposit}
                      disabled={loading}
                      className="bg-slate-700 text-gray-300 font-bold py-4 rounded-xl hover:bg-slate-600 transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleTransferMade}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={20} />
                      I've Made Transfer
                    </button>
                  </div>
                </>
              )}

              {/* STEP 3: WAITING FOR CONFIRMATION */}
              {depositStep === 'waiting' && pendingDeposit && (
                <>
                  <div className="text-center py-8">
                    <div className="w-20 h-20 mx-auto mb-6 relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                      <div className="relative w-full h-full bg-primary/30 rounded-full flex items-center justify-center">
                        <RefreshCw className="text-primary animate-spin" size={32} />
                      </div>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">Waiting for Payment</h2>
                    <p className="text-gray-400 mb-6">
                      We're checking for your transfer. This usually takes 1-2 minutes.
                    </p>

                    {/* Countdown */}
                    {countdown > 0 && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-xl mb-6">
                        <Timer size={18} className="text-yellow-400" />
                        <span className="font-mono text-yellow-400 font-bold">{formatCountdown(countdown)}</span>
                      </div>
                    )}

                    {/* Transfer Details Summary */}
                    <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Account</p>
                          <p className="text-white font-mono">{pendingDeposit.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Bank</p>
                          <p className="text-white">{pendingDeposit.bankName}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Amount</p>
                          <p className="text-green-400 font-bold">₦{parseFloat(pendingDeposit.amount).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Reference</p>
                          <p className="text-white font-mono text-xs">{pendingDeposit.reference}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <button 
                        onClick={() => checkDepositStatus(pendingDeposit.reference)}
                        disabled={checkingStatus}
                        className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/80 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {checkingStatus ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <RefreshCw size={18} />
                        )}
                        Check Status
                      </button>
                      <button 
                        onClick={() => setDepositStep('payment')}
                        className="flex-1 bg-slate-700 text-gray-300 font-bold py-3 rounded-xl hover:bg-slate-600 transition"
                      >
                        View Details
                      </button>
                    </div>

                    <button 
                      onClick={cancelDeposit}
                      disabled={loading}
                      className="mt-4 text-red-400 text-sm hover:text-red-300 transition"
                    >
                      Cancel this deposit
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* WITHDRAW TAB */}
          {activeTab === 'withdraw' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Withdraw to Bank Account</h2>
              
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount (₦)</label>
                  <input 
                    type="number"
                    name="amount"
                    value={withdrawalData.amount}
                    onChange={handleWithdrawalChange}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter withdrawal amount"
                    min="1000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Available: ₦{walletData ? (parseFloat(walletData.nairaBalance || 0) - parseFloat(walletData.lockedBalance || 0)).toLocaleString() : '0.00'} | Minimum: ₦1,000
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bank</label>
                  <select 
                    name="bankCode"
                    value={withdrawalData.bankCode}
                    onChange={handleWithdrawalChange}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    {nigerianBanks.map(bank => (
                      <option key={bank.code} value={bank.code}>{bank.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Account Number</label>
                  <input 
                    type="text"
                    name="accountNumber"
                    value={withdrawalData.accountNumber}
                    onChange={handleWithdrawalChange}
                    maxLength="10"
                    pattern="[0-9]{10}"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0123456789"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Account Name</label>
                  <input 
                    type="text"
                    name="accountName"
                    value={withdrawalData.accountName}
                    onChange={handleWithdrawalChange}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold py-4 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowUpRight size={20} />
                      Request Withdrawal
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-sm text-yellow-300">
                  ⚠️ Withdrawals are processed within 24 hours. Make sure your account details are correct.
                </p>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Transaction History</h2>
                <button 
                  onClick={() => {
                    fetchTransactions();
                    toast.success('Refreshed');
                  }}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                  title="Refresh"
                >
                  <RefreshCw size={18} className="text-gray-400" />
                </button>
              </div>
              
              {!transactions || transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex items-center justify-between hover:bg-slate-900/70 transition">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-800 rounded-xl">
                          {getTypeIcon(tx.type)}
                        </div>
                        <div>
                          <p className="text-white font-semibold capitalize">{tx.type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                          {tx.description && (
                            <p className="text-xs text-gray-400 mt-1 max-w-[200px] truncate">{tx.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className={`text-lg font-bold ${['deposit', 'bet_win', 'refund'].includes(tx.type) ? 'text-green-500' : 'text-red-500'}`}>
                            {['deposit', 'bet_win', 'refund'].includes(tx.type) ? '+' : '-'}₦{parseFloat(tx.amount).toLocaleString()}
                          </p>
                          <p className={`text-xs capitalize ${getStatusColor(tx.status)}`}>{tx.status}</p>
                        </div>
                        {getStatusIcon(tx.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default Wallet;
