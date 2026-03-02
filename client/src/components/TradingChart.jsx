// components/TradingChart.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  LineChart,
  Activity,
  Maximize2,
  Minimize2,
  Settings,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  X,
  Check,
  ChevronDown
} from 'lucide-react';

// ==================== HELPER FUNCTIONS ====================
const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// Generate OHLC data from price history
const generateOHLC = (priceHistory, interval = 60) => {
  if (!priceHistory || priceHistory.length === 0) return [];
  
  const ohlcData = [];
  let currentCandle = null;
  
  priceHistory.forEach((item, index) => {
    const timestamp = Math.floor(item.time / 1000);
    const candleTime = Math.floor(timestamp / interval) * interval;
    const price = item.price;
    
    if (!currentCandle || currentCandle.time !== candleTime) {
      if (currentCandle) {
        ohlcData.push(currentCandle);
      }
      currentCandle = {
        time: candleTime,
        open: price,
        high: price,
        low: price,
        close: price
      };
    } else {
      currentCandle.high = Math.max(currentCandle.high, price);
      currentCandle.low = Math.min(currentCandle.low, price);
      currentCandle.close = price;
    }
  });
  
  if (currentCandle) {
    ohlcData.push(currentCandle);
  }
  
  return ohlcData;
};

// Calculate Simple Moving Average
const calculateSMA = (data, period) => {
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    sma.push({
      time: data[i].time,
      value: roundToTwo(sum / period)
    });
  }
  return sma;
};

// Calculate Exponential Moving Average
const calculateEMA = (data, period) => {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let prevEMA = sum / period;
  ema.push({ time: data[period - 1].time, value: roundToTwo(prevEMA) });
  
  // Calculate EMA
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i].close - prevEMA) * multiplier + prevEMA;
    ema.push({ time: data[i].time, value: roundToTwo(currentEMA) });
    prevEMA = currentEMA;
  }
  
  return ema;
};

// Calculate RSI
const calculateRSI = (data, period = 14) => {
  if (data.length < period + 1) return [];
  
  const rsi = [];
  const gains = [];
  const losses = [];
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // First RSI calculation
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  if (avgLoss === 0) {
    rsi.push({ time: data[period].time, value: 100 });
  } else {
    const rs = avgGain / avgLoss;
    rsi.push({ time: data[period].time, value: roundToTwo(100 - (100 / (1 + rs))) });
  }
  
  // Subsequent RSI calculations
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    
    if (avgLoss === 0) {
      rsi.push({ time: data[i + 1].time, value: 100 });
    } else {
      const rs = avgGain / avgLoss;
      rsi.push({ time: data[i + 1].time, value: roundToTwo(100 - (100 / (1 + rs))) });
    }
  }
  
  return rsi;
};

// Calculate Bollinger Bands
const calculateBollingerBands = (data, period = 20, stdDev = 2) => {
  if (data.length < period) return { upper: [], middle: [], lower: [] };
  
  const upper = [];
  const middle = [];
  const lower = [];
  
  for (let i = period - 1; i < data.length; i++) {
    // Calculate SMA
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const sma = sum / period;
    
    // Calculate Standard Deviation
    let squaredSum = 0;
    for (let j = 0; j < period; j++) {
      squaredSum += Math.pow(data[i - j].close - sma, 2);
    }
    const std = Math.sqrt(squaredSum / period);
    
    middle.push({ time: data[i].time, value: roundToTwo(sma) });
    upper.push({ time: data[i].time, value: roundToTwo(sma + stdDev * std) });
    lower.push({ time: data[i].time, value: roundToTwo(sma - stdDev * std) });
  }
  
  return { upper, middle, lower };
};

