
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
  History,
  BarChart3
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

// ==================== PROFESSIONAL TRADING CHART (FIXED - NO MORE BLANK PAGE) ====================
const TradingChart = ({ priceHistory, startPrice, currentPrice, isLocked = false, roundId }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLineRef = useRef(null);
  const lastRoundIdRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // ✅ Initialize chart ONLY when round changes OR first mount
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Only recreate if round changed
    if (lastRoundIdRef.current === roundId && chartRef.current) {
      return;
    }

    // Cleanup previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRef.current = null;
    }

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    lastRoundIdRef.current = roundId;

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
        fixLeftEdge: true,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
        autoScale: true,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: isLocked ? '#f59e0b' : '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: isLocked ? '#f59e0b' : '#6366f1',
        },
        horzLine: {
          color: isLocked ? '#f59e0b' : '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: isLocked ? '#f59e0b' : '#6366f1',
        },
      },
      handleScroll: {
        vertTouchDrag: false,
        mouseWheel: false,
        pressedMouseMove: false,
      },
      handleScale: {
        axisPressedMouseMove: false,
        mouseWheel: false,
        pinch: false,
      },
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
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    // ✅ Handle responsive resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const width = chartContainerRef.current.clientWidth;
        chartRef.current.applyOptions({ width });
        chartRef.current.timeScale().fitContent();
      }
    };

    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(chartContainerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [roundId, isLocked]);

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

  // ✅ FIX: Update chart data with proper timestamp handling
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || priceHistory.length === 0) return;

    try {
      // ✅ Convert to proper UTC timestamps and sort
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
        .filter(item => item.value > 0 && item.time > 0) // Remove invalid data
        .sort((a, b) => a.time - b.time); // ✅ Sort by time ascending

      // ✅ Remove duplicate timestamps (keep last value)
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
        
        // ✅ Fit content and scroll to latest
        chartRef.current.timeScale().fitContent();
        chartRef.current.timeScale().scrollToRealTime();
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
      {priceHistory.length === 0 && (
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
    <div className="bg-slate-900/50 rounded-xl p-5 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-white font-bold flex items-center gap-2">
          <Users size={18} className="text-primary" />
          {isLocked ? 'Final Pool Distribution' : 'Live Pool Distribution'}
        </span>
        {!isLocked && (
          <span className="text-xs text-green-500 font-bold flex items-center gap-1 animate-pulse">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            LIVE
          </span>
        )}
      </div>
      
      <div className="h-5 bg-slate-700/50 rounded-full overflow-hidden flex mb-4 shadow-inner">
        <div 
          className="bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500 ease-out flex items-center justify-center relative"
          style={{ width: `${upPercent}%` }}
        >
          {upPercent > 15 && (
            <span className="text-xs text-white font-black drop-shadow-lg">{upPercent.toFixed(0)}%</span>
          )}
        </div>
        <div 
          className="bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500 ease-out flex items-center justify-center relative"
          style={{ width: `${downPercent}%` }}
        >
          {downPercent > 15 && (
            <span className="text-xs text-white font-black drop-shadow-lg">{downPercent.toFixed(0)}%</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col bg-green-500/10 p-4 rounded-xl border border-green-500/30 hover:border-green-500/50 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-green-500 font-bold text-lg">UP</p>
              <p className="text-xs text-gray-400">{upBets} bets</p>
            </div>
          </div>
          <p className="text-green-500 font-black text-2xl">₦{formatCurrency(totalUp)}</p>
        </div>
        
        <div className="flex flex-col bg-red-500/10 p-4 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <TrendingDown className="text-red-500" size={20} />
            </div>
            <div>
              <p className="text-red-500 font-bold text-lg">DOWN</p>
              <p className="text-xs text-gray-400">{downBets} bets</p>
            </div>
          </div>
          <p className="text-red-500 font-black text-2xl">₦{formatCurrency(totalDown)}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-400 text-sm">Total Pool:</span>
          <span className="text-white font-black text-xl">₦{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

// ==================== PREVIOUS ROUND CARD ====================
const PreviousRoundCard = ({ round, index }) => {
  if (!round) return null;

  const priceChange = parseFloat(round.percentChange || 0);

  return (
    <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700 hover:border-slate-600 hover:shadow-xl hover:shadow-slate-900/50 transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <History size={12} />
            Round #{round.roundNumber}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {new Date(round.endTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg ${
          round.result === 'up'
            ? 'bg-green-500/20 text-green-500 border border-green-500/30'
            : round.result === 'down'
            ? 'bg-red-500/20 text-red-500 border border-red-500/30'
            : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
        }`}>
          {round.result === 'up' ? '📈 UP' :
           round.result === 'down' ? '📉 DOWN' : '➖ TIE'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/50">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Start</p>
          <p className="text-base font-bold text-white mt-1">
            ${parseFloat(round.startPrice || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/50">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">End</p>
          <p className="text-base font-bold text-white mt-1">
            ${parseFloat(round.endPrice || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className={`text-center py-3 rounded-xl font-black text-lg ${
        priceChange >= 0 
          ? 'bg-green-500/10 text-green-500 border border-green-500/30' 
          : 'bg-red-500/10 text-red-500 border border-red-500/30'
      }`}>
        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
        <div className={`p-3 rounded-lg ${round.result === 'up' ? 'bg-green-500/20 ring-2 ring-green-500/50' : 'bg-green-500/5'}`}>
          <span className="text-green-400 block mb-1">UP Pool</span>
          <span className="text-white font-bold text-sm">₦{formatCurrency(round.totalUpAmount)}</span>
        </div>
        <div className={`p-3 rounded-lg ${round.result === 'down' ? 'bg-red-500/20 ring-2 ring-red-500/50' : 'bg-red-500/5'}`}>
          <span className="text-red-400 block mb-1">DOWN Pool</span>
          <span className="text-white font-bold text-sm">₦{formatCurrency(round.totalDownAmount)}</span>
        </div>
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
      content: "Each round has 2 phases:\n\n• Active (5 min): Place your bets\n• Locked (5 min): Watch the chart, wait for result\n\nWhen a round locks, a NEW round starts immediately!",
      tip: "There's always an active round to bet on!"
    },
    {
      icon: <DollarSign className="w-12 h-12 text-green-500" />,
      title: "Placing a Bet 💰",
      content: "1. Select your bet amount (min ₦100)\n2. Check the potential payout\n3. Click PREDICT UP or PREDICT DOWN\n4. Wait for the round to lock!",
      tip: "The potential payout updates in real-time based on the pool!"
    },
    {
      icon: <Eye className="w-12 h-12 text-amber-500" />,
      title: "Locked Round = Watch & Wait 👀",
      content: "When your round LOCKS:\n• You can still see the live chart\n• Watch the price movement\n• Result calculated after 5 minutes\n\nMeanwhile, bet on the NEW active round!",
      tip: "Swipe to see the locked round with its chart!"
    },
    {
      icon: <Trophy className="w-12 h-12 text-yellow-500" />,
      title: "Winning & Payouts 🏆",
      content: "If your prediction is correct:\n• You get your bet back\n• Plus 70% of the losing pool!\n\nThe more opponents, the higher your potential win!",
      tip: "No opponents = Full refund if you win"
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
      <div className="bg-slate-900 rounded-3xl max-w-md w-full border border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl">
        <div className="bg-gradient-to-r from-primary to-purple-600 p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
          >
            <X size={24} />
          </button>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
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
  const [lockedPriceHistory, setLockedPriceHistory] = useState([]);
  const [previousRounds, setPreviousRounds] = useState([]);
  const [lockedRound, setLockedRound] = useState(null);
  const [activeRound, setActiveRound] = useState(null);
  const [upcomingRound, setUpcomingRound] = useState(null);
  const [activeSlide, setActiveSlide] = useState(2);
  const [betAmount, setBetAmount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [activeTimeLeft, setActiveTimeLeft] = useState(0);
  const [lockedTimeLeft, setLockedTimeLeft] = useState(0);
  const [myActiveBets, setMyActiveBets] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeStartPrice, setActiveStartPrice] = useState(0);
  const [lockedStartPrice, setLockedStartPrice] = useState(0);
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
  const activePriceChange = activeStartPrice > 0 ? ((currentPrice - activeStartPrice) / activeStartPrice) * 100 : 0;
  const lockedPriceChange = lockedStartPrice > 0 ? ((currentPrice - lockedStartPrice) / lockedStartPrice) * 100 : 0;
  const canBet = activeRound?.status === 'active' && activeTimeLeft >= 10;

  // ========== SLIDE CONFIGURATION ==========
  const slides = [
    { id: 'previous', label: '📊 History (3)' },
    { id: 'locked', label: '🔒 Locked Round' },
    { id: 'active', label: '🔴 LIVE Betting' },
    { id: 'upcoming', label: '⏳ Next Round' }
  ];

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

  // ========== MULTIPLIER CALCULATION ==========
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

  // ========== GET CURRENT POOL MULTIPLIER ==========
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

  // ========== FETCH ALL ROUNDS ==========
  const fetchAllRounds = async () => {
    try {
      const data = await api.get('/trading/rounds/all');

      if (data) {
        setPreviousRounds(data.previousRounds || []);
        
        if (data.lockedRound) {
          setLockedRound(data.lockedRound);
          setLockedStartPrice(parseFloat(data.lockedRound.startPrice || 0));
        } else {
          setLockedRound(null);
        }
        
        if (data.activeRound) {
          setActiveRound(data.activeRound);
          setActiveStartPrice(parseFloat(data.activeRound.startPrice || 0));
        } else {
          setActiveRound(null);
        }
        
        setUpcomingRound(data.upcomingRound || null);
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
        const priceValue = parseFloat(price);
        setCurrentPrice(priceValue);
        
        const now = Date.now();
        const newEntry = {
          time: now,
          price: priceValue
        };
        
        // ✅ Update active round price history
        setPriceHistory(prev => {
          const updated = [...prev, newEntry].slice(-60);
          return updated;
        });
        
        // ✅ Update locked round price history (if exists)
        if (lockedRound) {
          setLockedPriceHistory(prev => {
            const updated = [...prev, newEntry].slice(-120);
            return updated;
          });
        }
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

  // ========== SOCKET LISTENERS (FIXED - NO MORE BLANK PAGE) ==========
  useEffect(() => {
    if (!socket || !isConnected) return;

    // ✅ Price updates
    socket.on('price_update', (data) => {
      if (data?.price) {
        const priceValue = parseFloat(data.price);
        setCurrentPrice(priceValue);
        
        const now = Date.now();
        const newEntry = {
          time: now,
          price: priceValue
        };
        
        setPriceHistory(prev => [...prev, newEntry].slice(-60));
        
        if (lockedRound) {
          setLockedPriceHistory(prev => [...prev, newEntry].slice(-120));
        }
      }
    });

    // Bet placed by ANY user
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

    // ✅ FIX: Round started - DON'T clear price history immediately
    socket.on('round_start', (data) => {
      console.log('🚀 Round started:', data);
      fetchAllRounds();
      fetchMyBets();
      if (data.startPrice) {
        setActiveStartPrice(parseFloat(data.startPrice));
      }
      
      // ✅ DON'T reset price history here - let it naturally update
      // The chart will show existing data until new data arrives
      
      toast.success(`🚀 Round #${data.roundNumber} Started! Place your bets!`, { duration: 3000 });
      setActiveSlide(2);
    });

    // Round locked
    socket.on('round_locked', (data) => {
      console.log('🔒 Round locked:', data);
      fetchAllRounds();
      fetchMyBets();
      
      // ✅ Preserve price history for locked round
      setLockedPriceHistory([...priceHistory]);
      setLockedStartPrice(parseFloat(data.startPrice || 0));
      
      toast('🔒 Betting closed! Waiting for result...', { 
        icon: '⏰', 
        duration: 3000 
      });
    });

    // Round completed
    socket.on('round_completed', (data) => {
      console.log('🏁 Round completed:', data);
      fetchAllRounds();
      fetchMyBets();
      fetchWalletData();
      
      const emoji = data.result === 'up' ? '📈' : data.result === 'down' ? '📉' : '➖';
      toast.success(`${emoji} Round #${data.roundNumber} Result: ${data.result?.toUpperCase()}!`, { duration: 4000 });
    });

    // Bet result for current user
    socket.on('bet_result', (data) => {
      fetchMyBets();
      fetchWalletData();
      
      if (data.result === 'win') {
        toast.success(`🎉 You WON ₦${data.payout?.toLocaleString()}! (${data.multiplier}x)`, { duration: 5000 });
        
        if (data.payout > 2000) {
          setTimeout(() => {
            setShowReferralPopup(true);
          }, 4000);
        }
      } else if (data.result === 'loss') {
        toast.error(`😢 You lost ₦${Math.abs(data.profit || data.amount)?.toLocaleString()}`, { duration: 4000 });
      } else if (data.result === 'refund') {
        toast.success(`🔄 Refunded ₦${data.payout?.toLocaleString()}`, { duration: 4000 });
      }
    });

    // Balance update
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
      socket.off('round_completed');
      socket.off('bet_result');
      socket.off('balance_update');
    };
  }, [socket, isConnected, priceHistory, lockedRound]);

  // ========== COUNTDOWN TIMERS ==========
  useEffect(() => {
    const updateTimers = () => {
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
    };

    updateTimers();
    const interval = setInterval(updateTimers, 100);

    return () => clearInterval(interval);
  }, [activeRound, lockedRound]);

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

    if (activeTimeLeft < 10) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24 lg:pb-8">
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
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-3 flex items-center justify-center gap-2 backdrop-blur-sm">
          <WifiOff className="text-yellow-500 animate-pulse" size={18} />
          <p className="text-yellow-500 text-sm font-medium">Reconnecting to live data...</p>
        </div>
      )}

      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* ==================== MATERIAL DESIGN HEADER CARD ==================== */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl shadow-slate-900/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Left Section */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/20 rounded-2xl">
                  <Activity className="text-primary animate-pulse" size={32} />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                    Wealth Trading
                  </h1>
                  <p className="text-gray-400 flex items-center gap-2 mt-1">
                    <span className="text-sm lg:text-base">BTC/USD 5-Minute Prediction</span>
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-green-500 text-xs font-bold px-2 py-1 bg-green-500/10 rounded-full">
                        <Wifi size={12} /> LIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-500 text-xs font-bold px-2 py-1 bg-yellow-500/10 rounded-full">
                        <WifiOff size={12} /> Connecting...
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Section - Balance & Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
              {/* Balance Card */}
              <div className="flex-1 lg:flex-none bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-sm p-5 rounded-2xl border border-green-500/30 shadow-lg shadow-green-500/10">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-medium">Available Balance</p>
                    <p className="text-2xl lg:text-3xl font-black text-green-400 tabular-nums">
                      ₦{formatCurrency(availableBalance)}
                    </p>
                    {lockedBalance > 0 && (
                      <p className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                        <Lock size={10} />
                        Locked: ₦{formatCurrency(lockedBalance)}
                      </p>
                    )}
                  </div>
                  <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-500 shadow-lg">
                    <WalletIcon size={28} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowGuide(true)}
                  className="p-3.5 bg-slate-800/80 backdrop-blur-sm text-gray-400 hover:text-white rounded-2xl border border-slate-700 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20 hover:scale-105"
                  title="How to Play"
                >
                  <HelpCircle size={22} />
                </button>

                <button
                  onClick={() => setShowReferralPopup(true)}
                  className="p-3.5 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl border border-purple-500/50 transition-all hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/30 hover:scale-105"
                  title="Refer & Earn 25%"
                >
                  <Gift size={22} />
                </button>

                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-3.5 bg-slate-800/80 backdrop-blur-sm text-gray-400 hover:text-white rounded-2xl border border-slate-700 transition-all disabled:opacity-50 hover:border-primary hover:shadow-lg hover:shadow-primary/20 hover:scale-105"
                  title="Refresh Data"
                >
                  <RefreshCw size={22} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== LIVE PRICE BANNER (MATERIAL DESIGN) ==================== */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl shadow-slate-900/50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-2xl text-orange-500 shadow-lg">
                <TrendUp size={32} />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase flex items-center gap-2 mb-1 font-medium tracking-wider">
                  Live BTC Price
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                </p>
                <h2 className="text-3xl lg:text-4xl font-black text-white tabular-nums tracking-tight">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
            </div>

            {activeStartPrice > 0 && (
              <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 shadow-lg ${
                activePriceChange >= 0 
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30' 
                  : 'bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30'
              }`}>
                <div className={`p-2 rounded-xl ${
                  activePriceChange >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {activePriceChange >= 0 ? 
                    <TrendingUp className="text-green-500" size={24} /> : 
                    <TrendingDown className="text-red-500" size={24} />
                  }
                </div>
                <div>
                  <span className={`font-black tabular-nums text-2xl ${
                    activePriceChange >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {activePriceChange >= 0 ? '+' : ''}{activePriceChange.toFixed(3)}%
                  </span>
                  <p className="text-xs opacity-70 text-gray-400 mt-0.5">from active start</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================== SWIPEABLE ROUNDS (MATERIAL CARDS) ==================== */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl shadow-slate-900/50">
          {/* Slide Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))}
                disabled={activeSlide === 0}
                className="p-3 bg-slate-800/80 backdrop-blur-sm rounded-2xl text-gray-400 hover:text-white disabled:opacity-30 transition-all border border-slate-700 hover:border-primary hover:shadow-lg disabled:hover:border-slate-700 disabled:hover:shadow-none"
              >
                <ChevronLeft size={22} />
              </button>
              <span className="text-base text-gray-300 min-w-[200px] text-center font-bold tracking-wide">
                {slides[activeSlide]?.label}
              </span>
              <button
                onClick={() => setActiveSlide(prev => Math.min(3, prev + 1))}
                disabled={activeSlide === 3}
                className="p-3 bg-slate-800/80 backdrop-blur-sm rounded-2xl text-gray-400 hover:text-white disabled:opacity-30 transition-all border border-slate-700 hover:border-primary hover:shadow-lg disabled:hover:border-slate-700 disabled:hover:shadow-none"
              >
                <ChevronRight size={22} />
              </button>
            </div>

            <div className="flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`h-2.5 rounded-full transition-all shadow-sm ${
                    activeSlide === i 
                      ? i === 2 ? 'w-10 bg-red-500 shadow-lg shadow-red-500/50' : 'w-10 bg-primary shadow-lg shadow-primary/50' 
                      : 'w-2.5 bg-gray-600 hover:bg-gray-500'
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

              {/* ===== SLIDE 0: PREVIOUS ROUNDS (HISTORY) ===== */}
              <div className="min-w-full px-1">
                <div className="rounded-3xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/20 rounded-2xl">
                        <History className="text-primary" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Previous Rounds</h3>
                        <span className="text-xs text-gray-500">Last 3 completed rounds</span>
                      </div>
                    </div>
                  </div>

                  {previousRounds.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {previousRounds.map((round, index) => (
                        <PreviousRoundCard key={round.id} round={round} index={index} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
                      <div className="p-4 bg-slate-700/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <Trophy className="text-gray-600" size={40} />
                      </div>
                      <p className="text-gray-400 text-xl font-medium">No completed rounds yet</p>
                      <p className="text-gray-600 text-sm mt-2">Complete a round to see history here</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ===== SLIDE 1: LOCKED ROUND (WAITING FOR RESULT) ===== */}
              <div className="min-w-full px-1">
                {lockedRound ? (
                  <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl rounded-3xl p-6 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/20">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500/20 rounded-2xl shadow-lg">
                          <Lock className="text-amber-500" size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-amber-400 font-bold tracking-wide uppercase">
                            Round #{lockedRound.roundNumber}
                          </p>
                          <h3 className="text-2xl font-black text-white">Waiting for Result</h3>
                        </div>
                      </div>

                      {/* Timer */}
                      <div className={`px-6 py-4 rounded-2xl border-2 shadow-2xl transition-all ${
                        lockedTimeLeft < 30 ? 'bg-red-500/20 border-red-500 shadow-red-500/30' :
                        lockedTimeLeft < 60 ? 'bg-yellow-500/20 border-yellow-500 shadow-yellow-500/30' : 
                        'bg-amber-500/20 border-amber-500 shadow-amber-500/30'
                      }`}>
                        <p className="text-xs text-gray-400 text-center uppercase tracking-wider mb-1">Result In</p>
                        <p className={`text-4xl font-mono font-black text-center tabular-nums ${
                          lockedTimeLeft < 30 ? 'text-red-500 animate-pulse' :
                          lockedTimeLeft < 60 ? 'text-yellow-500' : 'text-amber-500'
                        }`}>
                          {formatTime(lockedTimeLeft)}
                        </p>
                      </div>
                    </div>

                    {/* Price Info Card */}
                    <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-5 mb-5 border border-slate-700/50 shadow-xl">
                      <div className="grid grid-cols-2 gap-5 mb-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Round Start Price</p>
                          <p className="text-2xl font-black text-white tabular-nums">
                            ${lockedStartPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Current Price</p>
                          <p className="text-2xl font-black text-white tabular-nums">
                            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-700/50">
                        <span className="text-gray-400 text-sm font-medium">Current Direction:</span>
                        <span className={`font-black text-xl flex items-center gap-2 px-4 py-2 rounded-xl ${
                          lockedPriceChange >= 0 
                            ? 'text-green-500 bg-green-500/10 border border-green-500/30' 
                            : 'text-red-500 bg-red-500/10 border border-red-500/30'
                        }`}>
                          {lockedPriceChange >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                          {lockedPriceChange >= 0 ? 'UP' : 'DOWN'} ({lockedPriceChange >= 0 ? '+' : ''}{lockedPriceChange.toFixed(3)}%)
                        </span>
                      </div>
                    </div>

                    {/* ✅ Chart (persisted for locked round - NO MORE BLANK PAGE) */}
                    <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-3 mb-5 border border-slate-700/50 shadow-xl">
                      <TradingChart 
                        priceHistory={lockedPriceHistory.length > 0 ? lockedPriceHistory : priceHistory} 
                        startPrice={lockedStartPrice}
                        currentPrice={currentPrice}
                        isLocked={true}
                        roundId={lockedRound.id}
                      />
                    </div>

                    {/* Pool Distribution */}
                    <LivePoolIndicator
                      totalUp={parseFloat(lockedRound.totalUpAmount || 0)}
                      totalDown={parseFloat(lockedRound.totalDownAmount || 0)}
                      upBets={lockedRound.totalUpBets || 0}
                      downBets={lockedRound.totalDownBets || 0}
                      isLocked={true}
                    />

                    {/* Info Box */}
                    <div className="mt-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-5 text-center shadow-lg">
                      <p className="text-amber-400 font-medium flex items-center justify-center gap-2">
                        <Eye size={20} />
                        Watch the price! Result will be calculated when timer ends
                      </p>
                      <p className="text-amber-400/70 text-sm mt-2 flex items-center justify-center gap-1">
                        Meanwhile, you can bet on the ACTIVE round
                        <ChevronRight size={16} />
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-3xl p-16 border-2 border-dashed border-slate-700 text-center">
                    <div className="p-5 bg-slate-700/30 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                      <Lock className="text-gray-600" size={48} />
                    </div>
                    <p className="text-gray-400 text-xl font-medium">No locked round</p>
                    <p className="text-gray-600 text-sm mt-2">When an active round locks, it will appear here</p>
                  </div>
                )}
              </div>

              {/* ===== SLIDE 2: ACTIVE ROUND (BETTING) - Will include betting UI ===== */}
              <div className="min-w-full px-1">
                {activeRound ? (
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border-2 border-primary/50 shadow-2xl shadow-primary/20">
                    {/* CONTINUE WITH BETTING UI... */}
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 bg-red-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                          <div className="relative p-3 bg-red-500/20 rounded-2xl shadow-lg">
                            <Activity className="text-red-500" size={24} />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-primary font-bold tracking-wide uppercase flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Round #{activeRound.roundNumber}
                          </p>
                          <h3 className="text-2xl font-black text-white">Place Your Bets!</h3>
                        </div>
                      </div>

                      {/* Timer */}
                      <div className={`px-6 py-4 rounded-2xl border-2 shadow-2xl transition-all ${
                        activeTimeLeft < 30 ? 'bg-red-500/20 border-red-500 shadow-red-500/30' :
                        activeTimeLeft < 60 ? 'bg-yellow-500/20 border-yellow-500 shadow-yellow-500/30' : 
                        'bg-slate-900/80 border-slate-700 shadow-slate-900/50'
                      }`}>
                        <p className="text-xs text-gray-400 text-center uppercase tracking-wider mb-1">Betting Ends</p>
                        <p className={`text-4xl font-mono font-black text-center tabular-nums ${
                          activeTimeLeft < 30 ? 'text-red-500 animate-pulse' :
                          activeTimeLeft < 60 ? 'text-yellow-500' : 'text-primary'
                        }`}>
                          {formatTime(activeTimeLeft)}
                        </p>
                      </div>
                    </div>

                    {/* Price Info Card */}
                    <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-5 mb-5 border border-slate-700/50 shadow-xl">
                      <div className="grid grid-cols-2 gap-5 mb-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Round Start Price</p>
                          <p className="text-2xl font-black text-white tabular-nums">
                            ${activeStartPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Current Price</p>
                          <p className="text-2xl font-black text-white tabular-nums">
                            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-700/50">
                        <span className="text-gray-400 text-sm font-medium">Current Direction:</span>
                        <span className={`font-black text-xl flex items-center gap-2 px-4 py-2 rounded-xl ${
                          activePriceChange >= 0 
                            ? 'text-green-500 bg-green-500/10 border border-green-500/30' 
                            : 'text-red-500 bg-red-500/10 border border-red-500/30'
                        }`}>
                          {activePriceChange >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                          {activePriceChange >= 0 ? 'UP' : 'DOWN'} ({activePriceChange >= 0 ? '+' : ''}{activePriceChange.toFixed(3)}%)
                        </span>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl p-3 mb-5 border border-slate-700/50 shadow-xl">
                      <TradingChart 
                        priceHistory={priceHistory} 
                        startPrice={activeStartPrice}
                        currentPrice={currentPrice}
                        roundId={activeRound.id}
                      />
                    </div>

                    {/* Live Pool Distribution */}
                    <div className="mb-5">
                      <LivePoolIndicator
                        totalUp={parseFloat(activeRound.totalUpAmount || 0)}
                        totalDown={parseFloat(activeRound.totalDownAmount || 0)}
                        upBets={activeRound.totalUpBets || 0}
                        downBets={activeRound.totalDownBets || 0}
                      />
                    </div>

                    {/* Betting Buttons */}
                    <div className="grid grid-cols-2 gap-5 mb-5">
                      {/* UP BUTTON */}
                      {(() => {
                        const upCalc = calculatePotentialPayout('up');
                        const currentMult = getCurrentMultiplier('up');
                        return (
                          <button
                            onClick={() => handlePlaceBet('up')}
                            disabled={loading || !canBet}
                            className="relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 border-2 border-green-500/50 hover:border-green-500 p-6 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed group overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-green-500/20 disabled:hover:shadow-none transform hover:-translate-y-1 disabled:hover:translate-y-0"
                          >
                            <div className="relative z-10">
                              <div className="p-3 bg-green-500/20 rounded-2xl w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <ArrowUpRight
                                  size={36}
                                  className="text-green-500"
                                />
                              </div>
                              <p className="text-xl lg:text-2xl font-black text-green-500 mb-2">PREDICT UP</p>
                              
                              <p className="text-xs text-gray-400 font-medium">
                                Current Pool: <span className="text-green-400 font-bold">{currentMult.display}</span>
                              </p>
                              
                              <div className="mt-4 pt-4 border-t border-green-500/30 space-y-2">
                                {betAmount > 0 ? (
                                  upCalc.hasOpponents ? (
                                    <>
                                      <p className="text-sm text-green-400 font-bold">
                                        Your Payout: {upCalc.multiplier}x
                                      </p>
                                      <p className="text-2xl font-black text-green-500">
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
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm rounded-2xl">
                                <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
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
                            className="relative bg-gradient-to-br from-red-500/10 to-rose-500/10 hover:from-red-500/20 hover:to-rose-500/20 border-2 border-red-500/50 hover:border-red-500 p-6 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed group overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-red-500/20 disabled:hover:shadow-none transform hover:-translate-y-1 disabled:hover:translate-y-0"
                          >
                            <div className="relative z-10">
                              <div className="p-3 bg-red-500/20 rounded-2xl w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <ArrowDownRight
                                  size={36}
                                  className="text-red-500"
                                />
                              </div>
                              <p className="text-xl lg:text-2xl font-black text-red-500 mb-2">PREDICT DOWN</p>
                              
                              <p className="text-xs text-gray-400 font-medium">
                                Current Pool: <span className="text-red-400 font-bold">{currentMult.display}</span>
                              </p>
                              
                              <div className="mt-4 pt-4 border-t border-red-500/30 space-y-2">
                                {betAmount > 0 ? (
                                  downCalc.hasOpponents ? (
                                    <>
                                      <p className="text-sm text-red-400 font-bold">
                                        Your Payout: {downCalc.multiplier}x
                                      </p>
                                      <p className="text-2xl font-black text-red-500">
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
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm rounded-2xl">
                                <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                              </div>
                            )}
                          </button>
                        );
                      })()}
                    </div>

                    {/* Status Messages */}
                    {!canBet && activeTimeLeft < 10 && activeTimeLeft > 0 && (
                      <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 rounded-2xl p-5 text-center shadow-lg">
                        <p className="text-red-500 font-bold flex items-center justify-center gap-2">
                          <AlertCircle size={20} />
                          Round ending - Betting disabled
                        </p>
                      </div>
                    )}

                    {activeTimeLeft === 0 && (
                      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-5 text-center shadow-lg">
                        <p className="text-yellow-500 font-bold flex items-center justify-center gap-2">
                          <Clock size={20} />
                          Round locking... New round starting soon!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-3xl p-16 border-2 border-dashed border-slate-700 text-center">
                    <div className="p-5 bg-slate-700/30 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                      <Clock className="text-gray-600 animate-pulse" size={48} />
                    </div>
                    <p className="text-gray-400 text-xl font-medium">Waiting for next round...</p>
                    <p className="text-gray-600 text-sm mt-2 mb-4">A new round will start soon</p>
                    <button
                      onClick={handleRefresh}
                      className="mt-4 px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/80 transition flex items-center gap-2 mx-auto shadow-lg shadow-primary/30"
                    >
                      <RefreshCw size={20} />
                      Refresh
                    </button>
                  </div>
                )}
              </div>

              {/* ===== SLIDE 3: UPCOMING ROUND ===== */}
              <div className="min-w-full px-1">
                {upcomingRound ? (
                  <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl shadow-slate-900/50">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/20 rounded-2xl shadow-lg">
                          <Timer className="text-blue-500" size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-blue-400 uppercase tracking-wide">Round #{upcomingRound.roundNumber}</p>
                          <h3 className="text-2xl font-black text-white">Next Round</h3>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-5 py-3 rounded-2xl border border-blue-500/30 shadow-lg">
                        <p className="text-sm font-bold text-blue-400">Coming Up</p>
                      </div>
                    </div>

                    <div className="text-center py-12">
                      <div className="relative w-28 h-28 mx-auto mb-6">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
                        <div className="relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center w-full h-full border-2 border-blue-500/30 shadow-2xl">
                          <Play className="text-blue-500" size={48} />
                        </div>
                      </div>
                      <p className="text-gray-300 text-xl font-medium mb-2">This round starts automatically</p>
                      <p className="text-gray-400 mb-8">when the current round locks</p>

                      <div className="bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl inline-block border border-slate-700/50 shadow-xl">
                        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Scheduled Start</p>
                        <p className="text-2xl font-black text-white">
                          {new Date(upcomingRound.startTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-5 shadow-lg">
                      <p className="text-blue-400 text-sm text-center flex items-center justify-center gap-2 font-medium">
                        <Zap size={18} />
                        Tip: Prepare your bet amount while waiting!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/20 rounded-3xl p-16 border-2 border-dashed border-slate-700 text-center">
                    <div className="p-5 bg-slate-700/30 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                      <Timer className="text-gray-600" size={48} />
                    </div>
                    <p className="text-gray-400 text-xl font-medium">No upcoming round scheduled</p>
                    <p className="text-gray-600 text-sm mt-2">One will be created automatically</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== BET AMOUNT SELECTOR (MATERIAL CARD) ==================== */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl shadow-slate-900/50">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-2xl shadow-lg">
                <DollarSign size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">Select Bet Amount</p>
                <p className="text-xs text-gray-400">Choose or enter custom amount</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Available: <span className="text-green-400 font-black text-base">₦{formatCurrency(availableBalance)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mb-5">
            {[100, 500, 1000, 2000, 5000, 10000, 50000].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={amt > availableBalance}
                className={`px-5 py-3.5 rounded-2xl font-bold transition-all shadow-lg ${
                  betAmount === amt
                    ? 'bg-gradient-to-r from-primary to-purple-600 text-white scale-105 shadow-2xl shadow-primary/40 border-2 border-primary'
                    : amt > availableBalance
                    ? 'bg-slate-800/50 text-gray-600 cursor-not-allowed border border-slate-700/50'
                    : 'bg-slate-800/80 backdrop-blur-sm text-gray-300 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 hover:shadow-xl'
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
                className="bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 focus:border-primary rounded-2xl px-5 py-3.5 text-white w-36 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-lg"
                onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-400 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
            <span className="flex items-center gap-1">
              <Info size={14} className="text-blue-400" />
              Min: ₦100
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Info size={14} className="text-blue-400" />
              Max: ₦100,000
            </span>
            <span>•</span>
            <span className="text-primary font-bold flex items-center gap-1">
              <Shield size={14} />
              No upfront fees!
            </span>
          </div>
        </div>

        {/* ==================== MY ACTIVE BETS (MATERIAL CARD) ==================== */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl shadow-slate-900/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-2xl shadow-lg">
                <Activity size={24} className="text-primary" />
              </div>
              <h3 className="text-xl font-black text-white">My Active Bets</h3>
            </div>
            <span className="bg-gradient-to-r from-primary/20 to-purple-600/20 border border-primary/30 text-primary px-4 py-2 rounded-2xl text-sm font-black shadow-lg">
              {myActiveBets.length} Active
            </span>
          </div>

          {myActiveBets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
              <div className="p-5 bg-slate-700/30 rounded-full mb-4">
                <Activity size={48} className="opacity-20" />
              </div>
              <p className="text-lg font-medium">No active bets</p>
              <p className="text-sm text-gray-600 mt-1">Place a bet to see it here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myActiveBets.map(bet => {
                const betAmountValue = parseFloat(bet.stakeAmount || bet.amount);
                const multiplier = bet.currentMultiplierRaw || 1.7;
                const potentialPayout = roundToTwo(betAmountValue * multiplier);
                const potentialProfit = roundToTwo(potentialPayout - betAmountValue);

                return (
                  <div
                    key={bet.id}
                    className={`bg-slate-900/70 backdrop-blur-sm p-5 rounded-2xl border-2 transition-all hover:shadow-2xl transform hover:-translate-y-1 ${
                      bet.prediction === 'up' 
                        ? 'border-green-500/30 hover:border-green-500/60 hover:shadow-green-500/20' 
                        : 'border-red-500/30 hover:border-red-500/60 hover:shadow-red-500/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className={`text-sm font-black uppercase flex items-center gap-1.5 mb-1 ${
                          bet.prediction === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {bet.prediction === 'up' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                          {bet.prediction}
                        </p>
                        <p className="text-white font-black text-xl">
                          ₦{formatCurrency(bet.amount || bet.stakeAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Potential Win</p>
                        <p className="text-lg font-black text-primary">
                          ₦{formatCurrency(potentialPayout)}
                        </p>
                        <p className={`text-xs font-bold ${potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          +₦{formatCurrency(potentialProfit)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-700">
                      <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                        {bet.roundStatus === 'locked' && <Lock size={12} className="text-amber-500" />}
                        Round #{bet.roundNumber}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                          bet.prediction === 'up' 
                            ? 'bg-green-500/20 text-green-500' 
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {multiplier}x
                        </span>
                        {bet.isCurrentlyWinning !== undefined && (
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
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

        {/* ==================== REFERRAL PROMO CARD (MATERIAL DESIGN) ==================== */}
        <div className="bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-orange-500/20 backdrop-blur-xl p-6 rounded-3xl border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl blur-xl opacity-50 animate-pulse"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-2xl">
                  <Gift className="text-white" size={32} />
                </div>
              </div>
              <div>
                <h3 className="text-white font-black text-xl mb-1">Refer Friends & Earn 25%! 🎁</h3>
                <p className="text-gray-300 text-sm">
                  Earn 25% commission from your referral's first bet!
                </p>
              </div>
            </div>
            <button
              onClick={goToReferralPage}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-2xl shadow-purple-500/40 transform hover:scale-105"
            >
              <Share2 size={20} />
              Start Referring
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
