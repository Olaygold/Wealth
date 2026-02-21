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
  ExternalLink
} from 'lucide-react';

const Wallet = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('deposit'); // deposit, withdraw, history
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [walletData, setWalletData] = useState(null);

  // Deposit State
  const [depositAmount, setDepositAmount] = useState(1000);

  // Withdrawal State
  const [withdrawalData, setWithdrawalData] = useState({
    amount: '',
    bankCode: '058', // GTBank default
    accountNumber: '',
    accountName: ''
  });

  useEffect(() => {
    fetchWalletData();
    fetchTransactions();
  }, []);

  const fetchWalletData = async () => {
    try {
      const res = await api.get('/wallet/balance');
      setWalletData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/wallet/transactions?limit=50');
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error(err);
    }
  };

  // ========== DEPOSIT NAIRA ==========
  const handleDeposit = async () => {
    if (depositAmount < 100) {
      return toast.error('Minimum deposit is ₦100');
    }

    setLoading(true);
    try {
      const res = await api.post('/wallet/deposit/naira', { amount: depositAmount });
      
      // Redirect to Paystack payment page
      window.location.href = res.data.authorizationUrl;
      
    } catch (err) {
      toast.error(err.message || 'Failed to initiate deposit');
    } finally {
      setLoading(false);
    }
  };

  // ========== WITHDRAW NAIRA ==========
  const handleWithdraw = async (e) => {
    e.preventDefault();

    if (parseFloat(withdrawalData.amount) < 1000) {
      return toast.error('Minimum withdrawal is ₦1,000');
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

  // ========== TRANSACTION STATUS ICONS ==========
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'pending':
        return <Clock className="text-yellow-500" size={18} />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="text-red-500" size={18} />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type) => {
    if (type === 'deposit') return <ArrowDownRight className="text-green-500" size={18} />;
    if (type === 'withdrawal') return <ArrowUpRight className="text-red-500" size={18} />;
    return <WalletIcon size={18} className="text-gray-400" />;
  };

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
            <h2 className="text-4xl font-black text-white">₦{parseFloat(walletData?.nairaBalance || 0).toLocaleString()}</h2>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-3xl shadow-2xl">
            <p className="text-orange-100 text-sm uppercase tracking-wide mb-2">Locked in Bets</p>
            <h2 className="text-4xl font-black text-white">₦{parseFloat(walletData?.lockedBalance || 0).toLocaleString()}</h2>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl shadow-2xl">
            <p className="text-blue-100 text-sm uppercase tracking-wide mb-2">Available</p>
            <h2 className="text-4xl font-black text-white">₦{((walletData?.nairaBalance || 0) - (walletData?.lockedBalance || 0)).toLocaleString()}</h2>
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
        <div className="bg-slate-800/40 backdrop-blur-md rounded-3xl p-8 border border-slate-700">
          
          {/* ========== DEPOSIT TAB ========== */}
          {activeTab === 'deposit' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Deposit Naira</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">Select Amount</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[500, 1000, 5000, 10000, 50000, 100000].map(amt => (
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
                />
                <p className="text-xs text-gray-500 mt-2">Minimum: ₦100 | Maximum: ₦1,000,000</p>
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
                    <ExternalLink size={20} />
                    Proceed to Payment (Paystack)
                  </>
                )}
              </button>

              <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-sm text-blue-300">
                  ℹ️ You will be redirected to Paystack to complete your payment securely.
                </p>
              </div>
            </div>
          )}

          {/* ========== WITHDRAW TAB ========== */}
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
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Available: ₦{((walletData?.nairaBalance || 0) - (walletData?.lockedBalance || 0)).toLocaleString()}
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
                    <option value="058">GTBank</option>
                    <option value="044">Access Bank</option>
                    <option value="033">UBA</option>
                    <option value="057">Zenith Bank</option>
                    <option value="032">Union Bank</option>
                    <option value="011">First Bank</option>
                    <option value="214">FCMB</option>
                    <option value="221">Stanbic IBTC</option>
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
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
                  ⚠️ Withdrawals are processed within 24 hours. KYC verification required.
                </p>
              </div>
            </div>
          )}

          {/* ========== HISTORY TAB ========== */}
          {activeTab === 'history' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Transaction History</h2>
              
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map(tx => (
                    <div key={tx.id} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex items-center justify-between hover:bg-slate-900/70 transition">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-800 rounded-xl">
                          {getTypeIcon(tx.type)}
                        </div>
                        <div>
                          <p className="text-white font-semibold capitalize">{tx.type.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                          {tx.description && <p className="text-xs text-gray-400 mt-1">{tx.description}</p>}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className={`text-lg font-bold ${tx.type === 'deposit' || tx.type === 'bet_win' || tx.type === 'refund' ? 'text-green-500' : 'text-red-500'}`}>
                            {tx.type === 'deposit' || tx.type === 'bet_win' || tx.type === 'refund' ? '+' : '-'}₦{parseFloat(tx.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{tx.status}</p>
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