// Calculate MACD
const calculateMACD = (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  if (data.length < slowPeriod) return { macd: [], signal: [], histogram: [] };
  
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macdLine = [];
  const startIndex = slowPeriod - fastPeriod;
  
  for (let i = 0; i < slowEMA.length; i++) {
    const fastIdx = i + startIndex;
    if (fastIdx >= 0 && fastIdx < fastEMA.length) {
      macdLine.push({
        time: slowEMA[i].time,
        value: roundToTwo(fastEMA[fastIdx].value - slowEMA[i].value),
        close: fastEMA[fastIdx].value - slowEMA[i].value
      });
    }
  }
  
  // Signal line (EMA of MACD)
  const signalLine = [];
  if (macdLine.length >= signalPeriod) {
    const multiplier = 2 / (signalPeriod + 1);
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) {
      sum += macdLine[i].value;
    }
    let prevEMA = sum / signalPeriod;
    signalLine.push({ time: macdLine[signalPeriod - 1].time, value: roundToTwo(prevEMA) });
    
    for (let i = signalPeriod; i < macdLine.length; i++) {
      const currentEMA = (macdLine[i].value - prevEMA) * multiplier + prevEMA;
      signalLine.push({ time: macdLine[i].time, value: roundToTwo(currentEMA) });
      prevEMA = currentEMA;
    }
  }
  
  // Histogram
  const histogram = [];
  const offset = macdLine.length - signalLine.length;
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push({
      time: signalLine[i].time,
      value: roundToTwo(macdLine[i + offset].value - signalLine[i].value),
      color: macdLine[i + offset].value - signalLine[i].value >= 0 ? '#22c55e' : '#ef4444'
    });
  }
  
  return { 
    macd: macdLine.map(d => ({ time: d.time, value: d.value })), 
    signal: signalLine, 
    histogram 
  };
};

// ==================== CHART TYPES ENUM ====================
const CHART_TYPES = {
  CANDLESTICK: 'candlestick',
  LINE: 'line',
  AREA: 'area'
};

// ==================== INDICATORS CONFIG ====================
const INDICATORS = {
  SMA: { name: 'SMA', periods: [7, 20, 50], colors: ['#f59e0b', '#3b82f6', '#8b5cf6'] },
  EMA: { name: 'EMA', periods: [12, 26], colors: ['#ec4899', '#14b8a6'] },
  BOLLINGER: { name: 'Bollinger Bands', color: '#6366f1' },
  RSI: { name: 'RSI', period: 14 },
  MACD: { name: 'MACD' }
};

// ==================== TIMEFRAMES ====================
const TIMEFRAMES = [
  { label: '1s', value: 1, interval: 1 },
  { label: '5s', value: 5, interval: 5 },
  { label: '15s', value: 15, interval: 15 },
  { label: '30s', value: 30, interval: 30 },
  { label: '1m', value: 60, interval: 60 },
  { label: '5m', value: 300, interval: 300 }
];

