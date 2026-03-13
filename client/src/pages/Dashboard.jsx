
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { createChart, ColorType } from 'lightweight-charts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet as WalletIcon,
  ChevronRight,
  ChevronLeft,
  Activity,
  AlertCircle,
  Calendar,
  DollarSign,
  Timer,
  Trophy,
  HelpCircle,
  X,
  CheckCircle,
  Info,
  Zap,
  Target,
  Shield,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  TrendingUp as TrendUp,
  Users,
  Gift,
  Share2,
  Sparkles,
  Star,
  ExternalLink,
  Lock,
  Play,
  Eye
} from 'lucide-react';

// ==================== HELPER FUNCTIONS ====================
const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const formatCurrency = (amount) => {
  return parseFloat(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ==================== REFERRAL PROMO POPUP ====================
const ReferralPromoPopup = ({ isOpen, onClose, onGoToReferral }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-3xl w-full max-w-md border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20 animate-in zoom-in-95 duration-300 my-8">
        
        <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-6 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')]"></div>
          </div>
          
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white transition z-10 bg-white/10 rounded-full p-2 hover:bg-white/20"
          >
            <X size={20} />
          </button>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce shadow-xl">
              <Gift className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-1">
              🎁 Earn 25% Commission!
            </h2>
            <p className="text-white/90 text-sm">
              Don't miss out on FREE money!
            </p>
          </div>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          <div className="text-center mb-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              Refer friends and earn <span className="text-green-400 font-black text-lg">25% commission</span> from their <span className="text-yellow-400 font-bold">first bet!</span>
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Sparkles className="text-green-400" size={16} />
                </div>
                <p className="text-gray-300 text-sm">
                  <span className="text-white font-bold">Easy Money:</span> Share & get paid!
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Users className="text-purple-400" size={16} />
                </div>
                <p className="text-gray-300 text-sm">
                  <span className="text-white font-bold">Unlimited:</span> No cap on earnings!
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <Zap className="text-orange-400" size={16} />
                </div>
                <p className="text-gray-300 text-sm">
                  <span className="text-white font-bold">Instant:</span> Auto-credited!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/40 rounded-xl p-3 mb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="text-yellow-400" size={16} />
              <span className="text-yellow-400 font-bold text-sm">LIMITED TIME!</span>
              <Star className="text-yellow-400" size={16} />
            </div>
            <p className="text-yellow-300 text-xs">
              More referrals = More earnings!
            </p>
          </div>

          <button
            onClick={onGoToReferral}
            className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white rounded-xl font-black text-base transition-all transform hover:scale-[1.02] shadow-xl shadow-purple-500/30 flex items-center justify-center gap-2"
          >
            <Gift size={20} />
            Start Referring Now!
            <ExternalLink size={16} />
          </button>

          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-gray-400 hover:text-white transition text-sm"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== REFERRAL SLIDE-UP BANNER ====================
const ReferralBanner = ({ onGoToReferral, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 px-4 animate-in slide-in-from-bottom-10 duration-500">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-1 rounded-2xl shadow-2xl shadow-purple-500/40">
          <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                  <Gift className="text-white" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm sm:text-base truncate">
                    🎁 Earn 25% Commission Per Referral!
                  </h3>
                  <p className="text-gray-300 text-xs sm:text-sm truncate">
                    Invite friends & earn from their first bet
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={onGoToReferral}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-sm transition whitespace-nowrap shadow-lg"
                >
                  Refer Now
                </button>
                <button
                  onClick={() => {
                    setIsVisible(false);
                    onDismiss();
                  }}
                  className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== FLOATING REFERRAL BUTTON ====================
const FloatingReferralButton = ({ onClick }) => {
  const [isPulsing, setIsPulsing] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 3000);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-28 right-4 lg:bottom-8 lg:right-8 z-30 group ${isPulsing ? 'animate-bounce' : ''}`}
      title="Refer Friends & Earn 25%"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="relative w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/50 group-hover:scale-110 transition-transform border-2 border-white/20">
          <Gift className="text-white" size={28} />
        </div>

        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
          <span className="text-white text-xs font-black">$</span>
        </div>

        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-800 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
          Earn 25% Commission!
          <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-slate-800"></div>
        </div>
      </div>
    </button>
  );
};

// ==================== FLOATING SUPPORT BUTTON ====================
const FloatingSupportButton = () => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <a
      href="https://t.me/Iacafevtu1"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-28 left-4 lg:bottom-8 lg:left-8 z-30 group"
      title="Contact Support"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
        
        <div className="relative w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 group-hover:scale-110 transition-transform border-2 border-white/20">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
          </svg>
        </div>

        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
          <span className="text-white text-[10px] font-black">?</span>
        </div>

        <div className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-800 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-xl transition-opacity ${showTooltip ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          💬 Need Help? Chat with us!
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-slate-800"></div>
        </div>
      </div>
    </a>
  );
};

// ==================== PROFESSIONAL TRADING CHART ====================
const TradingChart = ({ priceHistory, startPrice, currentPrice, isLocked = false }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLineRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1e293b', style: 1 },
        horzLines: { color: '#1e293b', style: 1 },
      },
      width: chartContainerRef.current.clientWidth,
      height: 220,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#334155',
        rightOffset: 5,
        barSpacing: 10,
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    });

    const areaSeries = chart.addAreaSeries({
      lineColor: isLocked ? '#f59e0b' : '#6366f1',
      topColor: isLocked ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.4)',
      bottomColor: isLocked ? 'rgba(245, 158, 11, 0.0)' : 'rgba(99, 102, 241, 0.0)',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [isLocked]);

  useEffect(() => {
    if (!seriesRef.current || !startPrice || startPrice <= 0) return;

    if (priceLineRef.current) {
      seriesRef.current.removePriceLine(priceLineRef.current);
    }

    priceLineRef.current = seriesRef.current.createPriceLine({
      price: startPrice,
      color: '#f59e0b',
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Start',
    });
  }, [startPrice]);

  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return;

    const now = Math.floor(Date.now() / 1000);
    const chartData = priceHistory.map((item, index) => ({
      time: now - (priceHistory.length - index - 1) * 5,
      value: item.price,
    }));

    seriesRef.current.setData(chartData);

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [priceHistory]);

  return (
    <div className="relative">
      <div 
        ref={chartContainerRef} 
        className="w-full h-[220px] rounded-xl overflow-hidden"
      />
      {priceHistory.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-xl">
          <div className="text-center">
            <Activity className="w-8 h-8 text-primary animate-pulse mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Loading chart data...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== LIVE POOL INDICATOR ====================
const LivePoolIndicator = ({ totalUp, totalDown, upBets, downBets, isLocked = false }) => {
  const total = totalUp + totalDown;
  const upPercent = total > 0 ? (totalUp / total) * 100 : 50;
  const downPercent = total > 0 ? (totalDown / total) * 100 : 50;

  return (
    <div className="bg-slate-900/50 rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-white font-bold flex items-center gap-2">
          <Users size={16} className="text-primary" />
          {isLocked ? 'Final Pool Distribution' : 'Live Pool Distribution'}
        </span>
        {!isLocked && (
          <span className="text-xs text-green-500 font-bold flex items-center gap-1 animate-pulse">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            LIVE
          </span>
        )}
      </div>
      
      <div className="h-4 bg-slate-700 rounded-full overflow-hidden flex mb-3">
        <div 
          className="bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500 ease-out flex items-center justify-center"
          style={{ width: `${upPercent}%` }}
        >
          {upPercent > 15 && (
            <span className="text-[10px] text-white font-bold">{upPercent.toFixed(0)}%</span>
          )}
        </div>
        <div 
          className="bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500 ease-out flex items-center justify-center"
          style={{ width: `${downPercent}%` }}
        >
          {downPercent > 15 && (
            <span className="text-[10px] text-white font-bold">{downPercent.toFixed(0)}%</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between bg-green-500/10 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-green-500" size={18} />
            <div>
              <p className="text-green-500 font-bold">UP</p>
              <p className="text-xs text-gray-400">{upBets} bets</p>
            </div>
          </div>
          <p className="text-green-500 font-black text-lg">₦{formatCurrency(totalUp)}</p>
        </div>
        <div className="flex items-center justify-between bg-red-500/10 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingDown className="text-red-500" size={18} />
            <div>
              <p className="text-red-500 font-bold">DOWN</p>
              <p className="text-xs text-gray-400">{downBets} bets</p>
            </div>
          </div>
          <p className="text-red-500 font-black text-lg">₦{formatCurrency(totalDown)}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700 text-center">
        <span className="text-gray-400 text-sm">Total Pool: </span>
        <span className="text-white font-black text-lg">₦{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

// ==================== USER GUIDE MODAL ====================
const UserGuideModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <Target className="w-12 h-12 text-primary" />,
      title: "Welcome to Wealth Trading! 🎯",
      content: "Predict if Bitcoin price will go UP ⬆️ or DOWN ⬇️ in the next 5 minutes and win big!",
      tip: "It's simple - just pick a direction and place your bet!"
    },
    {
      icon: <Clock className="w-12 h-12 text-blue-500" />,
      title: "How Rounds Work ⏰",
      content: "Each round lasts 5 minutes:\n• Active Round: Place your bets\n• Round Ends: Results shown instantly\n• New Round: Starts immediately!\n\nThere's always an active round to bet on!",
      tip: "Watch the countdown timer - place your bets before time runs out!"
    },
    {
      icon: <DollarSign className="w-12 h-12 text-green-500" />,
      title: "Placing a Bet 💰",
      content: "1. Select your bet amount (min ₦100)\n2. Check the potential payout\n3. Click PREDICT UP or PREDICT DOWN\n4. Wait for the round to end!",
      tip: "The potential payout updates in real-time based on the pool!"
    },
    {
      icon: <Trophy className="w-12 h-12 text-yellow-500" />,
      title: "Winning & Payouts 🏆",
      content: "If your prediction is correct:\n• You get your bet back\n• Plus 70% of the losing pool!\n\nThe more opponents, the higher your potential win!",
      tip: "No opponents = Full refund if you win"
    },
    {
      icon: <Zap className="w-12 h-12 text-orange-500" />,
      title: "Understanding Multipliers 📊",
      content: "The multiplier shows your potential return:\n• 1.5x = ₦1000 bet wins ₦1500\n• 2.0x = ₦1000 bet wins ₦2000\n\nMultiplier changes as more bets come in!",
      tip: "Higher multiplier = More profit if you win!"
    },
    {
      icon: <Eye className="w-12 h-12 text-amber-500" />,
      title: "View Last Round Results 📊",
      content: "After each round ends:\n• See the locked round with results\n• View the price chart\n• See who won (UP or DOWN)\n\nSwipe left to see the last completed round!",
      tip: "Learn from past rounds to improve your strategy!"
    },
    {
      icon: <Gift className="w-12 h-12 text-purple-500" />,
      title: "Refer & Earn 25% 🎁",
      content: "Invite friends and earn 25% commission from their FIRST bet!\n\n• Share your referral link\n• They sign up & place first bet\n• You earn 25% instantly!",
      tip: "Unlimited referrals = Unlimited earnings!"
    },
    {
      icon: <Shield className="w-12 h-12 text-purple-500" />,
      title: "Fair System Rules 📋",
      content: "• No upfront fees - full amount goes to pool\n• 30% fee only from LOSERS' pool\n• Winners share 70% of losers' pool\n• Tie = Full refund to everyone",
      tip: "Trade responsibly and only bet what you can afford!"
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl max-w-md w-full border border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-primary to-purple-600 p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
          >
            <X size={24} />
          </button>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {steps[currentStep].icon}
          </div>
          <h2 className="text-2xl font-bold text-white">{steps[currentStep].title}</h2>
        </div>

        <div className="p-6">
          <p className="text-gray-300 whitespace-pre-line text-center mb-4 leading-relaxed">
            {steps[currentStep].content}
          </p>
          
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
            <Info className="text-primary flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-primary">{steps[currentStep].tip}</p>
          </div>
        </div>

        <div className="flex justify-center gap-2 pb-4">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep ? 'w-8 bg-primary' : 'w-2 bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition"
            >
              ← Back
            </button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} />
              Start Trading!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD COMPONENT ====================
const Dashboard = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  // ========== ALL STATES ==========
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceHistory, setPriceHistory] = useState([]);
  const [lockedRound, setLockedRound] = useState(null); // ✅ NEW: Last completed round with results
  const [activeRound, setActiveRound] = useState(null); // ✅ Current betting round
  const [upcomingRound, setUpcomingRound] = useState(null);
  const [activeSlide, setActiveSlide] = useState(1); // Default to active round
  const [betAmount, setBetAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myActiveBets, setMyActiveBets] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [roundStartPrice, setRoundStartPrice] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ========== REFERRAL PROMO STATES ==========
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [showReferralBanner, setShowReferralBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // ========== CALCULATED VALUES ==========
  const walletBalance = parseFloat(walletData?.nairaBalance || 0);
  const lockedBalance = parseFloat(walletData?.lockedBalance || 0);
  const availableBalance = roundToTwo(walletBalance - lockedBalance);
  const priceChange = roundStartPrice > 0 ? ((currentPrice - roundStartPrice) / roundStartPrice) * 100 : 0;
  const canBet = activeRound?.status === 'active' && timeLeft >= 10;

  // ========== NAVIGATE TO REFERRAL PAGE ==========
  const goToReferralPage = () => {
    setShowReferralPopup(false);
    setShowReferralBanner(false);
    navigate('/referrals');
  };

  // ========== SMART REFERRAL POPUP TIMING ==========
  useEffect(() => {
    if (!user) return;

    const lastPopupTime = localStorage.getItem('lastReferralPromoTime');
    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000;

    if (!lastPopupTime || (now - parseInt(lastPopupTime)) > sixHours) {
      const timer = setTimeout(() => {
        setShowReferralPopup(true);
        localStorage.setItem('lastReferralPromoTime', now.toString());
      }, 15000);

      return () => clearTimeout(timer);
    } else {
      const oneHour = 60 * 60 * 1000;
      if ((now - parseInt(lastPopupTime)) > oneHour && !bannerDismissed) {
        setTimeout(() => {
          setShowReferralBanner(true);
        }, 30000);
      }
    }
  }, [user, bannerDismissed]);

  // ========== SHOW POPUP AFTER BIG WIN ==========
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleBetResult = (data) => {
      fetchMyBets();
      fetchWalletData();
      
      if (data.result === 'win') {
        toast.success(`🎉 You WON ₦${data.payout?.toLocaleString()}! (${data.multiplier}x)`, { duration: 5000 });
        
        if (data.payout > 2000) {
          setTimeout(() => {
            setShowReferralPopup(true);
            toast('🎁 Share your success! Refer friends & earn 25%!', {
              duration: 5000,
              icon: '💰'
            });
          }, 4000);
        }
      } else if (data.result === 'loss') {
        toast.error(`😢 You lost ₦${Math.abs(data.profit || data.amount)?.toLocaleString()}`, { duration: 4000 });
      } else if (data.result === 'refund') {
        toast.success(`🔄 Refunded ₦${data.payout?.toLocaleString()}`, { duration: 4000 });
      }
    };

    socket.on('bet_result', handleBetResult);

    return () => {
      socket.off('bet_result', handleBetResult);
    };
  }, [socket, isConnected]);

  // ========== MULTIPLIER CALCULATION (INCLUDING USER'S BET) ==========
  const calculatePotentialPayout = useCallback((prediction) => {
    if (!activeRound || betAmount <= 0) {
      return { 
        payout: 0, 
        profit: 0, 
        multiplier: 1.7, 
        hasOpponents: false,
        message: 'Enter bet amount'
      };
    }

    let totalUp = parseFloat(activeRound.totalUpAmount || 0);
    let totalDown = parseFloat(activeRound.totalDownAmount || 0);

    if (prediction === 'up') {
      totalUp += betAmount;
    } else {
      totalDown += betAmount;
    }

    const hasOpponents = prediction === 'up' ? totalDown > 0 : totalUp > 0;

    if (!hasOpponents) {
      return {
        payout: betAmount,
        profit: 0,
        multiplier: 1.0,
        hasOpponents: false,
        message: 'Refund if you win (no opponents yet)'
      };
    }

    let multiplier;
    if (prediction === 'up') {
      multiplier = roundToTwo(1 + (totalDown * 0.7) / totalUp);
    } else {
      multiplier = roundToTwo(1 + (totalUp * 0.7) / totalDown);
    }

    const payout = roundToTwo(betAmount * multiplier);
    const profit = roundToTwo(payout - betAmount);

    return {
      payout,
      profit,
      multiplier,
      hasOpponents: true,
      message: null
    };
  }, [activeRound, betAmount]);

  // ========== GET CURRENT POOL MULTIPLIER (WITHOUT USER'S BET) ==========
  const getCurrentMultiplier = useCallback((prediction) => {
    if (!activeRound) return { value: 1.7, display: '~1.7x' };

    const totalUp = parseFloat(activeRound.totalUpAmount || 0);
    const totalDown = parseFloat(activeRound.totalDownAmount || 0);

    if (totalUp === 0 && totalDown === 0) {
      return { value: 1.7, display: '~1.7x' };
    }

    if (prediction === 'up') {
      if (totalUp === 0 || totalDown === 0) {
        return { value: 1.0, display: totalDown === 0 ? 'N/A' : '~1.7x' };
      }
      const mult = roundToTwo(1 + (totalDown * 0.7) / totalUp);
      return { value: mult, display: `${mult}x` };
    } else {
      if (totalDown === 0 || totalUp === 0) {
        return { value: 1.0, display: totalUp === 0 ? 'N/A' : '~1.7x' };
      }
      const mult = roundToTwo(1 + (totalUp * 0.7) / totalDown);
      return { value: mult, display: `${mult}x` };
    }
  }, [activeRound]);

  // ========== CHECK FIRST VISIT FOR GUIDE ==========
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenTradingGuide');
    if (!hasSeenGuide && user) {
      setShowGuide(true);
      localStorage.setItem('hasSeenTradingGuide', 'true');
    }
  }, [user]);

  // ========== INITIALIZE DASHBOARD ==========
  useEffect(() => {
    if (user) {
      initDashboard();
    }
  }, [user]);

  const initDashboard = async () => {
    setDataLoading(true);
    
    try {
      await Promise.all([
        fetchWalletData(),
        fetchAllRounds(),
        fetchCurrentPrice(),
        fetchMyBets()
      ]);
    } catch (err) {
      console.error('Dashboard init error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // ========== AUTO-REFRESH DATA EVERY 3 SECONDS ==========
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchAllRounds();
      fetchMyBets();
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  // ========== REFRESH ALL DATA ==========
  const handleRefresh = async () => {
    setRefreshing(true);
    await initDashboard();
    setRefreshing(false);
    toast.success('Data refreshed!');
  };

  // ========== FETCH WALLET DATA ==========
  const fetchWalletData = async () => {
    try {
      const data = await api.get('/wallet/balance');
      if (data?.data) {
        setWalletData(data.data);
      } else if (data?.nairaBalance !== undefined) {
        setWalletData(data);
      } else {
        setWalletData(data);
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
    }
  };

  // ========== FETCH ALL ROUNDS - UPDATED FOR NEW FLOW ==========
  const fetchAllRounds = async () => {
    try {
      const data = await api.get('/trading/rounds/all');

      if (data) {
        // ✅ NEW: Set locked round (last completed with results)
        setLockedRound(data.lockedRound || data.previousRound || null);
        
        // ✅ Set active round (current betting round)
        setActiveRound(data.activeRound || data.currentRound || null);
        
        // ✅ Set upcoming round
        setUpcomingRound(data.upcomingRound || null);

        // ✅ Set start price from active round
        if (data.activeRound?.startPrice || data.currentRound?.startPrice) {
          setRoundStartPrice(parseFloat(data.activeRound?.startPrice || data.currentRound?.startPrice));
        }
      }
    } catch (err) {
      console.error('Rounds fetch error:', err);
    }
  };

  // ========== FETCH CURRENT PRICE ==========
  const fetchCurrentPrice = async () => {
    try {
      const data = await api.get('/trading/current-price');
      const price = data?.price;
      if (price) {
        setCurrentPrice(parseFloat(price));
        setPriceHistory(prev => {
          const newEntry = {
            time: Date.now(),
            price: parseFloat(price)
          };
          return [...prev.slice(-59), newEntry];
        });
      }
    } catch (err) {
      console.error('Price fetch error:', err);
    }
  };

  // ========== FETCH MY BETS ==========
  const fetchMyBets = async () => {
    try {
      const data = await api.get('/trading/my-bets/active');
      setMyActiveBets(data?.activeBets || []);
    } catch (err) {
      console.error('Bets fetch error:', err);
      setMyActiveBets([]);
    }
  };

  // ========== SOCKET LISTENERS - UPDATED FOR NEW FLOW ==========
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Price updates
    socket.on('price_update', (data) => {
      if (data?.price) {
        const price = parseFloat(data.price);
        setCurrentPrice(price);
        setPriceHistory(prev => {
          const newEntry = {
            time: Date.now(),
            price: price
          };
          return [...prev.slice(-59), newEntry];
        });
      }
    });

    // Bet placed by ANY user - Update pool instantly
    socket.on('bet_placed', (data) => {
      console.log('🎰 New bet placed:', data);
      
      setActiveRound(prev => {
        if (!prev || prev.id !== data.roundId) return prev;
        return {
          ...prev,
          totalUpAmount: data.totalUpAmount,
          totalDownAmount: data.totalDownAmount,
          totalUpBets: data.totalUpBets,
          totalDownBets: data.totalDownBets,
          upMultiplier: data.upMultiplier,
          downMultiplier: data.downMultiplier
        };
      });
    });

    // ✅ NEW: Round started - New active round
    socket.on('round_start', (data) => {
      console.log('🚀 Round started:', data);
      fetchAllRounds();
      fetchMyBets();
      if (data.startPrice) {
        setRoundStartPrice(parseFloat(data.startPrice));
      }
      setPriceHistory([]); // Clear chart for new round
      toast.success(`🚀 Round #${data.roundNumber} Started! Place your bets!`, { duration: 3000 });
      setActiveSlide(1); // Switch to active round
    });

    // ✅ NEW: Round locked - Round ended with result
    socket.on('round_locked', (data) => {
      console.log('🔒 Round locked with result:', data);
      fetchAllRounds();
      fetchMyBets();
      fetchWalletData();
      
      const emoji = data.result === 'up' ? '📈' : data.result === 'down' ? '📉' : '➖';
      toast.success(`${emoji} Round #${data.roundNumber} Result: ${data.result?.toUpperCase()}!`, { duration: 4000 });
      
      // Show notification to view results
      toast('👈 Swipe left to see round results!', { 
        icon: '📊', 
        duration: 3000 
      });
    });

    // Legacy event support
    socket.on('round_end', (data) => {
      console.log('🏁 Round ended (legacy):', data);
      fetchAllRounds();
      fetchMyBets();
      fetchWalletData();
    });

    socket.on('round_lock', (data) => {
      console.log('🔒 Round lock (legacy):', data);
      fetchAllRounds();
    });

    // Balance update for current user
    socket.on('balance_update', (data) => {
      console.log('💰 Balance update:', data);
      setWalletData(prev => ({
        ...prev,
        nairaBalance: data.nairaBalance,
        lockedBalance: data.lockedBalance
      }));
    });

    return () => {
      socket.off('price_update');
      socket.off('bet_placed');
      socket.off('round_start');
      socket.off('round_locked');
      socket.off('round_end');
      socket.off('round_lock');
      socket.off('balance_update');
    };
  }, [socket, isConnected]);

  // ========== COUNTDOWN TIMER ==========
  useEffect(() => {
    if (!activeRound?.endTime) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(activeRound.endTime).getTime();
      const diff = end - now;
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [activeRound]);

  // ========== PLACE BET ==========
  const handlePlaceBet = async (prediction) => {
    if (!activeRound) {
      toast.error('⏳ No active round. Please wait.');
      return;
    }

    if (activeRound.status !== 'active') {
      toast.error('🔒 Round is not accepting bets.');
      return;
    }

    if (timeLeft < 10) {
      toast.error('⏰ Too late! Round ending soon.');
      return;
    }

    if (!betAmount || betAmount < 100) {
      toast.error('💰 Minimum bet is ₦100');
      return;
    }

    if (betAmount > 100000) {
      toast.error('💰 Maximum bet is ₦100,000');
      return;
    }

    if (betAmount > availableBalance) {
      toast.error(`❌ Insufficient balance! You have ₦${availableBalance.toLocaleString()} available`);
      return;
    }

    setLoading(true);

    try {
      const data = await api.post('/trading/bet', {
        roundId: activeRound.id,
        prediction: prediction.toLowerCase(),
        amount: betAmount
      });

      console.log('✅ Bet placed:', data);
      
      const potentialWin = data.bet?.potentialPayout || (betAmount * 1.7);
      toast.success(
        `✅ Bet ₦${betAmount.toLocaleString()} on ${prediction.toUpperCase()}!\nPotential Win: ₦${potentialWin.toLocaleString()}`,
        { duration: 4000 }
      );

      await Promise.all([
        fetchMyBets(),
        fetchAllRounds(),
        fetchWalletData()
      ]);

    } catch (err) {
      console.error('Bet error:', err);
      toast.error(err.message || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  // ========== LOADING STATE ==========
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-400 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <div className="min-h-screen bg-darker pb-24 lg:pb-8">
      {/* ========== MODALS ========== */}
      <UserGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      
      <ReferralPromoPopup 
        isOpen={showReferralPopup} 
        onClose={() => setShowReferralPopup(false)}
        onGoToReferral={goToReferralPage}
      />

      {/* ========== FLOATING BUTTONS ========== */}
      <FloatingReferralButton onClick={() => setShowReferralPopup(true)} />
      <FloatingSupportButton />

      {/* ========== REFERRAL BANNER ========== */}
      {showReferralBanner && !bannerDismissed && (
        <ReferralBanner 
          onGoToReferral={goToReferralPage}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* ========== CONNECTION STATUS BANNER ========== */}
      {!isConnected && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-3 flex items-center justify-center gap-2">
          <WifiOff className="text-yellow-500" size={18} />
          <p className="text-yellow-500 text-sm font-medium">Reconnecting to live data...</p>
        </div>
      )}

      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        
        {/* ==================== HEADER ==================== */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
              Wealth Trading
              <Activity className="text-primary animate-pulse" size={28} />
            </h1>
            <p className="text-gray-400 text-sm lg:text-base flex items-center gap-2">
              BTC/USD 5-Minute Prediction
              {isConnected ? (
                <span className="flex items-center gap-1 text-green-500 text-xs font-medium">
                  <Wifi size={12} /> Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-500 text-xs font-medium">
                  <WifiOff size={12} /> Connecting...
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setShowGuide(true)}
              className="p-3 bg-slate-800 text-gray-400 hover:text-white rounded-xl border border-slate-700 transition hover:border-primary"
              title="How to Play"
            >
              <HelpCircle size={20} />
            </button>

            <button
              onClick={() => setShowReferralPopup(true)}
              className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl border border-purple-500/50 transition hover:from-purple-700 hover:to-pink-700 hover:shadow-lg hover:shadow-purple-500/30"
              title="Refer & Earn 25%"
            >
              <Gift size={20} />
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 bg-slate-800 text-gray-400 hover:text-white rounded-xl border border-slate-700 transition disabled:opacity-50 hover:border-primary"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>

            <div className="flex-1 lg:flex-none flex items-center gap-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-2xl border border-green-500/30">
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Available Balance</p>
                <p className="text-xl lg:text-2xl font-black text-green-400 tabular-nums">
                  ₦{formatCurrency(availableBalance)}
                </p>
                {lockedBalance > 0 && (
                  <p className="text-xs text-orange-400">
                    🔒 Locked: ₦{formatCurrency(lockedBalance)}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                <WalletIcon size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* ==================== LIVE PRICE BANNER ==================== */}
        <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-4 mb-6 border border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-xl text-orange-500">
                <TrendUp size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase flex items-center gap-2">
                  Live BTC Price
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </p>
                <h2 className="text-2xl lg:text-3xl font-black text-white tabular-nums">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
            </div>

            {roundStartPrice > 0 && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                priceChange >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
              }`}>
                {priceChange >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                <span className="font-bold tabular-nums text-lg">
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
                </span>
                <span className="text-xs opacity-70">from round start</span>
              </div>
            )}
          </div>
        </div>

        {/* ==================== SWIPEABLE ROUNDS - UPDATED ==================== */}
        <div className="mb-6">
          {/* Slide Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))}
                disabled={activeSlide === 0}
                className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition border border-slate-700"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-gray-400 min-w-[200px] text-center font-medium">
                {activeSlide === 0 ? '🔒 Last Round Results' :
                 activeSlide === 1 ? '🔴 LIVE - Place Your Bets!' :
                 '⏳ Next Round'}
              </span>
              <button
                onClick={() => setActiveSlide(prev => Math.min(2, prev + 1))}
                disabled={activeSlide === 2}
                className="p-2 bg-slate-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition border border-slate-700"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`h-2 rounded-full transition-all ${
                    activeSlide === i ? 'w-8 bg-primary' : 'w-2 bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Slides Container */}
          <div className="overflow-hidden rounded-3xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {/* ===== SLIDE 0: LOCKED/COMPLETED ROUND (RESULTS) ===== */}
              <div className="min-w-full px-1">
                {lockedRound ? (
                  <div className="bg-gradient-to-br from-amber-900/20 to-slate-900 rounded-3xl p-6 border-2 border-amber-500/30">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Lock className="text-amber-500" size={16} />
                          <p className="text-sm text-amber-500 font-bold">
                            COMPLETED • Round #{lockedRound.roundNumber}
                          </p>
                        </div>
                        <h3 className="text-xl font-bold text-white">Last Round Results</h3>
                      </div>
                      <div className={`px-4 py-2 rounded-xl font-bold text-lg ${
                        lockedRound.result === 'up'
                          ? 'bg-green-500/20 text-green-500 border border-green-500'
                          : lockedRound.result === 'down'
                          ? 'bg-red-500/20 text-red-500 border border-red-500'
                          : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500'
                      }`}>
                        {lockedRound.result === 'up' ? '📈 UP WON' :
                         lockedRound.result === 'down' ? '📉 DOWN WON' : '➖ TIE'}
                      </div>
                    </div>

                    {/* Price Results */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <p className="text-xs text-gray-400 mb-1">Start Price</p>
                        <p className="text-lg font-bold text-white">
                          ${parseFloat(lockedRound.startPrice || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <p className="text-xs text-gray-400 mb-1">End Price</p>
                        <p className="text-lg font-bold text-white">
                          ${parseFloat(lockedRound.endPrice || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <p className="text-xs text-gray-400 mb-1">Change</p>
                        <p className={`text-lg font-bold ${
                          (lockedRound.endPrice - lockedRound.startPrice) >= 0
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}>
                          {lockedRound.startPrice > 0 
                            ? (((lockedRound.endPrice - lockedRound.startPrice) / lockedRound.startPrice) * 100).toFixed(3)
                            : 0}%
                        </p>
                      </div>
                    </div>

                    {/* Pool Results */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className={`p-4 rounded-xl ${lockedRound.result === 'up' ? 'bg-green-500/20 ring-2 ring-green-500' : 'bg-green-500/10'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
                            <TrendingUp size={14} /> UP Pool
                          </span>
                          <span className="text-green-400 text-xs">{lockedRound.totalUpBets || 0} bets</span>
                        </div>
                        <p className="text-xl font-bold text-green-500 mt-1">
                          ₦{formatCurrency(lockedRound.totalUpAmount)}
                        </p>
                        {lockedRound.result === 'up' && (
                          <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                            <Trophy size={12} /> Winners!
                          </p>
                        )}
                      </div>
                      <div className={`p-4 rounded-xl ${lockedRound.result === 'down' ? 'bg-red-500/20 ring-2 ring-red-500' : 'bg-red-500/10'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-red-400 text-sm font-medium flex items-center gap-1">
                            <TrendingDown size={14} /> DOWN Pool
                          </span>
                          <span className="text-red-400 text-xs">{lockedRound.totalDownBets || 0} bets</span>
                        </div>
                        <p className="text-xl font-bold text-red-500 mt-1">
                          ₦{formatCurrency(lockedRound.totalDownAmount)}
                        </p>
                        {lockedRound.result === 'down' && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <Trophy size={12} /> Winners!
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                      <p className="text-amber-400 text-sm flex items-center justify-center gap-2">
                        <Eye size={16} />
                        View the chart above to see how the price moved
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-3xl p-12 border border-dashed border-slate-700 text-center">
                    <Trophy className="mx-auto mb-4 text-gray-600" size={48} />
                    <p className="text-gray-500 text-lg">No previous round data</p>
                    <p className="text-gray-600 text-sm mt-2">Complete a round to see results here</p>
                  </div>
                )}
              </div>

              {/* ===== SLIDE 1: ACTIVE ROUND (BETTING) ===== */}
              <div className="min-w-full px-1">
                {activeRound ? (
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border-2 border-primary/50 shadow-lg shadow-primary/10">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                          <p className="text-sm text-primary font-bold">
                            LIVE BETTING • Round #{activeRound.roundNumber}
                          </p>
                        </div>
                        <h3 className="text-xl font-bold text-white">Place Your Bets!</h3>
                      </div>

                      {/* Timer */}
                      <div className={`px-5 py-3 rounded-2xl border ${
                        timeLeft < 30 ? 'bg-red-500/20 border-red-500' :
                        timeLeft < 60 ? 'bg-yellow-500/20 border-yellow-500' : 
                        'bg-slate-900/80 border-slate-700'
                      }`}>
                        <p className="text-xs text-gray-400 text-center">Time Left</p>
                        <p className={`text-3xl font-mono font-bold text-center tabular-nums ${
                          timeLeft < 30 ? 'text-red-500 animate-pulse' :
                          timeLeft < 60 ? 'text-yellow-500' : 'text-primary'
                        }`}>
                          {formatTime(timeLeft)}
                        </p>
                      </div>
                    </div>

                    {/* Price Info */}
                    <div className="bg-slate-900/50 rounded-2xl p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Round Start Price</p>
                          <p className="text-xl font-bold text-white tabular-nums">
                            ${roundStartPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400 mb-1">Current Price</p>
                          <p className="text-xl font-bold text-white tabular-nums">
                            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-700">
                        <span className="text-gray-400 text-sm">Current Direction:</span>
                        <span className={`font-bold text-lg flex items-center gap-1 ${
                          priceChange >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {priceChange >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          {priceChange >= 0 ? 'UP' : 'DOWN'} ({priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%)
                        </span>
                      </div>
                    </div>

                    {/* Professional TradingView Chart */}
                    <div className="bg-slate-900/50 rounded-xl p-2 mb-4">
                      <TradingChart 
                        priceHistory={priceHistory} 
                        startPrice={roundStartPrice}
                        currentPrice={currentPrice}
                      />
                    </div>

                    {/* Live Pool Distribution */}
                    <div className="mb-4">
                      <LivePoolIndicator
                        totalUp={parseFloat(activeRound.totalUpAmount || 0)}
                        totalDown={parseFloat(activeRound.totalDownAmount || 0)}
                        upBets={activeRound.totalUpBets || 0}
                        downBets={activeRound.totalDownBets || 0}
                      />
                    </div>

                    {/* Betting Buttons */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* UP BUTTON */}
                      {(() => {
                        const upCalc = calculatePotentialPayout('up');
                        const currentMult = getCurrentMultiplier('up');
                        return (
                          <button
                            onClick={() => handlePlaceBet('up')}
                            disabled={loading || !canBet}
                            className="relative bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500/50 hover:border-green-500 p-4 lg:p-5 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed group overflow-hidden"
                          >
                            <div className="relative z-10">
                              <ArrowUpRight
                                size={32}
                                className="text-green-500 mx-auto mb-2 group-hover:scale-110 transition-transform"
                              />
                              <p className="text-lg lg:text-xl font-black text-green-500">PREDICT UP</p>
                              
                              <p className="text-xs text-gray-400 mt-2">
                                Current Pool: {currentMult.display}
                              </p>
                              
                              <div className="mt-3 pt-3 border-t border-green-500/30 space-y-1">
                                {betAmount > 0 ? (
                                  upCalc.hasOpponents ? (
                                    <>
                                      <p className="text-sm text-green-400 font-bold">
                                        Your Payout: {upCalc.multiplier}x
                                      </p>
                                      <p className="text-lg font-black text-green-500">
                                        Win: ₦{formatCurrency(upCalc.payout)}
                                      </p>
                                      <p className="text-xs text-green-400">
                                        Profit: +₦{formatCurrency(upCalc.profit)}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-sm text-yellow-400 font-bold">1x</p>
                                      <p className="text-xs text-yellow-400">No DOWN bets yet</p>
                                    </>
                                  )
                                ) : (
                                  <p className="text-xs text-gray-400">Select bet amount</p>
                                )}
                              </div>
                            </div>
                            {loading && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                              </div>
                            )}
                          </button>
                        );
                      })()}

                      {/* DOWN BUTTON */}
                      {(() => {
                        const downCalc = calculatePotentialPayout('down');
                        const currentMult = getCurrentMultiplier('down');
                        return (
                          <button
                            onClick={() => handlePlaceBet('down')}
                            disabled={loading || !canBet}
                            className="relative bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/50 hover:border-red-500 p-4 lg:p-5 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed group overflow-hidden"
                          >
                            <div className="relative z-10">
                              <ArrowDownRight
                                size={32}
                                className="text-red-500 mx-auto mb-2 group-hover:scale-110 transition-transform"
                              />
                              <p className="text-lg lg:text-xl font-black text-red-500">PREDICT DOWN</p>
                              
                              <p className="text-xs text-gray-400 mt-2">
                                Current Pool: {currentMult.display}
                              </p>
                              
                              <div className="mt-3 pt-3 border-t border-red-500/30 space-y-1">
                                {betAmount > 0 ? (
                                  downCalc.hasOpponents ? (
                                    <>
                                      <p className="text-sm text-red-400 font-bold">
                                        Your Payout: {downCalc.multiplier}x
                                      </p>
                                      <p className="text-lg font-black text-red-500">
                                        Win: ₦{formatCurrency(downCalc.payout)}
                                      </p>
                                      <p className="text-xs text-red-400">
                                        Profit: +₦{formatCurrency(downCalc.profit)}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-sm text-yellow-400 font-bold">1x</p>
                                      <p className="text-xs text-yellow-400">No UP bets yet</p>
                                    </>
                                  )
                                ) : (
                                  <p className="text-xs text-gray-400">Select bet amount</p>
                                )}
                              </div>
                            </div>
                            {loading && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                              </div>
                            )}
                          </button>
                        );
                      })()}
                    </div>

                    {/* Status Messages */}
                    {!canBet && timeLeft < 10 && timeLeft > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                        <p className="text-red-500 font-medium flex items-center justify-center gap-2">
                          <AlertCircle size={18} />
                          Round ending - Betting disabled
                        </p>
                      </div>
                    )}

                    {timeLeft === 0 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                        <p className="text-yellow-500 font-medium flex items-center justify-center gap-2">
                          <Clock size={18} />
                          Processing results... New round starting soon!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-3xl p-12 border border-dashed border-slate-700 text-center">
                    <Clock className="mx-auto mb-4 text-gray-600 animate-pulse" size={48} />
                    <p className="text-gray-500 text-lg">Waiting for next round...</p>
                    <p className="text-gray-600 text-sm mt-2">A new round will start soon</p>
                    <button
                      onClick={handleRefresh}
                      className="mt-4 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/80 transition flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw size={18} />
                      Refresh
                    </button>
                  </div>
                )}
              </div>

              {/* ===== SLIDE 2: UPCOMING ROUND ===== */}
              <div className="min-w-full px-1">
                {upcomingRound ? (
                  <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Timer className="text-blue-500" size={16} />
                          <p className="text-sm text-blue-400">Round #{upcomingRound.roundNumber}</p>
                        </div>
                        <h3 className="text-xl font-bold text-white">Next Round</h3>
                      </div>
                      <div className="bg-blue-500/20 px-4 py-2 rounded-xl border border-blue-500/30">
                        <p className="text-sm font-bold text-blue-400">Coming Up</p>
                      </div>
                    </div>

                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Play className="text-blue-500" size={40} />
                      </div>
                      <p className="text-gray-300 text-lg mb-2">This round starts automatically</p>
                      <p className="text-gray-400 mb-6">when the current round ends</p>

                      <div className="bg-slate-900/50 p-4 rounded-xl inline-block">
                        <p className="text-xs text-gray-400 mb-1">Scheduled Start</p>
                        <p className="text-xl font-bold text-white">
                          {new Date(upcomingRound.startTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <p className="text-blue-400 text-sm text-center flex items-center justify-center gap-2">
                        <Zap size={16} />
                        Tip: Prepare your bet amount while waiting!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-3xl p-12 border border-dashed border-slate-700 text-center">
                    <Timer className="mx-auto mb-4 text-gray-600" size={48} />
                    <p className="text-gray-500 text-lg">No upcoming round scheduled</p>
                    <p className="text-gray-600 text-sm mt-2">One will be created automatically</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== BET AMOUNT SELECTOR ==================== */}
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-primary" />
              <p className="text-white font-bold">Select Bet Amount</p>
            </div>
            <p className="text-sm text-gray-400">
              Available: <span className="text-green-400 font-bold">₦{formatCurrency(availableBalance)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            {[100, 500, 1000, 2000, 5000, 10000, 50000].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={amt > availableBalance}
                className={`px-4 py-3 rounded-xl font-bold transition-all ${
                  betAmount === amt
                    ? 'bg-primary text-white scale-105 shadow-lg shadow-primary/30'
                    : amt > availableBalance
                    ? 'bg-slate-800 text-gray-600 cursor-not-allowed'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                ₦{amt.toLocaleString()}
              </button>
            ))}

            <div className="relative">
              <input
                type="number"
                placeholder="Custom"
                value={betAmount || ''}
                min="100"
                max={availableBalance}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white w-32 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <span>Min: ₦100</span>
            <span>•</span>
            <span>Max: ₦100,000</span>
            <span>•</span>
            <span className="text-primary">No upfront fees!</span>
          </div>
        </div>

        {/* ==================== MY ACTIVE BETS ==================== */}
        <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity size={20} className="text-primary" />
              My Active Bets
            </h3>
            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold">
              {myActiveBets.length} Active
            </span>
          </div>

          {myActiveBets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Activity size={48} className="mb-4 opacity-20" />
              <p className="text-lg">No active bets</p>
              <p className="text-sm text-gray-600 mt-1">Place a bet to see it here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myActiveBets.map(bet => {
                const betAmountValue = parseFloat(bet.stakeAmount || bet.amount);
                const multiplier = bet.currentMultiplierRaw || 1.7;
                const potentialPayout = roundToTwo(betAmountValue * multiplier);
                const potentialProfit = roundToTwo(potentialPayout - betAmountValue);

                return (
                  <div
                    key={bet.id}
                    className={`bg-slate-900/50 p-4 rounded-2xl border transition-all ${
                      bet.prediction === 'up' 
                        ? 'border-green-500/30 hover:border-green-500/50' 
                        : 'border-red-500/30 hover:border-red-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className={`text-sm font-bold uppercase flex items-center gap-1 ${
                          bet.prediction === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {bet.prediction === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          {bet.prediction}
                        </p>
                        <p className="text-white font-bold text-lg">
                          ₦{formatCurrency(bet.amount || bet.stakeAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Potential Win</p>
                        <p className="text-lg font-bold text-primary">
                          ₦{formatCurrency(potentialPayout)}
                        </p>
                        <p className={`text-xs ${potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          +₦{formatCurrency(potentialProfit)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-700">
                      <span className="text-gray-500">Round #{bet.roundNumber}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-bold">{multiplier}x</span>
                        {bet.isCurrentlyWinning !== undefined && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bet.isCurrentlyWinning 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-red-500/20 text-red-500'
                          }`}>
                            {bet.isCurrentlyWinning ? '✓ Winning' : '✗ Losing'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================== REFERRAL PROMO CARD (BOTTOM) ==================== */}
        <div className="bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-500/20 p-6 rounded-3xl border border-purple-500/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                <Gift className="text-white" size={28} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Refer Friends & Earn 25%! 🎁</h3>
                <p className="text-gray-300 text-sm">
                  Earn 25% commission from your referral's first bet!
                </p>
              </div>
            </div>
            <button
              onClick={goToReferralPage}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
            >
              <Share2 size={18} />
              Start Referring
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
