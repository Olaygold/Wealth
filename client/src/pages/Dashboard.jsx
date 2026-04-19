
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
      <div className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-2xl w-full max-w-md border border-purple-500/20 shadow-2xl shadow-purple-500/10 animate-in zoom-in-95 duration-300 my-8">
        
        <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-6 text-center overflow-hidden rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/70 hover:text-white transition z-10 bg-white/10 rounded-full p-1.5 hover:bg-white/20"
          >
            <X size={16} />
          </button>

          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-black text-white mb-1">🎁 Earn 25% Commission!</h2>
            <p className="text-white/80 text-xs">Don't miss out on FREE money!</p>
          </div>
        </div>

        <div className="p-5">
          <div className="text-center mb-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              Refer friends and earn <span className="text-green-400 font-black text-base">25% commission</span> from their <span className="text-yellow-400 font-bold">first bet!</span>
            </p>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-4 mb-4 border border-slate-700/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
                <Sparkles className="text-green-400" size={14} />
              </div>
              <p className="text-gray-300 text-sm"><span className="text-white font-semibold">Easy Money:</span> Share & get paid!</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
                <Users className="text-purple-400" size={14} />
              </div>
              <p className="text-gray-300 text-sm"><span className="text-white font-semibold">Unlimited:</span> No cap on earnings!</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center">
                <Zap className="text-orange-400" size={14} />
              </div>
              <p className="text-gray-300 text-sm"><span className="text-white font-semibold">Instant:</span> Auto-credited!</p>
            </div>
          </div>

          <button
            onClick={onGoToReferral}
            className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:opacity-90 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Gift size={16} />
            Start Referring Now!
            <ExternalLink size={14} />
          </button>

          <button onClick={onClose} className="w-full mt-3 py-2 text-gray-500 hover:text-gray-300 transition text-sm">
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
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-lg opacity-50 group-hover:opacity-80 transition-opacity"></div>
        <div className="relative w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-xl border border-white/10 group-hover:scale-110 transition-transform">
          <Gift className="text-white" size={20} />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border border-slate-900 animate-pulse">
          <span className="text-white text-[8px] font-black">$</span>
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
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-lg opacity-40 group-hover:opacity-70 transition-opacity"></div>
        <div className="relative w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-xl border border-white/10 group-hover:scale-110 transition-transform">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
          </svg>
        </div>
      </div>
    </a>
  );
};