// ==================== PROFESSIONAL TRADING CHART ====================
const TradingChart = ({ 
  priceHistory, 
  startPrice, 
  currentPrice,
  height = 400,
  showControls = true 
}) => {
  // Refs
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const mainSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});
  const rsiChartRef = useRef(null);
  const macdChartRef = useRef(null);
  const priceLineRef = useRef(null);

  // State
  const [chartType, setChartType] = useState(CHART_TYPES.CANDLESTICK);
  const [timeframe, setTimeframe] = useState(5); // 5 seconds default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState({
    sma: false,
    ema: false,
    bollinger: false,
    rsi: false,
    macd: false
  });
  const [crosshairData, setCrosshairData] = useState(null);
  const [ohlcData, setOhlcData] = useState([]);

  // Generate OHLC data from price history
  useEffect(() => {
    if (priceHistory.length > 0) {
      const data = generateOHLC(priceHistory, timeframe);
      setOhlcData(data);
    }
  }, [priceHistory, timeframe]);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Create main chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#1e293b', style: 1 },
        horzLines: { color: '#1e293b', style: 1 },
      },
      width: chartContainerRef.current.clientWidth,
      height: isFullscreen ? window.innerHeight - 200 : height,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#334155',
        rightOffset: 10,
        barSpacing: 8,
        minBarSpacing: 4,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
        autoScale: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
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
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
      },
    });

    chartRef.current = chart;

    // Create main series based on chart type
    createMainSeries(chart, chartType);

    // Subscribe to crosshair move
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesPrices) {
        const prices = param.seriesPrices.get(mainSeriesRef.current);
        if (prices) {
          setCrosshairData({
            time: param.time,
            ...prices
          });
        }
      } else {
        setCrosshairData(null);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: isFullscreen ? window.innerHeight - 200 : height
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartType, isFullscreen, height]);

  // Create main series
  const createMainSeries = useCallback((chart, type) => {
    // Remove existing series
    if (mainSeriesRef.current) {
      try {
        chart.removeSeries(mainSeriesRef.current);
      } catch (e) {}
    }

    let series;
    switch (type) {
      case CHART_TYPES.CANDLESTICK:
        series = chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
          priceLineVisible: true,
          lastValueVisible: true,
        });
        break;
      case CHART_TYPES.LINE:
        series = chart.addLineSeries({
          color: '#6366f1',
          lineWidth: 2,
          priceLineVisible: true,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 6,
        });
        break;
      case CHART_TYPES.AREA:
        series = chart.addAreaSeries({
          lineColor: '#6366f1',
          topColor: 'rgba(99, 102, 241, 0.4)',
          bottomColor: 'rgba(99, 102, 241, 0.0)',
          lineWidth: 2,
          priceLineVisible: true,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 6,
        });
        break;
      default:
        series = chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
    }

    mainSeriesRef.current = series;
  }, []);

  // Update chart data
  useEffect(() => {
    if (!mainSeriesRef.current || ohlcData.length === 0) return;

    try {
      if (chartType === CHART_TYPES.CANDLESTICK) {
        mainSeriesRef.current.setData(ohlcData);
      } else {
        // For line/area chart, use close prices
        const lineData = ohlcData.map(d => ({
          time: d.time,
          value: d.close
        }));
        mainSeriesRef.current.setData(lineData);
      }

      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (e) {
      console.error('Error updating chart data:', e);
    }
  }, [ohlcData, chartType]);

  // Update start price line
  useEffect(() => {
    if (!mainSeriesRef.current || !startPrice || startPrice <= 0) return;

    try {
      // Remove old price line
      if (priceLineRef.current) {
        mainSeriesRef.current.removePriceLine(priceLineRef.current);
      }

      // Add new start price line
      priceLineRef.current = mainSeriesRef.current.createPriceLine({
        price: startPrice,
        color: '#f59e0b',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Start',
      });
    } catch (e) {
      console.error('Error updating price line:', e);
    }
  }, [startPrice]);

  // Update indicators
  useEffect(() => {
    if (!chartRef.current || ohlcData.length < 2) return;

    // Clear existing indicator series
    Object.values(indicatorSeriesRef.current).forEach(series => {
      try {
        chartRef.current.removeSeries(series);
      } catch (e) {}
    });
    indicatorSeriesRef.current = {};

    // SMA
    if (activeIndicators.sma && ohlcData.length >= 7) {
      INDICATORS.SMA.periods.forEach((period, idx) => {
        if (ohlcData.length >= period) {
          const smaData = calculateSMA(ohlcData, period);
          if (smaData.length > 0) {
            const series = chartRef.current.addLineSeries({
              color: INDICATORS.SMA.colors[idx],
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
              title: `SMA ${period}`,
            });
            series.setData(smaData);
            indicatorSeriesRef.current[`sma_${period}`] = series;
          }
        }
      });
    }

    // EMA
    if (activeIndicators.ema && ohlcData.length >= 12) {
      INDICATORS.EMA.periods.forEach((period, idx) => {
        if (ohlcData.length >= period) {
          const emaData = calculateEMA(ohlcData, period);
          if (emaData.length > 0) {
            const series = chartRef.current.addLineSeries({
              color: INDICATORS.EMA.colors[idx],
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
              title: `EMA ${period}`,
            });
            series.setData(emaData);
            indicatorSeriesRef.current[`ema_${period}`] = series;
          }
        }
      });
    }

    // Bollinger Bands
    if (activeIndicators.bollinger && ohlcData.length >= 20) {
      const bb = calculateBollingerBands(ohlcData, 20, 2);
      
      if (bb.upper.length > 0) {
        // Upper band
        const upperSeries = chartRef.current.addLineSeries({
          color: 'rgba(99, 102, 241, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        upperSeries.setData(bb.upper);
        indicatorSeriesRef.current['bb_upper'] = upperSeries;

        // Middle band (SMA)
        const middleSeries = chartRef.current.addLineSeries({
          color: '#6366f1',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        middleSeries.setData(bb.middle);
        indicatorSeriesRef.current['bb_middle'] = middleSeries;

        // Lower band
        const lowerSeries = chartRef.current.addLineSeries({
          color: 'rgba(99, 102, 241, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        lowerSeries.setData(bb.lower);
        indicatorSeriesRef.current['bb_lower'] = lowerSeries;
      }
    }
  }, [activeIndicators, ohlcData]);

  // Toggle indicator
  const toggleIndicator = (indicator) => {
    setActiveIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  // Chart controls
  const handleZoomIn = () => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const currentRange = timeScale.getVisibleLogicalRange();
      if (currentRange) {
        const newRange = {
          from: currentRange.from + (currentRange.to - currentRange.from) * 0.1,
          to: currentRange.to - (currentRange.to - currentRange.from) * 0.1
        };
        timeScale.setVisibleLogicalRange(newRange);
      }
    }
  };

  const handleZoomOut = () => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const currentRange = timeScale.getVisibleLogicalRange();
      if (currentRange) {
        const newRange = {
          from: currentRange.from - (currentRange.to - currentRange.from) * 0.2,
          to: currentRange.to + (currentRange.to - currentRange.from) * 0.2
        };
        timeScale.setVisibleLogicalRange(newRange);
      }
    }
  };

  const handleReset = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Get current candle info
  const currentCandle = ohlcData.length > 0 ? ohlcData[ohlcData.length - 1] : null;
  const prevCandle = ohlcData.length > 1 ? ohlcData[ohlcData.length - 2] : null;
  const priceChange = currentCandle && prevCandle 
    ? ((currentCandle.close - prevCandle.close) / prevCandle.close * 100)
    : 0;

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-4' : ''}`}>
      {/* Chart Header */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          {/* Left side - Chart Type & Timeframe */}
          <div className="flex items-center gap-2">
            {/* Chart Type Selector */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setChartType(CHART_TYPES.CANDLESTICK)}
                className={`p-2 rounded-md transition-all ${
                  chartType === CHART_TYPES.CANDLESTICK 
                    ? 'bg-primary text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Candlestick Chart"
              >
                <BarChart2 size={18} />
              </button>
              <button
                onClick={() => setChartType(CHART_TYPES.LINE)}
                className={`p-2 rounded-md transition-all ${
                  chartType === CHART_TYPES.LINE 
                    ? 'bg-primary text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Line Chart"
              >
                <LineChart size={18} />
              </button>
              <button
                onClick={() => setChartType(CHART_TYPES.AREA)}
                className={`p-2 rounded-md transition-all ${
                  chartType === CHART_TYPES.AREA 
                    ? 'bg-primary text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Area Chart"
              >
                <Activity size={18} />
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              {TIMEFRAMES.slice(0, 4).map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    timeframe === tf.value 
                      ? 'bg-primary text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right side - Tools */}
          <div className="flex items-center gap-2">
            {/* Indicators Button */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                  showSettings || Object.values(activeIndicators).some(v => v)
                    ? 'bg-primary text-white'
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                <Layers size={16} />
                <span className="text-xs font-bold hidden sm:inline">Indicators</span>
                <ChevronDown size={14} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </button>

              {/* Indicators Dropdown */}
              {showSettings && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-700">
                    <p className="text-white font-bold text-sm">Technical Indicators</p>
                  </div>
                  <div className="p-2">
                    {[
                      { key: 'sma', name: 'SMA (7, 20, 50)', icon: '📈' },
                      { key: 'ema', name: 'EMA (12, 26)', icon: '📊' },
                      { key: 'bollinger', name: 'Bollinger Bands', icon: '🎯' },
                      { key: 'rsi', name: 'RSI (14)', icon: '📉', disabled: true },
                      { key: 'macd', name: 'MACD', icon: '📶', disabled: true }
                    ].map(indicator => (
                      <button
                        key={indicator.key}
                        onClick={() => !indicator.disabled && toggleIndicator(indicator.key)}
                        disabled={indicator.disabled}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                          activeIndicators[indicator.key]
                            ? 'bg-primary/20 text-primary'
                            : indicator.disabled
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-300 hover:bg-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{indicator.icon}</span>
                          <span className="text-sm">{indicator.name}</span>
                        </span>
                        {activeIndicators[indicator.key] && (
                          <Check size={16} className="text-primary" />
                        )}
                        {indicator.disabled && (
                          <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded">Soon</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={handleZoomIn}
                className="p-2 text-gray-400 hover:text-white transition"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 text-gray-400 hover:text-white transition"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={handleReset}
                className="p-2 text-gray-400 hover:text-white transition"
                title="Reset View"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-slate-800 text-gray-400 hover:text-white rounded-lg transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* OHLC Info Bar */}
      {currentCandle && chartType === CHART_TYPES.CANDLESTICK && (
        <div className="flex flex-wrap items-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">O:</span>
            <span className="text-white font-mono">${currentCandle.open.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">H:</span>
            <span className="text-green-500 font-mono">${currentCandle.high.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">L:</span>
            <span className="text-red-500 font-mono">${currentCandle.low.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">C:</span>
            <span className="text-white font-mono">${currentCandle.close.toFixed(2)}</span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${
            priceChange >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
          }`}>
            {priceChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span className="font-mono">{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%</span>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        <div 
          ref={chartContainerRef} 
          className={`w-full rounded-xl overflow-hidden ${isFullscreen ? '' : 'border border-slate-700'}`}
          style={{ height: isFullscreen ? 'calc(100vh - 200px)' : `${height}px` }}
        />

        {/* Loading Overlay */}
        {priceHistory.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-xl">
            <div className="text-center">
              <Activity className="w-10 h-10 text-primary animate-pulse mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading chart data...</p>
              <p className="text-gray-500 text-xs mt-1">Please wait for price updates</p>
            </div>
          </div>
        )}

        {/* Crosshair Tooltip */}
        {crosshairData && chartType === CHART_TYPES.CANDLESTICK && (
          <div className="absolute top-2 left-2 bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700 text-xs">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-gray-400">Open:</span>
              <span className="text-white font-mono">${crosshairData.open?.toFixed(2) || '-'}</span>
              <span className="text-gray-400">High:</span>
              <span className="text-green-400 font-mono">${crosshairData.high?.toFixed(2) || '-'}</span>
              <span className="text-gray-400">Low:</span>
              <span className="text-red-400 font-mono">${crosshairData.low?.toFixed(2) || '-'}</span>
              <span className="text-gray-400">Close:</span>
              <span className="text-white font-mono">${crosshairData.close?.toFixed(2) || '-'}</span>
            </div>
          </div>
        )}

        {/* Active Indicators Legend */}
        {Object.values(activeIndicators).some(v => v) && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-2">
            {activeIndicators.sma && (
              <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-gray-300">SMA 7</span>
                <span className="w-2 h-2 rounded-full bg-blue-500 ml-1"></span>
                <span className="text-gray-300">20</span>
                <span className="w-2 h-2 rounded-full bg-purple-500 ml-1"></span>
                <span className="text-gray-300">50</span>
              </div>
            )}
            {activeIndicators.ema && (
              <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded text-xs">
                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                <span className="text-gray-300">EMA 12</span>
                <span className="w-2 h-2 rounded-full bg-teal-500 ml-1"></span>
                <span className="text-gray-300">26</span>
              </div>
            )}
            {activeIndicators.bollinger && (
              <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded text-xs">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span className="text-gray-300">BB(20,2)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Close Button */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
        >
          <X size={24} />
        </button>
      )}

      {/* Close settings on outside click */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default TradingChart;
