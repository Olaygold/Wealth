
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Eye,
  History
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
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ==================== REFERRAL PROMO POPUP ====================
const ReferralPromoPopup = ({ isOpen, onClose, onGoToReferral }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-3xl w-full max-w-md border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20 animate-in zoom-in-95 duration-300 my-8">
        
        <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-6 text-center overflow-hidden">
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

// ==================== FLOATING REFERRAL BUTTON ====================
const FloatingReferralButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-28 right-4 lg:bottom-8 lg:right-8 z-30 group"
      title="Refer Friends & Earn 25%"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="relative w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/50 group-hover:scale-110 transition-transform border-2 border-white/20">
          <Gift className="text-white" size={24} />
        </div>

        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
          <span className="text-white text-xs font-black">$</span>
        </div>
      </div>
    </button>
  );
};

// ==================== FLOATING SUPPORT BUTTON ====================
const FloatingSupportButton = () => {
  return (
    <a
      href="https://t.me/Iacafevtu1"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-28 left-4 lg:bottom-8 lg:left-8 z-30 group"
      title="Contact Support"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
        
        <div className="relative w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 group-hover:scale-110 transition-transform border-2 border-white/20">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
          </svg>
        </div>
      </div>
    </a>
  );
};

// ==================== TRADING CHART (COMPLETELY FIXED - NO BLANK PAGE) ====================
const TradingChart = ({ priceHistory, startPrice, currentPrice, isLocked = false, roundId }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLineRef = useRef(null);
  const lastRoundIdRef = useRef(null);
  const isInitializedRef = useRef(false);

  // ✅ Initialize chart ONCE and reuse it
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Only create chart if not already created
    if (chartRef.current && isInitializedRef.current) {
      // Just update colors if locked status changes
      if (seriesRef.current) {
        seriesRef.current.applyOptions({
          lineColor: isLocked ? '#f59e0b' : '#6366f1',
          topColor: isLocked ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.4)',
          bottomColor: isLocked ? 'rgba(245, 158, 11, 0.0)' : 'rgba(99, 102, 241, 0.0)',
        });
      }
      return;
    }

    // Create chart only once
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1e293b', style: 1, visible: true },
        horzLines: { color: '#1e293b', style: 1, visible: true },
      },
      width: chartContainerRef.current.clientWidth,
      height: 280,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#334155',
        rightOffset: 5,
        barSpacing: 8,
        minBarSpacing: 4,
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: { top: 0.15, bottom: 0.15 },
        autoScale: true,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: isLocked ? '#f59e0b' : '#6366f1',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: isLocked ? '#f59e0b' : '#6366f1',
          width: 1,
          style: 2,
        },
      },
      handleScroll: { vertTouchDrag: false, mouseWheel: false, pressedMouseMove: false },
      handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: false },
    });

    const areaSeries = chart.addAreaSeries({
      lineColor: isLocked ? '#f59e0b' : '#6366f1',
      topColor: isLocked ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.4)',
      bottomColor: isLocked ? 'rgba(245, 158, 11, 0.0)' : 'rgba(99, 102, 241, 0.0)',
      lineWidth: 3,
      priceLineVisible: true,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;
    isInitializedRef.current = true;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []); // Empty dependency - create once

  // ✅ Update colors when isLocked changes
  useEffect(() => {
    if (seriesRef.current && chartRef.current) {
      seriesRef.current.applyOptions({
        lineColor: isLocked ? '#f59e0b' : '#6366f1',
        topColor: isLocked ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.4)',
        bottomColor: isLocked ? 'rgba(245, 158, 11, 0.0)' : 'rgba(99, 102, 241, 0.0)',
      });

      chartRef.current.applyOptions({
        crosshair: {
          vertLine: { color: isLocked ? '#f59e0b' : '#6366f1' },
          horzLine: { color: isLocked ? '#f59e0b' : '#6366f1' },
        },
      });
    }
  }, [isLocked]);

  // ✅ Update start price line
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

  // ✅ Update chart data - NEVER clear, just update
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    if (!priceHistory || priceHistory.length === 0) return;

    try {
      const chartData = priceHistory
        .map((item) => {
          const timestamp = item.time 
            ? (typeof item.time === 'number' ? Math.floor(item.time / 1000) : Math.floor(new Date(item.time).getTime() / 1000))
            : Math.floor(Date.now() / 1000);
          
          return {
            time: timestamp,
            value: parseFloat(item.price) || 0,
          };
        })
        .filter(item => item.value > 0 && item.time > 0)
        .sort((a, b) => a.time - b.time);

      // Remove duplicates
      const uniqueData = [];
      const seenTimes = new Set();
      
      for (let i = chartData.length - 1; i >= 0; i--) {
        if (!seenTimes.has(chartData[i].time)) {
          uniqueData.unshift(chartData[i]);
          seenTimes.add(chartData[i].time);
        }
      }

      if (uniqueData.length > 0) {
        seriesRef.current.setData(uniqueData);
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.error('Chart update error:', error);
    }
  }, [priceHistory]);

  return (
    <div className="relative">
      <div 
        ref={chartContainerRef} 
        className="w-full h-[280px] rounded-xl overflow-hidden bg-slate-900/30"
      />
      {(!priceHistory || priceHistory.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-xl">
          <div className="text-center">
            <Activity className="w-8 h-8 text-primary animate-pulse mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Waiting for price data...</p>
          </div>
        </div>
      )}
      {isLocked && (
        <div className="absolute top-2 right-2 bg-amber-500/20 border border-amber-500/50 rounded-lg px-2 py-1 flex items-center gap-1">
          <Lock size={12} className="text-amber-500" />
          <span className="text-amber-500 text-xs font-bold">Locked</span>
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
    <div className="bg-slate-900/50 rounded-xl p-4 md:p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <span className="text-sm text-white font-bold flex items-center gap-2">
          <Users size={18} className="text-primary flex-shrink-0" />
          <span className="truncate">{isLocked ? 'Final Pool' : 'Live Pool'}</span>
        </span>
        {!isLocked && (
          <span className="text-xs text-green-500 font-bold flex items-center gap-1 animate-pulse w-fit">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            LIVE
          </span>
        )}
      </div>
      
      <div className="h-5 bg-slate-700/50 rounded-full overflow-hidden flex mb-4 shadow-inner">
        <div 
          className="bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500 ease-out flex items-center justify-center"
          style={{ width: `${upPercent}%` }}
        >
          {upPercent > 15 && (
            <span className="text-xs text-white font-black">{upPercent.toFixed(0)}%</span>
          )}
        </div>
        <div 
          className="bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500 ease-out flex items-center justify-center"
          style={{ width: `${downPercent}%` }}
        >
          {downPercent > 15 && (
            <span className="text-xs text-white font-black">{downPercent.toFixed(0)}%</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-green-500" size={16} />
            <span className="text-green-500 font-bold">UP</span>
          </div>
          <p className="text-green-500 font-black text-lg truncate">₦{formatCurrency(totalUp)}</p>
          <p className="text-xs text-gray-400">{upBets} bets</p>
        </div>
        
        <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="text-red-500" size={16} />
            <span className="text-red-500 font-bold">DOWN</span>
          </div>
          <p className="text-red-500 font-black text-lg truncate">₦{formatCurrency(totalDown)}</p>
          <p className="text-xs text-gray-400">{downBets} bets</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
        <span className="text-gray-400 text-sm">Total: </span>
        <span className="text-white font-black text-lg">₦{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

// ==================== PREVIOUS ROUND CARD ====================
const PreviousRoundCard = ({ round }) => {
  if (!round) return null;

  const priceChange = parseFloat(round.percentChange || 0);

  return (
    <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 hover:border-slate-600 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-gray-500">Round #{round.roundNumber}</p>
          <p className="text-sm text-gray-400 mt-1">
            {new Date(round.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className={`px-2 py-1 rounded-lg font-bold text-xs ${
          round.result === 'up'
            ? 'bg-green-500/20 text-green-500'
            : round.result === 'down'
            ? 'bg-red-500/20 text-red-500'
            : 'bg-yellow-500/20 text-yellow-500'
        }`}>
          {round.result === 'up' ? '📈 UP' : round.result === 'down' ? '📉 DOWN' : '➖ TIE'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-900/70 p-2 rounded-lg">
          <p className="text-[10px] text-gray-500">Start</p>
          <p className="text-sm font-bold text-white truncate">${parseFloat(round.startPrice || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/70 p-2 rounded-lg">
          <p className="text-[10px] text-gray-500">End</p>
          <p className="text-sm font-bold text-white truncate">${parseFloat(round.endPrice || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className={`text-center py-2 rounded-lg font-black ${
        priceChange >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
      }`}>
        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
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
      title: "Welcome! 🎯",
      content: "Predict if Bitcoin price will go UP or DOWN in 5 minutes!",
      tip: "Just pick a direction and place your bet!"
    },
    {
      icon: <Clock className="w-12 h-12 text-blue-500" />,
      title: "How It Works ⏰",
      content: "• Active (5 min): Place bets\n• Locked (5 min): Wait for result",
      tip: "There's always an active round!"
    },
    {
      icon: <DollarSign className="w-12 h-12 text-green-500" />,
      title: "Place a Bet 💰",
      content: "1. Select amount (min ₦100)\n2. Click UP or DOWN\n3. Wait for result!",
      tip: "Payouts update in real-time!"
    },
    {
      icon: <Trophy className="w-12 h-12 text-yellow-500" />,
      title: "Win Big! 🏆",
      content: "Correct prediction = Your bet + 70% of losers' pool!",
      tip: "More opponents = Higher wins!"
    },
    {
      icon: <Gift className="w-12 h-12 text-purple-500" />,
      title: "Refer & Earn 🎁",
      content: "Earn 25% commission from referrals' first bet!",
      tip: "Unlimited referrals = Unlimited earnings!"
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl max-w-md w-full border border-slate-700 overflow-hidden my-8">
        <div className="bg-gradient-to-r from-primary to-purple-600 p-6 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X size={24} />
          </button>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {steps[currentStep].icon}
          </div>
          <h2 className="text-2xl font-bold text-white">{steps[currentStep].title}</h2>
        </div>

        <div className="p-6">
          <p className="text-gray-300 whitespace-pre-line text-center mb-4">{steps[currentStep].content}</p>
          
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
            <Info className="text-primary flex-shrink-0" size={20} />
            <p className="text-sm text-primary">{steps[currentStep].tip}</p>
          </div>
        </div>

        <div className="flex justify-center gap-2 pb-4">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all ${idx === currentStep ? 'w-8 bg-primary' : 'w-2 bg-gray-600'}`}
            />
          ))}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          {currentStep > 0 && (
            <button onClick={() => setCurrentStep(prev => prev - 1)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold">
              ← Back
            </button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <button onClick={() => setCurrentStep(prev => prev + 1)} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold">
              Next →
            </button>
          ) : (
            <button onClick={onClose} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
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
  const [lockedPriceHistory, setLockedPriceHistory] = useState([]);
  const [previousRounds, setPreviousRounds] = useState([]);
  const [lockedRound, setLockedRound] = useState(null);
  const [activeRound, setActiveRound] = useState(null);
  const [upcomingRound, setUpcomingRound] = useState(null);
  const [activeSlide, setActiveSlide] = useState(2);
  const [betAmount, setBetAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [myActiveBets, setMyActiveBets] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeStartPrice, setActiveStartPrice] = useState(0);
  const [lockedStartPrice, setLockedStartPrice] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  
  // ✅ FIX: Use refs for timers to prevent stale closures
  const activeTimeLeftRef = useRef(0);
  const lockedTimeLeftRef = useRef(0);
  const [activeTimeLeft, setActiveTimeLeft] = useState(0);
  const [lockedTimeLeft, setLockedTimeLeft] = useState(0);
  const timerIntervalRef = useRef(null);

  // ========== CALCULATED VALUES ==========
  const walletBalance = parseFloat(walletData?.nairaBalance || 0);
  const lockedBalance = parseFloat(walletData?.lockedBalance || 0);
  const availableBalance = roundToTwo(walletBalance - lockedBalance);
  const activePriceChange = activeStartPrice > 0 ? ((currentPrice - activeStartPrice) / activeStartPrice) * 100 : 0;
  const lockedPriceChange = lockedStartPrice > 0 ? ((currentPrice - lockedStartPrice) / lockedStartPrice) * 100 : 0;
  const canBet = activeRound?.status === 'active' && activeTimeLeft >= 10;

  const slides = [
    { id: 'previous', label: '📊 History' },
    { id: 'locked', label: '🔒 Locked' },
    { id: 'active', label: '🔴 LIVE' },
    { id: 'upcoming', label: '⏳ Next' }
  ];

  const goToReferralPage = () => {
    setShowReferralPopup(false);
    navigate('/referrals');
  };

  // ========== MULTIPLIER CALCULATION ==========
  const calculatePotentialPayout = useCallback((prediction) => {
    if (!activeRound || betAmount <= 0) {
      return { payout: 0, profit: 0, multiplier: 1.7, hasOpponents: false };
    }

    let totalUp = parseFloat(activeRound.totalUpAmount || 0);
    let totalDown = parseFloat(activeRound.totalDownAmount || 0);

    if (prediction === 'up') totalUp += betAmount;
    else totalDown += betAmount;

    const hasOpponents = prediction === 'up' ? totalDown > 0 : totalUp > 0;

    if (!hasOpponents) {
      return { payout: betAmount, profit: 0, multiplier: 1.0, hasOpponents: false };
    }

    let multiplier;
    if (prediction === 'up') {
      multiplier = roundToTwo(1 + (totalDown * 0.7) / totalUp);
    } else {
      multiplier = roundToTwo(1 + (totalUp * 0.7) / totalDown);
    }

    const payout = roundToTwo(betAmount * multiplier);
    const profit = roundToTwo(payout - betAmount);

    return { payout, profit, multiplier, hasOpponents: true };
  }, [activeRound, betAmount]);

  const getCurrentMultiplier = useCallback((prediction) => {
    if (!activeRound) return { value: 1.7, display: '~1.7x' };

    const totalUp = parseFloat(activeRound.totalUpAmount || 0);
    const totalDown = parseFloat(activeRound.totalDownAmount || 0);

    if (totalUp === 0 && totalDown === 0) return { value: 1.7, display: '~1.7x' };

    if (prediction === 'up') {
      if (totalUp === 0 || totalDown === 0) return { value: 1.0, display: totalDown === 0 ? 'N/A' : '~1.7x' };
      return { value: roundToTwo(1 + (totalDown * 0.7) / totalUp), display: `${roundToTwo(1 + (totalDown * 0.7) / totalUp)}x` };
    } else {
      if (totalDown === 0 || totalUp === 0) return { value: 1.0, display: totalUp === 0 ? 'N/A' : '~1.7x' };
      return { value: roundToTwo(1 + (totalUp * 0.7) / totalDown), display: `${roundToTwo(1 + (totalUp * 0.7) / totalDown)}x` };
    }
  }, [activeRound]);

  // ========== CHECK FIRST VISIT ==========
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenTradingGuide');
    if (!hasSeenGuide && user) {
      setShowGuide(true);
      localStorage.setItem('hasSeenTradingGuide', 'true');
    }
  }, [user]);

  // ========== FETCH FUNCTIONS ==========
  const fetchWalletData = async () => {
    try {
      const data = await api.get('/wallet/balance');
      setWalletData(data?.data || data);
    } catch (err) {
      console.error('Wallet fetch error:', err);
    }
  };

  const fetchAllRounds = async () => {
    try {
      const data = await api.get('/trading/rounds/all');

      if (data) {
        setPreviousRounds(data.previousRounds || []);
        
        // ✅ FIX: Only update if data exists, don't set to null
        if (data.lockedRound) {
          setLockedRound(prev => {
            // Keep price history if same round
            if (prev?.id === data.lockedRound.id) {
              return { ...data.lockedRound };
            }
            return data.lockedRound;
          });
          setLockedStartPrice(parseFloat(data.lockedRound.startPrice || 0));
        }
        
        if (data.activeRound) {
          setActiveRound(prev => {
            // Keep the round data smooth
            if (prev?.id === data.activeRound.id) {
              return { ...prev, ...data.activeRound };
            }
            return data.activeRound;
          });
          setActiveStartPrice(parseFloat(data.activeRound.startPrice || 0));
        }
        
        setUpcomingRound(data.upcomingRound || null);
      }
    } catch (err) {
      console.error('Rounds fetch error:', err);
    }
  };

  const fetchCurrentPrice = async () => {
    try {
      const data = await api.get('/trading/current-price');
      const price = data?.price;
      if (price) {
        const priceValue = parseFloat(price);
        setCurrentPrice(priceValue);
        
        const now = Date.now();
        const newEntry = { time: now, price: priceValue };
        
        setPriceHistory(prev => [...prev, newEntry].slice(-100));
        setLockedPriceHistory(prev => [...prev, newEntry].slice(-200));
      }
    } catch (err) {
      console.error('Price fetch error:', err);
    }
  };

  const fetchMyBets = async () => {
    try {
      const data = await api.get('/trading/my-bets/active');
      setMyActiveBets(data?.activeBets || []);
    } catch (err) {
      console.error('Bets fetch error:', err);
      setMyActiveBets([]);
    }
  };

  // ========== INITIALIZE DASHBOARD ==========
  const initDashboard = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (user) {
      initDashboard();
    }
  }, [user, initDashboard]);

  // ========== AUTO-REFRESH DATA ==========
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchAllRounds();
      fetchMyBets();
      fetchCurrentPrice();
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await initDashboard();
    setRefreshing(false);
    toast.success('Data refreshed!');
  };

  // ========== ✅ FIX: STABLE COUNTDOWN TIMER ==========
  useEffect(() => {
    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Create new interval that runs exactly every second
    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      
      // Calculate active time left
      if (activeRound?.lockTime) {
        const lockTime = new Date(activeRound.lockTime).getTime();
        const newActiveTime = Math.max(0, Math.floor((lockTime - now) / 1000));
        setActiveTimeLeft(newActiveTime);
      } else {
        setActiveTimeLeft(0);
      }
      
      // Calculate locked time left
      if (lockedRound?.endTime) {
        const endTime = new Date(lockedRound.endTime).getTime();
        const newLockedTime = Math.max(0, Math.floor((endTime - now) / 1000));
        setLockedTimeLeft(newLockedTime);
      } else {
        setLockedTimeLeft(0);
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeRound?.lockTime, lockedRound?.endTime]);

  // ========== SOCKET LISTENERS ==========
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('price_update', (data) => {
      if (data?.price) {
        const priceValue = parseFloat(data.price);
        setCurrentPrice(priceValue);
        
        const now = Date.now();
        const newEntry = { time: now, price: priceValue };
        
        setPriceHistory(prev => [...prev, newEntry].slice(-100));
        setLockedPriceHistory(prev => [...prev, newEntry].slice(-200));
      }
    });

    socket.on('bet_placed', (data) => {
      setActiveRound(prev => {
        if (!prev || prev.id !== data.roundId) return prev;
        return {
          ...prev,
          totalUpAmount: data.totalUpAmount,
          totalDownAmount: data.totalDownAmount,
          totalUpBets: data.totalUpBets,
          totalDownBets: data.totalDownBets,
        };
      });
    });

    socket.on('round_start', (data) => {
      console.log('🚀 Round started:', data);
      
      // ✅ FIX: DON'T clear price history - just fetch new data
      fetchAllRounds();
      fetchMyBets();
      
      if (data.startPrice) {
        setActiveStartPrice(parseFloat(data.startPrice));
      }
      
      toast.success(`🚀 Round #${data.roundNumber} Started!`, { duration: 3000 });
      setActiveSlide(2);
    });

    socket.on('round_locked', (data) => {
      console.log('🔒 Round locked:', data);
      
      // ✅ Save current price history for locked round
      setPriceHistory(prev => {
        setLockedPriceHistory([...prev]);
        return prev; // Keep active history too
      });
      
      fetchAllRounds();
      fetchMyBets();
      
      if (data.startPrice) {
        setLockedStartPrice(parseFloat(data.startPrice));
      }
      
      toast('🔒 Betting closed!', { icon: '⏰', duration: 3000 });
    });

    socket.on('round_completed', (data) => {
      console.log('🏁 Round completed:', data);
      fetchAllRounds();
      fetchMyBets();
      fetchWalletData();
      
      const emoji = data.result === 'up' ? '📈' : data.result === 'down' ? '📉' : '➖';
      toast.success(`${emoji} Round #${data.roundNumber}: ${data.result?.toUpperCase()}!`, { duration: 4000 });
    });

    socket.on('bet_result', (data) => {
      fetchMyBets();
      fetchWalletData();
      
      if (data.result === 'win') {
        toast.success(`🎉 You WON ₦${data.payout?.toLocaleString()}!`, { duration: 5000 });
      } else if (data.result === 'loss') {
        toast.error(`😢 You lost ₦${Math.abs(data.profit || data.amount)?.toLocaleString()}`, { duration: 4000 });
      } else if (data.result === 'refund') {
        toast.success(`🔄 Refunded ₦${data.payout?.toLocaleString()}`, { duration: 4000 });
      }
    });

    socket.on('balance_update', (data) => {
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
      socket.off('round_completed');
      socket.off('bet_result');
      socket.off('balance_update');
    };
  }, [socket, isConnected]);

  // ========== PLACE BET ==========
  const handlePlaceBet = async (prediction) => {
    if (!activeRound) {
      toast.error('⏳ No active round.');
      return;
    }

    if (activeRound.status !== 'active') {
      toast.error('🔒 Round not accepting bets.');
      return;
    }

    if (activeTimeLeft < 10) {
      toast.error('⏰ Too late!');
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
      toast.error(`❌ Insufficient balance!`);
      return;
    }

    setLoading(true);

    try {
      const data = await api.post('/trading/bet', {
        roundId: activeRound.id,
        prediction: prediction.toLowerCase(),
        amount: betAmount
      });
      
      toast.success(`✅ Bet ₦${betAmount.toLocaleString()} on ${prediction.toUpperCase()}!`, { duration: 3000 });

      await Promise.all([fetchMyBets(), fetchAllRounds(), fetchWalletData()]);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24 lg:pb-8">
      <UserGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <ReferralPromoPopup isOpen={showReferralPopup} onClose={() => setShowReferralPopup(false)} onGoToReferral={goToReferralPage} />
      <FloatingReferralButton onClick={() => setShowReferralPopup(true)} />
      <FloatingSupportButton />

      {!isConnected && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-3 flex items-center justify-center gap-2">
          <WifiOff className="text-yellow-500 animate-pulse" size={18} />
          <p className="text-yellow-500 text-sm font-medium">Reconnecting...</p>
        </div>
      )}

      <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        
        {/* ========== HEADER CARD ========== */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-4 md:p-5 border border-slate-700/50 shadow-xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-xl">
                <Activity className="text-primary animate-pulse" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-black text-white truncate">Wealth Trading</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">BTC/USD 5-Min</span>
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-green-500 text-[10px] font-bold px-2 py-0.5 bg-green-500/10 rounded-full">
                      <Wifi size={10} /> LIVE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-500 text-[10px] font-bold px-2 py-0.5 bg-yellow-500/10 rounded-full">
                      <WifiOff size={10} /> ...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Balance & Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-4 rounded-xl border border-green-500/30">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase mb-1">Available Balance</p>
                    <p className="text-xl md:text-2xl font-black text-green-400 truncate">₦{formatCurrency(availableBalance)}</p>
                    {lockedBalance > 0 && (
                      <p className="text-[10px] text-orange-400 mt-1 flex items-center gap-1">
                        <Lock size={10} /> Locked: ₦{formatCurrency(lockedBalance)}
                      </p>
                    )}
                  </div>
                  <WalletIcon className="text-green-500" size={28} />
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <button onClick={() => setShowGuide(true)} className="p-3 bg-slate-800/80 text-gray-400 hover:text-white rounded-xl border border-slate-700 transition-all">
                  <HelpCircle size={20} />
                </button>
                <button onClick={() => setShowReferralPopup(true)} className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg">
                  <Gift size={20} />
                </button>
                <button onClick={handleRefresh} disabled={refreshing} className="p-3 bg-slate-800/80 text-gray-400 hover:text-white rounded-xl border border-slate-700 transition-all">
                  <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========== LIVE PRICE ========== */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-2 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl text-orange-500">
                <TrendUp size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 uppercase flex items-center gap-2 mb-1">
                  Live BTC Price
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </p>
                <h2 className="text-2xl md:text-3xl font-black text-white truncate">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
            </div>

            {activeStartPrice > 0 && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl w-full sm:w-auto justify-center ${
                activePriceChange >= 0 
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30' 
                  : 'bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30'
              }`}>
                {activePriceChange >= 0 ? <TrendingUp className="text-green-500" size={20} /> : <TrendingDown className="text-red-500" size={20} />}
                <span className={`font-black text-xl ${activePriceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {activePriceChange >= 0 ? '+' : ''}{activePriceChange.toFixed(3)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ========== SWIPEABLE ROUNDS ========== */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50 shadow-xl">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))}
                disabled={activeSlide === 0}
                className="p-2 bg-slate-800/80 rounded-xl text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-gray-300 text-center font-bold truncate px-2">
                {slides[activeSlide]?.label}
              </span>
              <button
                onClick={() => setActiveSlide(prev => Math.min(3, prev + 1))}
                disabled={activeSlide === 3}
                className="p-2 bg-slate-800/80 rounded-xl text-gray-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex gap-1.5 flex-shrink-0 ml-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`h-2 rounded-full transition-all ${
                    activeSlide === i 
                      ? i === 2 ? 'w-8 bg-red-500' : 'w-8 bg-primary' 
                      : 'w-2 bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Slides */}
          <div className="overflow-hidden rounded-2xl">
            <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
              
              {/* SLIDE 0: Previous Rounds */}
              <div className="min-w-full px-1">
                <div className="flex items-center gap-2 mb-4">
                  <History className="text-primary" size={20} />
                  <h3 className="text-lg font-bold text-white">Previous Rounds</h3>
                </div>
                {previousRounds.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {previousRounds.map((round) => (
                      <PreviousRoundCard key={round.id} round={round} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
                    <Trophy className="text-gray-600 mx-auto mb-3" size={40} />
                    <p className="text-gray-400">No completed rounds yet</p>
                  </div>
                )}
              </div>

              {/* SLIDE 1: Locked Round */}
              <div className="min-w-full px-1">
                {lockedRound ? (
                  <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-2xl p-4 border-2 border-amber-500/50">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Lock className="text-amber-500" size={20} />
                        <div>
                          <p className="text-xs text-amber-400 font-bold">Round #{lockedRound.roundNumber}</p>
                          <h3 className="text-xl font-black text-white">Waiting for Result</h3>
                        </div>
                      </div>

                      <div className={`px-4 py-3 rounded-xl border-2 w-full sm:w-auto text-center ${
                        lockedTimeLeft < 30 ? 'bg-red-500/20 border-red-500' :
                        lockedTimeLeft < 60 ? 'bg-yellow-500/20 border-yellow-500' : 
                        'bg-amber-500/20 border-amber-500'
                      }`}>
                        <p className="text-[10px] text-gray-400 uppercase">Result In</p>
                        <p className={`text-3xl font-mono font-black ${
                          lockedTimeLeft < 30 ? 'text-red-500 animate-pulse' :
                          lockedTimeLeft < 60 ? 'text-yellow-500' : 'text-amber-500'
                        }`}>
                          {formatTime(lockedTimeLeft)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 rounded-xl p-4 mb-4">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-[10px] text-gray-400">Start Price</p>
                          <p className="text-lg font-black text-white truncate">${lockedStartPrice.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-[10px] text-gray-400">Current</p>
                          <p className="text-lg font-black text-white truncate">${currentPrice.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-700/50">
                        <span className="text-gray-400 text-sm">Direction:</span>
                        <span className={`font-black text-lg flex items-center gap-1 px-3 py-1 rounded-lg ${
                          lockedPriceChange >= 0 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
                        }`}>
                          {lockedPriceChange >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          {lockedPriceChange >= 0 ? '+' : ''}{lockedPriceChange.toFixed(3)}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 rounded-xl p-2 mb-4">
                      <TradingChart 
                        priceHistory={lockedPriceHistory.length > 0 ? lockedPriceHistory : priceHistory} 
                        startPrice={lockedStartPrice}
                        currentPrice={currentPrice}
                        isLocked={true}
                        roundId={lockedRound.id}
                      />
                    </div>

                    <LivePoolIndicator
                      totalUp={parseFloat(lockedRound.totalUpAmount || 0)}
                      totalDown={parseFloat(lockedRound.totalDownAmount || 0)}
                      upBets={lockedRound.totalUpBets || 0}
                      downBets={lockedRound.totalDownBets || 0}
                      isLocked={true}
                    />
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-2xl p-12 border-2 border-dashed border-slate-700 text-center">
                    <Lock className="text-gray-600 mx-auto mb-3" size={40} />
                    <p className="text-gray-400">No locked round</p>
                  </div>
                )}
              </div>

              {/* SLIDE 2: Active Round */}
              <div className="min-w-full px-1">
                {activeRound ? (
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border-2 border-primary/50">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="absolute inset-0 bg-red-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                          <Activity className="relative text-red-500" size={24} />
                        </div>
                        <div>
                          <p className="text-xs text-primary font-bold flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            Round #{activeRound.roundNumber}
                          </p>
                          <h3 className="text-xl font-black text-white">Place Your Bets!</h3>
                        </div>
                      </div>

                      <div className={`px-4 py-3 rounded-xl border-2 w-full sm:w-auto text-center ${
                        activeTimeLeft < 30 ? 'bg-red-500/20 border-red-500' :
                        activeTimeLeft < 60 ? 'bg-yellow-500/20 border-yellow-500' : 
                        'bg-slate-900/80 border-slate-700'
                      }`}>
                        <p className="text-[10px] text-gray-400 uppercase">Betting Ends</p>
                        <p className={`text-3xl font-mono font-black ${
                          activeTimeLeft < 30 ? 'text-red-500 animate-pulse' :
                          activeTimeLeft < 60 ? 'text-yellow-500' : 'text-primary'
                        }`}>
                          {formatTime(activeTimeLeft)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 rounded-xl p-4 mb-4">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-[10px] text-gray-400">Start Price</p>
                          <p className="text-lg font-black text-white truncate">${activeStartPrice.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-[10px] text-gray-400">Current</p>
                          <p className="text-lg font-black text-white truncate">${currentPrice.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-700/50">
                        <span className="text-gray-400 text-sm">Direction:</span>
                        <span className={`font-black text-lg flex items-center gap-1 px-3 py-1 rounded-lg ${
                          activePriceChange >= 0 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
                        }`}>
                          {activePriceChange >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          {activePriceChange >= 0 ? '+' : ''}{activePriceChange.toFixed(3)}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 rounded-xl p-2 mb-4">
                      <TradingChart 
                        priceHistory={priceHistory} 
                        startPrice={activeStartPrice}
                        currentPrice={currentPrice}
                        roundId={activeRound.id}
                      />
                    </div>

                    <div className="mb-4">
                      <LivePoolIndicator
                        totalUp={parseFloat(activeRound.totalUpAmount || 0)}
                        totalDown={parseFloat(activeRound.totalDownAmount || 0)}
                        upBets={activeRound.totalUpBets || 0}
                        downBets={activeRound.totalDownBets || 0}
                      />
                    </div>

                    {/* Betting Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {/* UP */}
                      {(() => {
                        const upCalc = calculatePotentialPayout('up');
                        const currentMult = getCurrentMultiplier('up');
                        return (
                          <button
                            onClick={() => handlePlaceBet('up')}
                            disabled={loading || !canBet}
                            className="relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 border-2 border-green-500/50 hover:border-green-500 p-5 rounded-xl transition-all disabled:opacity-40"
                          >
                            <div className="p-2 bg-green-500/20 rounded-xl w-fit mx-auto mb-2">
                              <ArrowUpRight size={28} className="text-green-500" />
                            </div>
                            <p className="text-lg font-black text-green-500 mb-1">PREDICT UP</p>
                            <p className="text-xs text-gray-400">Pool: <span className="text-green-400 font-bold">{currentMult.display}</span></p>
                            
                            <div className="mt-3 pt-3 border-t border-green-500/30 space-y-1">
                              {betAmount > 0 && upCalc.hasOpponents ? (
                                <>
                                  <p className="text-xs text-green-400 font-bold">{upCalc.multiplier}x</p>
                                  <p className="text-xl font-black text-green-500 truncate">₦{formatCurrency(upCalc.payout)}</p>
                                  <p className="text-xs text-green-400">+₦{formatCurrency(upCalc.profit)}</p>
                                </>
                              ) : betAmount > 0 ? (
                                <p className="text-xs text-yellow-400">No DOWN bets yet</p>
                              ) : (
                                <p className="text-xs text-gray-400">Select amount</p>
                              )}
                            </div>
                            {loading && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                              </div>
                            )}
                          </button>
                        );
                      })()}

                      {/* DOWN */}
                      {(() => {
                        const downCalc = calculatePotentialPayout('down');
                        const currentMult = getCurrentMultiplier('down');
                        return (
                          <button
                            onClick={() => handlePlaceBet('down')}
                            disabled={loading || !canBet}
                            className="relative bg-gradient-to-br from-red-500/10 to-rose-500/10 hover:from-red-500/20 hover:to-rose-500/20 border-2 border-red-500/50 hover:border-red-500 p-5 rounded-xl transition-all disabled:opacity-40"
                          >
                            <div className="p-2 bg-red-500/20 rounded-xl w-fit mx-auto mb-2">
                              <ArrowDownRight size={28} className="text-red-500" />
                            </div>
                            <p className="text-lg font-black text-red-500 mb-1">PREDICT DOWN</p>
                            <p className="text-xs text-gray-400">Pool: <span className="text-red-400 font-bold">{currentMult.display}</span></p>
                            
                            <div className="mt-3 pt-3 border-t border-red-500/30 space-y-1">
                              {betAmount > 0 && downCalc.hasOpponents ? (
                                <>
                                  <p className="text-xs text-red-400 font-bold">{downCalc.multiplier}x</p>
                                  <p className="text-xl font-black text-red-500 truncate">₦{formatCurrency(downCalc.payout)}</p>
                                  <p className="text-xs text-red-400">+₦{formatCurrency(downCalc.profit)}</p>
                                </>
                              ) : betAmount > 0 ? (
                                <p className="text-xs text-yellow-400">No UP bets yet</p>
                              ) : (
                                <p className="text-xs text-gray-400">Select amount</p>
                              )}
                            </div>
                            {loading && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                              </div>
                            )}
                          </button>
                        );
                      })()}
                    </div>

                    {!canBet && activeTimeLeft < 10 && activeTimeLeft > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                        <p className="text-red-500 font-bold flex items-center justify-center gap-2 text-sm">
                          <AlertCircle size={16} /> Round ending - Betting disabled
                        </p>
                      </div>
                    )}

                    {activeTimeLeft === 0 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                        <p className="text-yellow-500 font-bold flex items-center justify-center gap-2 text-sm">
                          <Clock size={16} /> Round locking... New round starting!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-2xl p-12 border-2 border-dashed border-slate-700 text-center">
                    <Clock className="text-gray-600 animate-pulse mx-auto mb-3" size={40} />
                    <p className="text-gray-400 mb-4">Waiting for next round...</p>
                    <button onClick={handleRefresh} className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 mx-auto">
                      <RefreshCw size={18} /> Refresh
                    </button>
                  </div>
                )}
              </div>

              {/* SLIDE 3: Upcoming Round */}
              <div className="min-w-full px-1">
                {upcomingRound ? (
                  <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-6">
                      <Timer className="text-blue-500" size={20} />
                      <div>
                        <p className="text-xs text-blue-400">Round #{upcomingRound.roundNumber}</p>
                        <h3 className="text-xl font-black text-white">Next Round</h3>
                      </div>
                    </div>

                    <div className="text-center py-8">
                      <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
                        <div className="relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center w-full h-full border-2 border-blue-500/30">
                          <Play className="text-blue-500" size={40} />
                        </div>
                      </div>
                      <p className="text-gray-300 text-lg mb-2">Starts automatically</p>
                      <p className="text-gray-400 text-sm mb-6">when current round locks</p>

                      <div className="bg-slate-900/60 p-4 rounded-xl inline-block">
                        <p className="text-[10px] text-gray-400 uppercase mb-1">Scheduled</p>
                        <p className="text-xl font-black text-white">
                          {new Date(upcomingRound.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <p className="text-blue-400 text-sm text-center flex items-center justify-center gap-2">
                        <Zap size={16} /> Prepare your bet amount!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-2xl p-12 border-2 border-dashed border-slate-700 text-center">
                    <Timer className="text-gray-600 mx-auto mb-3" size={40} />
                    <p className="text-gray-400">No upcoming round</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========== BET AMOUNT SELECTOR ========== */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-700/50 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="text-primary" size={20} />
              <p className="text-white font-bold">Bet Amount</p>
            </div>
            <p className="text-xs text-gray-400">
              Available: <span className="text-green-400 font-black">₦{formatCurrency(availableBalance)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {[100, 500, 1000, 2000, 5000, 10000, 50000].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={amt > availableBalance}
                className={`px-3 py-2 rounded-xl font-bold text-sm transition-all ${
                  betAmount === amt
                    ? 'bg-gradient-to-r from-primary to-purple-600 text-white scale-105 shadow-lg'
                    : amt > availableBalance
                    ? 'bg-slate-800/50 text-gray-600 cursor-not-allowed'
                    : 'bg-slate-800/80 text-gray-300 hover:bg-slate-700'
                }`}
              >
                ₦{amt.toLocaleString()}
              </button>
            ))}

            <input
              type="number"
              placeholder="Custom"
              value={betAmount || ''}
              min="100"
              max={availableBalance}
              className="bg-slate-900/80 border-2 border-slate-700 focus:border-primary rounded-xl px-3 py-2 text-white w-28 focus:outline-none text-sm"
              onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
            />
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-gray-400 bg-slate-900/50 p-3 rounded-lg">
            <span className="flex items-center gap-1"><Info size={12} className="text-blue-400" /> Min: ₦100</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Info size={12} className="text-blue-400" /> Max: ₦100,000</span>
            <span>•</span>
            <span className="text-primary font-bold flex items-center gap-1"><Shield size={12} /> No fees!</span>
          </div>
        </div>

        {/* ========== MY ACTIVE BETS ========== */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="text-primary" size={20} />
              <h3 className="text-lg font-black text-white">My Active Bets</h3>
            </div>
            <span className="bg-primary/20 text-primary px-3 py-1 rounded-xl text-xs font-black">{myActiveBets.length}</span>
          </div>

          {myActiveBets.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
              <Activity size={40} className="text-gray-600 mx-auto mb-3 opacity-20" />
              <p className="text-gray-400">No active bets</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myActiveBets.map(bet => {
                const betAmountValue = parseFloat(bet.stakeAmount || bet.amount);
                const multiplier = bet.currentMultiplierRaw || 1.7;
                const potentialPayout = roundToTwo(betAmountValue * multiplier);
                const potentialProfit = roundToTwo(potentialPayout - betAmountValue);

                return (
                  <div
                    key={bet.id}
                    className={`bg-slate-900/70 p-4 rounded-xl border-2 transition-all ${
                      bet.prediction === 'up' ? 'border-green-500/30' : 'border-red-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className={`text-xs font-black uppercase flex items-center gap-1 mb-1 ${
                          bet.prediction === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {bet.prediction === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {bet.prediction}
                        </p>
                        <p className="text-white font-black text-lg">₦{formatCurrency(bet.amount || bet.stakeAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500">Win</p>
                        <p className="text-base font-black text-primary">₦{formatCurrency(potentialPayout)}</p>
                        <p className="text-[10px] text-green-400">+₦{formatCurrency(potentialProfit)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-700">
                      <span className="text-gray-500 flex items-center gap-1">
                        {bet.roundStatus === 'locked' && <Lock size={10} className="text-amber-500" />}
                        Round #{bet.roundNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        bet.prediction === 'up' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {multiplier}x
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========== REFERRAL PROMO ========== */}
        <div className="bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-orange-500/20 p-4 rounded-2xl border-2 border-purple-500/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Gift className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-white font-black text-lg">Refer & Earn 25%! 🎁</h3>
                <p className="text-gray-300 text-sm">Earn from referral's first bet!</p>
              </div>
            </div>
            <button
              onClick={goToReferralPage}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg"
            >
              <Share2 size={18} /> Start Referring <ChevronRight size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