// ==================== TRADING CHART ====================
const TradingChart = ({ priceHistory, startPrice, currentPrice, isLocked = false, roundId }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLineRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    if (chartRef.current && isInitializedRef.current) {
      if (seriesRef.current) {
        seriesRef.current.applyOptions({
          lineColor: isLocked ? '#f59e0b' : '#6366f1',
          topColor: isLocked ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)',
          bottomColor: isLocked ? 'rgba(245, 158, 11, 0.0)' : 'rgba(99, 102, 241, 0.0)',
        });
      }
      return;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1e293b', style: 1, visible: true },
        horzLines: { color: '#1e293b', style: 1, visible: true },
      },
      width: chartContainerRef.current.clientWidth,
      height: 240,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#1e293b',
        rightOffset: 5,
        barSpacing: 8,
        minBarSpacing: 4,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: { top: 0.15, bottom: 0.15 },
        autoScale: true,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: isLocked ? '#f59e0b' : '#6366f1', width: 1, style: 2 },
        horzLine: { color: isLocked ? '#f59e0b' : '#6366f1', width: 1, style: 2 },
      },
      handleScroll: { vertTouchDrag: false, mouseWheel: false, pressedMouseMove: false },
      handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: false },
    });

    const areaSeries = chart.addAreaSeries({
      lineColor: isLocked ? '#f59e0b' : '#6366f1',
      topColor: isLocked ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)',
      bottomColor: isLocked ? 'rgba(245, 158, 11, 0.0)' : 'rgba(99, 102, 241, 0.0)',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;
    isInitializedRef.current = true;

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
  }, []);

  useEffect(() => {
    if (seriesRef.current && chartRef.current) {
      seriesRef.current.applyOptions({
        lineColor: isLocked ? '#f59e0b' : '#6366f1',
        topColor: isLocked ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)',
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

  useEffect(() => {
    if (!seriesRef.current || !startPrice || startPrice <= 0) return;
    if (priceLineRef.current) {
      seriesRef.current.removePriceLine(priceLineRef.current);
    }
    priceLineRef.current = seriesRef.current.createPriceLine({
      price: startPrice,
      color: '#f59e0b',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Start',
    });
  }, [startPrice]);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    if (!priceHistory || priceHistory.length === 0) return;

    try {
      const chartData = priceHistory
        .map((item) => {
          const timestamp = item.time 
            ? (typeof item.time === 'number' ? Math.floor(item.time / 1000) : Math.floor(new Date(item.time).getTime() / 1000))
            : Math.floor(Date.now() / 1000);
          return { time: timestamp, value: parseFloat(item.price) || 0 };
        })
        .filter(item => item.value > 0 && item.time > 0)
        .sort((a, b) => a.time - b.time);

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
      <div ref={chartContainerRef} className="w-full rounded-xl overflow-hidden" />
      {(!priceHistory || priceHistory.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-xl">
          <div className="text-center">
            <Activity className="w-6 h-6 text-primary animate-pulse mx-auto mb-2" />
            <p className="text-gray-500 text-xs">Waiting for price data...</p>
          </div>
        </div>
      )}
      {isLocked && (
        <div className="absolute top-2 right-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1 flex items-center gap-1">
          <Lock size={10} className="text-amber-500" />
          <span className="text-amber-500 text-[10px] font-semibold">Locked</span>
        </div>
      )}
    </div>
  );
};

// ==================== LIVE POOL INDICATOR (CLEAN - NO AMOUNTS, NO COUNTS) ====================
const LivePoolIndicator = ({ totalUp, totalDown, isLocked = false, betAmount = 0 }) => {
  const total = totalUp + totalDown;
  const upPercent = total > 0 ? (totalUp / total) * 100 : 50;
  const downPercent = total > 0 ? (totalDown / total) * 100 : 50;

  // Calculate multipliers
  const calcUpMultiplier = () => {
    if (totalDown === 0 || totalUp === 0) return null;
    const simUp = totalUp + (betAmount > 0 ? betAmount : 0);
    const simDown = totalDown;
    return roundToTwo(1 + (simDown * 0.7) / simUp);
  };

  const calcDownMultiplier = () => {
    if (totalUp === 0 || totalDown === 0) return null;
    const simDown = totalDown + (betAmount > 0 ? betAmount : 0);
    const simUp = totalUp;
    return roundToTwo(1 + (simUp * 0.7) / simDown);
  };

  const upMultiplier = calcUpMultiplier();
  const downMultiplier = calcDownMultiplier();

  const upPayout = betAmount > 0 && upMultiplier ? roundToTwo(betAmount * upMultiplier) : null;
  const downPayout = betAmount > 0 && downMultiplier ? roundToTwo(betAmount * downMultiplier) : null;

  return (
    <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-700/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
          <Activity size={12} className="text-primary" />
          {isLocked ? 'Final Distribution' : 'Live Distribution'}
        </span>
        {!isLocked && (
          <span className="text-[10px] text-green-500 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            LIVE
          </span>
        )}
      </div>

      {/* Percentage Bar */}
      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden flex mb-3">
        <div
          className="bg-gradient-to-r from-green-600 to-green-400 transition-all duration-700 ease-out rounded-l-full"
          style={{ width: `${upPercent}%` }}
        />
        <div
          className="bg-gradient-to-r from-red-400 to-red-600 transition-all duration-700 ease-out rounded-r-full"
          style={{ width: `${downPercent}%` }}
        />
      </div>

      {/* UP / DOWN Cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* UP Side */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} className="text-green-500" />
            <span className="text-green-500 text-xs font-semibold">UP</span>
            <span className="text-green-400 text-xs font-bold ml-auto">{upPercent.toFixed(0)}%</span>
          </div>

          {upMultiplier ? (
            <>
              <div className="text-green-400 text-xl font-black leading-none mb-1">
                {upMultiplier}x
              </div>
              {upPayout && (
                <div className="text-[10px] text-gray-400">
                  Win: <span className="text-green-400 font-semibold">₦{formatCurrency(upPayout)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-yellow-500 text-[10px] font-medium">No DOWN bets yet</div>
          )}
        </div>

        {/* DOWN Side */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown size={12} className="text-red-500" />
            <span className="text-red-500 text-xs font-semibold">DOWN</span>
            <span className="text-red-400 text-xs font-bold ml-auto">{downPercent.toFixed(0)}%</span>
          </div>

          {downMultiplier ? (
            <>
              <div className="text-red-400 text-xl font-black leading-none mb-1">
                {downMultiplier}x
              </div>
              {downPayout && (
                <div className="text-[10px] text-gray-400">
                  Win: <span className="text-red-400 font-semibold">₦{formatCurrency(downPayout)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-yellow-500 text-[10px] font-medium">No UP bets yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== PREVIOUS ROUND CARD ====================
const PreviousRoundCard = ({ round }) => {
  if (!round) return null;
  const priceChange = parseFloat(round.percentChange || 0);

  return (
    <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/40 hover:border-slate-600/60 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-[10px] text-gray-500 font-medium">Round #{round.roundNumber}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(round.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className={`px-2 py-1 rounded-lg font-semibold text-[10px] ${
          round.result === 'up' ? 'bg-green-500/10 text-green-400' :
          round.result === 'down' ? 'bg-red-500/10 text-red-400' :
          'bg-yellow-500/10 text-yellow-400'
        }`}>
          {round.result === 'up' ? '↑ UP' : round.result === 'down' ? '↓ DOWN' : '— TIE'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <div className="bg-slate-900/50 p-2 rounded-lg">
          <p className="text-[9px] text-gray-500 mb-0.5">Start</p>
          <p className="text-xs font-bold text-white truncate">${parseFloat(round.startPrice || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/50 p-2 rounded-lg">
          <p className="text-[9px] text-gray-500 mb-0.5">End</p>
          <p className="text-xs font-bold text-white truncate">${parseFloat(round.endPrice || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className={`text-center py-1.5 rounded-lg font-bold text-xs ${
        priceChange >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
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
      icon: <Target className="w-10 h-10 text-primary" />,
      title: "Welcome! 🎯",
      content: "Predict if Bitcoin price will go UP or DOWN in 5 minutes!",
      tip: "Just pick a direction and place your bet!"
    },
    {
      icon: <Clock className="w-10 h-10 text-blue-500" />,
      title: "How It Works ⏰",
      content: "• Active (5 min): Place bets\n• Locked (5 min): Wait for result",
      tip: "There's always an active round!"
    },
    {
      icon: <DollarSign className="w-10 h-10 text-green-500" />,
      title: "Place a Bet 💰",
      content: "1. Select amount (min ₦100)\n2. Click UP or DOWN\n3. Wait for result!",
      tip: "Payouts update in real-time!"
    },
    {
      icon: <Trophy className="w-10 h-10 text-yellow-500" />,
      title: "Win Big! 🏆",
      content: "Correct prediction = Your bet × multiplier!",
      tip: "Higher multiplier = Bigger wins!"
    },
    {
      icon: <Gift className="w-10 h-10 text-purple-500" />,
      title: "Refer & Earn 🎁",
      content: "Earn 25% commission from referrals' first bet!",
      tip: "Unlimited referrals = Unlimited earnings!"
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-700/50 overflow-hidden my-8 shadow-2xl">
        <div className="bg-gradient-to-r from-primary to-purple-600 p-5 text-center relative">
          <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white">
            <X size={20} />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            {steps[currentStep].icon}
          </div>
          <h2 className="text-lg font-bold text-white">{steps[currentStep].title}</h2>
        </div>

        <div className="p-5">
          <p className="text-gray-300 whitespace-pre-line text-center mb-4 text-sm">{steps[currentStep].content}</p>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
            <Info className="text-primary flex-shrink-0 mt-0.5" size={14} />
            <p className="text-xs text-gray-300">{steps[currentStep].tip}</p>
          </div>
        </div>

        <div className="flex justify-center gap-1.5 pb-3">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-gray-600'}`}
            />
          ))}
        </div>

        <div className="p-4 pt-0 flex gap-2">
          {currentStep > 0 && (
            <button onClick={() => setCurrentStep(prev => prev - 1)} className="flex-1 py-2.5 bg-slate-700/60 text-white rounded-xl font-semibold text-sm">
              ← Back
            </button>
          )}
          {currentStep < steps.length - 1 ? (
            <button onClick={() => setCurrentStep(prev => prev + 1)} className="flex-1 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm">
              Next →
            </button>
          ) : (
            <button onClick={onClose} className="flex-1 py-2.5 bg-green-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <CheckCircle size={16} />
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
  const [activeTimeLeft, setActiveTimeLeft] = useState(0);
  const [lockedTimeLeft, setLockedTimeLeft] = useState(0);
  const timerIntervalRef = useRef(null);

  const walletBalance = parseFloat(walletData?.nairaBalance || 0);
  const lockedBalance = parseFloat(walletData?.lockedBalance || 0);
  const availableBalance = roundToTwo(walletBalance - lockedBalance);
  const activePriceChange = activeStartPrice > 0 ? ((currentPrice - activeStartPrice) / activeStartPrice) * 100 : 0;
  const lockedPriceChange = lockedStartPrice > 0 ? ((currentPrice - lockedStartPrice) / lockedStartPrice) * 100 : 0;
  const canBet = activeRound?.status === 'active' && activeTimeLeft >= 10;

  const slides = [
    { id: 'previous', label: 'History' },
    { id: 'locked', label: 'Locked' },
    { id: 'active', label: 'Live' },
    { id: 'upcoming', label: 'Next' }
  ];

  const goToReferralPage = () => {
    setShowReferralPopup(false);
    navigate('/referrals');
  };

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

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenTradingGuide');
    if (!hasSeenGuide && user) {
      setShowGuide(true);
      localStorage.setItem('hasSeenTradingGuide', 'true');
    }
  }, [user]);

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
        if (data.lockedRound) {
          setLockedRound(prev => {
            if (prev?.id === data.lockedRound.id) return { ...data.lockedRound };
            return data.lockedRound;
          });
          setLockedStartPrice(parseFloat(data.lockedRound.startPrice || 0));
        }
        if (data.activeRound) {
          setActiveRound(prev => {
            if (prev?.id === data.activeRound.id) return { ...prev, ...data.activeRound };
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
      setMyActiveBets([]);
    }
  };

  const initDashboard = useCallback(async () => {
    setDataLoading(true);
    try {
      await Promise.all([fetchWalletData(), fetchAllRounds(), fetchCurrentPrice(), fetchMyBets()]);
    } catch (err) {
      console.error('Dashboard init error:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) initDashboard();
  }, [user, initDashboard]);

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
    toast.success('Refreshed!');
  };

  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (activeRound?.lockTime) {
        const lockTime = new Date(activeRound.lockTime).getTime();
        setActiveTimeLeft(Math.max(0, Math.floor((lockTime - now) / 1000)));
      } else {
        setActiveTimeLeft(0);
      }
      if (lockedRound?.endTime) {
        const endTime = new Date(lockedRound.endTime).getTime();
        setLockedTimeLeft(Math.max(0, Math.floor((endTime - now) / 1000)));
      } else {
        setLockedTimeLeft(0);
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeRound?.lockTime, lockedRound?.endTime]);

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
      fetchAllRounds();
      fetchMyBets();
      if (data.startPrice) setActiveStartPrice(parseFloat(data.startPrice));
      toast.success(`🚀 Round #${data.roundNumber} Started!`, { duration: 3000 });
      setActiveSlide(2);
    });

    socket.on('round_locked', (data) => {
      setPriceHistory(prev => {
        setLockedPriceHistory([...prev]);
        return prev;
      });
      fetchAllRounds();
      fetchMyBets();
      if (data.startPrice) setLockedStartPrice(parseFloat(data.startPrice));
      toast('🔒 Betting closed!', { icon: '⏰', duration: 3000 });
    });

    socket.on('round_completed', (data) => {
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

  const handlePlaceBet = async (prediction) => {
    if (!activeRound) { toast.error('No active round.'); return; }
    if (activeRound.status !== 'active') { toast.error('Round not accepting bets.'); return; }
    if (activeTimeLeft < 10) { toast.error('Too late to bet!'); return; }
    if (!betAmount || betAmount < 100) { toast.error('Minimum bet is ₦100'); return; }
    if (betAmount > 100000) { toast.error('Maximum bet is ₦100,000'); return; }
    if (betAmount > availableBalance) { toast.error('Insufficient balance!'); return; }

    setLoading(true);
    try {
      await api.post('/trading/bet', {
        roundId: activeRound.id,
        prediction: prediction.toLowerCase(),
        amount: betAmount
      });
      toast.success(`✅ Bet ₦${betAmount.toLocaleString()} on ${prediction.toUpperCase()}!`, { duration: 3000 });
      await Promise.all([fetchMyBets(), fetchAllRounds(), fetchWalletData()]);
    } catch (err) {
      toast.error(err.message || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-transparent border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24 lg:pb-8">
      <UserGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <ReferralPromoPopup isOpen={showReferralPopup} onClose={() => setShowReferralPopup(false)} onGoToReferral={goToReferralPage} />
      <FloatingReferralButton onClick={() => setShowReferralPopup(true)} />
      <FloatingSupportButton />

      {!isConnected && (
        <div className="bg-yellow-500/5 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="text-yellow-500 animate-pulse" size={14} />
          <p className="text-yellow-500 text-xs font-medium">Reconnecting...</p>
        </div>
      )}

      <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto space-y-3">

        {/* ========== HEADER ========== */}
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/30 shadow-xl">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Activity className="text-primary" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white truncate">Wealth Trading</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-500">BTC/USD · 5-Min Rounds</span>
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-green-500 text-[10px] font-semibold px-1.5 py-0.5 bg-green-500/10 rounded-full">
                      <Wifi size={8} /> LIVE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-500 text-[10px] font-semibold px-1.5 py-0.5 bg-yellow-500/10 rounded-full">
                      <WifiOff size={8} /> ...
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setShowGuide(true)} className="p-2 bg-slate-700/50 text-gray-400 hover:text-white rounded-xl border border-slate-600/30 transition-all">
                  <HelpCircle size={16} />
                </button>
                <button onClick={() => setShowReferralPopup(true)} className="p-2 bg-gradient-to-br from-purple-600/80 to-pink-600/80 text-white rounded-xl">
                  <Gift size={16} />
                </button>
                <button onClick={handleRefresh} disabled={refreshing} className="p-2 bg-slate-700/50 text-gray-400 hover:text-white rounded-xl border border-slate-600/30 transition-all">
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Balance */}
            <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Available Balance</p>
                  <p className="text-2xl font-black text-white">₦{formatCurrency(availableBalance)}</p>
                  {lockedBalance > 0 && (
                    <p className="text-[10px] text-orange-400 mt-0.5 flex items-center gap-1">
                      <Lock size={9} /> ₦{formatCurrency(lockedBalance)} locked
                    </p>
                  )}
                </div>
                <div className="p-2.5 bg-green-500/10 rounded-xl">
                  <WalletIcon className="text-green-400" size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== LIVE PRICE ========== */}
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/30 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-xl">
                <TrendUp size={18} className="text-orange-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-0.5">
                  Live BTC Price
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                </p>
                <h2 className="text-2xl font-black text-white">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
            </div>

            {activeStartPrice > 0 && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${
                activePriceChange >= 0
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {activePriceChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {activePriceChange >= 0 ? '+' : ''}{activePriceChange.toFixed(3)}%
              </div>
            )}
          </div>
        </div>

        {/* ========== ROUNDS CAROUSEL ========== */}
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-3 border border-slate-700/30 shadow-xl">
          {/* Nav */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))}
                disabled={activeSlide === 0}
                className="p-1.5 bg-slate-700/50 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex gap-1">
                {slides.map((slide, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      activeSlide === i
                        ? i === 2
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {i === 2 && activeSlide === i && (
                      <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                    )}
                    {slide.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setActiveSlide(prev => Math.min(3, prev + 1))}
                disabled={activeSlide === 3}
                className="p-1.5 bg-slate-700/50 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Slides */}
          <div className="overflow-hidden rounded-xl">
            <div className="flex transition-transform duration-400 ease-out" style={{ transform: `translateX(-${activeSlide * 100}%)` }}>

              {/* SLIDE 0: Previous Rounds */}
              <div className="min-w-full">
                <div className="flex items-center gap-2 mb-3">
                  <History className="text-gray-400" size={16} />
                  <h3 className="text-sm font-semibold text-gray-300">Previous Rounds</h3>
                </div>
                {previousRounds.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {previousRounds.map((round) => (
                      <PreviousRoundCard key={round.id} round={round} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-900/30 rounded-xl border border-dashed border-slate-700/40">
                    <Trophy className="text-gray-700 mx-auto mb-2" size={32} />
                    <p className="text-gray-500 text-sm">No completed rounds yet</p>
                  </div>
                )}
              </div>

              {/* SLIDE 1: Locked Round */}
              <div className="min-w-full">
                {lockedRound ? (
                  <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-500/10 rounded-lg">
                          <Lock className="text-amber-500" size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] text-amber-400 font-medium">Round #{lockedRound.roundNumber}</p>
                          <h3 className="text-base font-bold text-white">Awaiting Result</h3>
                        </div>
                      </div>

                      <div className={`px-4 py-2 rounded-xl border w-full sm:w-auto text-center ${
                        lockedTimeLeft < 30 ? 'bg-red-500/10 border-red-500/30' :
                        lockedTimeLeft < 60 ? 'bg-yellow-500/10 border-yellow-500/30' :
                        'bg-amber-500/10 border-amber-500/30'
                      }`}>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wide">Result In</p>
                        <p className={`text-2xl font-mono font-black ${
                          lockedTimeLeft < 30 ? 'text-red-500 animate-pulse' :
                          lockedTimeLeft < 60 ? 'text-yellow-500' : 'text-amber-500'
                        }`}>
                          {formatTime(lockedTimeLeft)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/30">
                        <p className="text-[9px] text-gray-500 mb-0.5">Start Price</p>
                        <p className="text-sm font-bold text-white">${lockedStartPrice.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/30">
                        <p className="text-[9px] text-gray-500 mb-0.5">Current Price</p>
                        <p className="text-sm font-bold text-white">${currentPrice.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className={`flex items-center justify-center gap-2 py-2 rounded-xl mb-3 text-sm font-bold ${
                      lockedPriceChange >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {lockedPriceChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {lockedPriceChange >= 0 ? '+' : ''}{lockedPriceChange.toFixed(3)}%
                    </div>

                    <div className="bg-slate-900/50 rounded-xl p-2 mb-3">
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
                      isLocked={true}
                      betAmount={betAmount}
                    />
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-900/30 rounded-xl border border-dashed border-slate-700/40">
                    <Lock className="text-gray-700 mx-auto mb-2" size={32} />
                    <p className="text-gray-500 text-sm">No locked round</p>
                  </div>
                )}
              </div>

              {/* SLIDE 2: Active Round */}
              <div className="min-w-full">
                {activeRound ? (
                  <div className="bg-primary/5 rounded-xl p-3 border border-primary/20">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="relative p-1.5 bg-red-500/10 rounded-lg">
                          <Activity className="text-red-500" size={16} />
                          <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                        </div>
                        <div>
                          <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                            Round #{activeRound.roundNumber}
                          </p>
                          <h3 className="text-base font-bold text-white">Place Your Bet</h3>
                        </div>
                      </div>

                      <div className={`px-4 py-2 rounded-xl border w-full sm:w-auto text-center ${
                        activeTimeLeft < 30 ? 'bg-red-500/10 border-red-500/30' :
                        activeTimeLeft < 60 ? 'bg-yellow-500/10 border-yellow-500/30' :
                        'bg-slate-900/60 border-slate-700/30'
                      }`}>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wide">Betting Closes</p>
                        <p className={`text-2xl font-mono font-black ${
                          activeTimeLeft < 30 ? 'text-red-500 animate-pulse' :
                          activeTimeLeft < 60 ? 'text-yellow-500' : 'text-primary'
                        }`}>
                          {formatTime(activeTimeLeft)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/30">
                        <p className="text-[9px] text-gray-500 mb-0.5">Start Price</p>
                        <p className="text-sm font-bold text-white">${activeStartPrice.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/30">
                        <p className="text-[9px] text-gray-500 mb-0.5">Current Price</p>
                        <p className="text-sm font-bold text-white">${currentPrice.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className={`flex items-center justify-center gap-2 py-2 rounded-xl mb-3 text-sm font-bold ${
                      activePriceChange >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {activePriceChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {activePriceChange >= 0 ? '+' : ''}{activePriceChange.toFixed(3)}%
                    </div>

                    <div className="bg-slate-900/50 rounded-xl p-2 mb-3">
                      <TradingChart
                        priceHistory={priceHistory}
                        startPrice={activeStartPrice}
                        currentPrice={currentPrice}
                        roundId={activeRound.id}
                      />
                    </div>

                    {/* Pool Indicator */}
                    <div className="mb-3">
                      <LivePoolIndicator
                        totalUp={parseFloat(activeRound.totalUpAmount || 0)}
                        totalDown={parseFloat(activeRound.totalDownAmount || 0)}
                        betAmount={betAmount}
                      />
                    </div>

                    {/* Bet Buttons */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {/* UP */}
                      {(() => {
                        const upCalc = calculatePotentialPayout('up');
                        return (
                          <button
                            onClick={() => handlePlaceBet('up')}
                            disabled={loading || !canBet}
                            className="relative group bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 hover:border-green-500/40 p-4 rounded-xl transition-all disabled:opacity-40"
                          >
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="p-2 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-all">
                                <ArrowUpRight size={22} className="text-green-400" />
                              </div>
                              <p className="text-sm font-bold text-green-400">UP</p>

                              {betAmount > 0 && upCalc.hasOpponents ? (
                                <div className="text-center mt-1 pt-1.5 border-t border-green-500/20 w-full">
                                  <p className="text-xs text-gray-400">Multiplier</p>
                                  <p className="text-xl font-black text-green-400">{upCalc.multiplier}x</p>
                                  <p className="text-[10px] text-gray-400">Win <span className="text-green-400 font-semibold">₦{formatCurrency(upCalc.payout)}</span></p>
                                </div>
                              ) : betAmount > 0 ? (
                                <div className="text-center mt-1 pt-1.5 border-t border-green-500/20 w-full">
                                  <p className="text-[10px] text-yellow-400">No opponents yet</p>
                                </div>
                              ) : (
                                <div className="text-center mt-1 pt-1.5 border-t border-green-500/20 w-full">
                                  <p className="text-[10px] text-gray-500">Set amount</p>
                                </div>
                              )}
                            </div>
                            {loading && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                                <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                              </div>
                            )}
                          </button>
                        );
                      })()}

                      {/* DOWN */}
                      {(() => {
                        const downCalc = calculatePotentialPayout('down');
                        return (
                          <button
                            onClick={() => handlePlaceBet('down')}
                            disabled={loading || !canBet}
                            className="relative group bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 p-4 rounded-xl transition-all disabled:opacity-40"
                          >
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="p-2 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-all">
                                <ArrowDownRight size={22} className="text-red-400" />
                              </div>
                              <p className="text-sm font-bold text-red-400">DOWN</p>

                              {betAmount > 0 && downCalc.hasOpponents ? (
                                <div className="text-center mt-1 pt-1.5 border-t border-red-500/20 w-full">
                                  <p className="text-xs text-gray-400">Multiplier</p>
                                  <p className="text-xl font-black text-red-400">{downCalc.multiplier}x</p>
                                  <p className="text-[10px] text-gray-400">Win <span className="text-red-400 font-semibold">₦{formatCurrency(downCalc.payout)}</span></p>
                                </div>
                              ) : betAmount > 0 ? (
                                <div className="text-center mt-1 pt-1.5 border-t border-red-500/20 w-full">
                                  <p className="text-[10px] text-yellow-400">No opponents yet</p>
                                </div>
                              ) : (
                                <div className="text-center mt-1 pt-1.5 border-t border-red-500/20 w-full">
                                  <p className="text-[10px] text-gray-500">Set amount</p>
                                </div>
                              )}
                            </div>
                            {loading && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                                <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
                              </div>
                            )}
                          </button>
                        );
                      })()}
                    </div>

                    {!canBet && activeTimeLeft < 10 && activeTimeLeft > 0 && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
                        <p className="text-red-400 font-semibold flex items-center justify-center gap-2 text-xs">
                          <AlertCircle size={14} /> Betting closed — round ending
                        </p>
                      </div>
                    )}

                    {activeTimeLeft === 0 && (
                      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 text-center">
                        <p className="text-yellow-400 font-semibold flex items-center justify-center gap-2 text-xs">
                          <Clock size={14} /> Locking round... New round starting soon
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-900/30 rounded-xl border border-dashed border-slate-700/40">
                    <Clock className="text-gray-700 animate-pulse mx-auto mb-2" size={32} />
                    <p className="text-gray-500 text-sm mb-4">Waiting for next round...</p>
                    <button onClick={handleRefresh} className="px-5 py-2.5 bg-primary/20 text-primary rounded-xl text-sm font-semibold flex items-center gap-2 mx-auto border border-primary/30">
                      <RefreshCw size={14} /> Refresh
                    </button>
                  </div>
                )}
              </div>

              {/* SLIDE 3: Upcoming */}
              <div className="min-w-full">
                {upcomingRound ? (
                  <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="p-1.5 bg-blue-500/10 rounded-lg">
                        <Timer className="text-blue-400" size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] text-blue-400 font-medium">Round #{upcomingRound.roundNumber}</p>
                        <h3 className="text-base font-bold text-white">Next Round</h3>
                      </div>
                    </div>

                    <div className="text-center py-6">
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
                        <div className="relative bg-blue-500/10 rounded-full flex items-center justify-center w-full h-full border border-blue-500/20">
                          <Play className="text-blue-400" size={28} />
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">Starts automatically</p>
                      <p className="text-gray-500 text-xs mb-4">when current round locks</p>

                      <div className="bg-slate-900/40 px-5 py-2.5 rounded-xl inline-block border border-slate-700/30">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Scheduled</p>
                        <p className="text-base font-bold text-white">
                          {new Date(upcomingRound.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-center">
                      <p className="text-blue-400 text-xs font-medium flex items-center justify-center gap-1.5">
                        <Zap size={12} /> Prepare your bet amount now!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-900/30 rounded-xl border border-dashed border-slate-700/40">
                    <Timer className="text-gray-700 mx-auto mb-2" size={32} />
                    <p className="text-gray-500 text-sm">No upcoming round</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========== BET AMOUNT ========== */}
        <div className="bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-700/30 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="text-primary" size={16} />
              <p className="text-sm font-semibold text-white">Bet Amount</p>
            </div>
            <p className="text-[10px] text-gray-500">
              Available: <span className="text-green-400 font-bold">₦{formatCurrency(availableBalance)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {[100, 500, 1000, 2000, 5000, 10000, 50000].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={amt > availableBalance}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                  betAmount === amt
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : amt > availableBalance
                    ? 'bg-slate-800/30 text-gray-600 cursor-not-allowed'
                    : 'bg-slate-700/40 text-gray-300 hover:bg-slate-700/60 border border-slate-600/20'
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
              className="bg-slate-900/50 border border-slate-700/30 focus:border-primary/50 rounded-lg px-3 py-1.5 text-white w-24 focus:outline-none text-xs"
              onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
            />
          </div>

          <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 pt-2 border-t border-slate-700/20">
            <span className="flex items-center gap-1"><Info size={10} className="text-blue-400" /> Min ₦100</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Info size={10} className="text-blue-400" /> Max ₦100,000</span>
            <span>·</span>
            <span className="text-primary flex items-center gap-1"><Shield size={10} /> No fees</span>
          </div>
        </div>

        {/* ========== MY ACTIVE BETS ========== */}
        <div className="bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-700/30 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="text-primary" size={16} />
              <h3 className="text-sm font-semibold text-white">Active Bets</h3>
            </div>
            <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
              {myActiveBets.length}
            </span>
          </div>

          {myActiveBets.length === 0 ? (
            <div className="text-center py-8 bg-slate-900/20 rounded-xl border border-dashed border-slate-700/30">
              <Activity size={28} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-xs">No active bets</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {myActiveBets.map(bet => {
                const betAmountValue = parseFloat(bet.stakeAmount || bet.amount);
                const multiplier = bet.currentMultiplierRaw || 1.7;
                const potentialPayout = roundToTwo(betAmountValue * multiplier);
                const potentialProfit = roundToTwo(potentialPayout - betAmountValue);

                return (
                  <div
                    key={bet.id}
                    className={`bg-slate-900/40 p-3 rounded-xl border transition-all ${
                      bet.prediction === 'up' ? 'border-green-500/20' : 'border-red-500/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <p className={`text-[10px] font-semibold uppercase flex items-center gap-1 mb-1 ${
                          bet.prediction === 'up' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {bet.prediction === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {bet.prediction}
                        </p>
                        <p className="text-white font-bold text-base">₦{formatCurrency(bet.amount || bet.stakeAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-gray-500 mb-0.5">Potential Win</p>
                        <p className="text-sm font-bold text-primary">₦{formatCurrency(potentialPayout)}</p>
                        <p className="text-[9px] text-green-400">+₦{formatCurrency(potentialProfit)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] pt-2 border-t border-slate-700/30">
                      <span className="text-gray-500 flex items-center gap-1">
                        {bet.roundStatus === 'locked' && <Lock size={9} className="text-amber-400" />}
                        Round #{bet.roundNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        bet.prediction === 'up' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
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

        {/* ========== REFERRAL PROMO BANNER ========== */}
        <div className="bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-orange-500/10 p-4 rounded-2xl border border-purple-500/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500/80 to-pink-500/80 rounded-xl flex items-center justify-center flex-shrink-0">
                <Gift className="text-white" size={18} />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Refer & Earn 25% 🎁</h3>
                <p className="text-gray-400 text-xs">Commission from referral's first bet</p>
              </div>
            </div>
            <button
              onClick={goToReferralPage}
              className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all border border-purple-500/30"
            >
              <Share2 size={14} /> Start Referring
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
