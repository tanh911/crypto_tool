"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  SeriesMarker,
  UTCTimestamp,
} from "lightweight-charts";

const AVAILABLE_COINS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT"];
const INTERVALS = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "1d",
  "1w",
];

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface RiskData {
  symbol: string;
  score: number;
  flagsMap: Record<number, string[]>;
  latest: Candle;
  candles: Candle[];
  interval?: string;
  timestamp?: number;
}

const FLAG_CONFIGS = {
  SMC: { color: "red", text: "SMC↓", shape: "arrowDown" as const },
  SHOCK: { color: "blue", text: "Shock", shape: "circle" as const },
  LIQ: { color: "purple", text: "LIQ", shape: "arrowDown" as const },
  WYCK: { color: "orange", text: "WYCK", shape: "square" as const },
};

// Config cho prediction patterns
const PREDICTION_CONFIGS = {
  BULL_PREDICT: {
    color: "#00c853",
    text: "📈 Bull",
    shape: "arrowUp" as const,
  },
  BEAR_PREDICT: {
    color: "#ff1744",
    text: "📉 Bear",
    shape: "arrowDown" as const,
  },
  RANGE_PREDICT: {
    color: "#2979ff",
    text: "↔️ Range",
    shape: "circle" as const,
  },
  BREAKOUT_PREDICT: {
    color: "#ff9100",
    text: "🚀 Breakout",
    shape: "square" as const,
  },
  REVERSAL_PREDICT: {
    color: "#d500f9",
    text: "🔄 Reversal",
    shape: "circle" as const,
  },
};

interface Prediction {
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  pattern: string;
  targetPrice?: number;
  stopLoss?: number;
  signals?: string[];
  sma9?: number;
  sma20?: number;
  currentPrice?: number;
  support?: number;
  resistance?: number;
  trend?: "UPTREND" | "DOWNTREND" | "RANGE";
}

function calculatePredictionScore(candle: Candle, flags: string[]): number {
  let score = 50;
  flags.forEach((f) => {
    if (f === "SMC") score += 10;
    if (f === "LIQ") score += 15;
    if (f === "SHOCK") score -= 10;
    if (f === "WYCK") score += 5;
  });
  if (candle.close > candle.open) score += 5;
  else score -= 5;
  return Math.min(100, Math.max(0, score));
}

export default function CandleChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [coin, setCoin] = useState("ETHUSDT");
  const [interval, setInterval] = useState("1h");
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const [activeFilters, setActiveFilters] = useState({
    SMC: true,
    SHOCK: true,
    LIQ: true,
    WYCK: true,
    "Bullish Engulfing": true,
    "Bearish Engulfing": true,
    Doji: true,
    "Double Top": true,
    "Double Bottom": true,
    "Head & Shoulders": true,
    Triangle: true,
    "Bull Prediction": true,
    "Bear Prediction": true,
    "Range Prediction": true,
    "Breakout Prediction": true,
    "Reversal Prediction": true,
  });

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 550,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#000000",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      grid: {
        vertLines: { color: "#f0f0f0" },
        horzLines: { color: "#f0f0f0" },
      },
      rightPriceScale: {
        borderColor: "#cccccc",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "#cccccc",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // Pattern detection functions
  const detectPatterns = useCallback(
    (
      candles: {
        time: UTCTimestamp;
        open: number;
        high: number;
        low: number;
        close: number;
      }[]
    ): SeriesMarker<UTCTimestamp>[] => {
      const markers: SeriesMarker<UTCTimestamp>[] = [];

      for (let i = 2; i < candles.length; i++) {
        const prev = candles[i - 1];
        const current = candles[i];

        if (
          activeFilters["Bullish Engulfing"] &&
          current.close > current.open &&
          prev.close < prev.open &&
          current.close > prev.open &&
          current.open < prev.close
        ) {
          markers.push({
            time: current.time,
            position: "belowBar",
            color: "#00a67d",
            shape: "arrowUp",
            text: "Bull Engulf",
          });
        }

        if (
          activeFilters["Bearish Engulfing"] &&
          current.close < current.open &&
          prev.close > prev.open &&
          current.open > prev.close &&
          current.close < prev.open
        ) {
          markers.push({
            time: current.time,
            position: "aboveBar",
            color: "#eb4d5c",
            shape: "arrowDown",
            text: "Bear Engulf",
          });
        }

        if (activeFilters["Doji"]) {
          const body = Math.abs(current.close - current.open);
          const range = current.high - current.low;
          if (range > 0 && body / range < 0.1) {
            markers.push({
              time: current.time,
              position: "aboveBar",
              color: "#2196f3",
              shape: "circle",
              text: "Doji",
            });
          }
        }
      }

      return markers;
    },
    [activeFilters]
  );

  // HÀM PREDICT PATTERNS - ĐÃ SỬA LỖI TYPE
  const predictPatterns = useCallback(
    (
      candles: {
        time: UTCTimestamp;
        open: number;
        high: number;
        low: number;
        close: number;
        volume?: number;
      }[]
    ): {
      markers: SeriesMarker<UTCTimestamp>[];
      prediction: Prediction | null;
    } => {
      const markers: SeriesMarker<UTCTimestamp>[] = [];

      if (candles.length < 20) return { markers, prediction: null };

      const recentCandles = candles.slice(-20);
      const currentPrice = recentCandles[recentCandles.length - 1].close;

      // Tính toán các chỉ số kỹ thuật
      const prices = recentCandles.map((c) => c.close);
      const highs = recentCandles.map((c) => c.high);
      const lows = recentCandles.map((c) => c.low);
      const volumes = recentCandles.map((c) => c.volume || 0);

      // SMA calculations
      const sma9 = prices.slice(-9).reduce((a, b) => a + b, 0) / 9;
      const sma20 = prices.reduce((a, b) => a + b, 0) / prices.length;

      // Tìm swing highs và swing lows
      const swingHighs: number[] = [];
      const swingLows: number[] = [];

      for (let i = 2; i < recentCandles.length - 2; i++) {
        const currentHigh = recentCandles[i].high;
        const currentLow = recentCandles[i].low;

        // Swing High
        if (
          currentHigh > recentCandles[i - 1].high &&
          currentHigh > recentCandles[i - 2].high &&
          currentHigh > recentCandles[i + 1].high &&
          currentHigh > recentCandles[i + 2].high
        ) {
          swingHighs.push(currentHigh);
        }

        // Swing Low
        if (
          currentLow < recentCandles[i - 1].low &&
          currentLow < recentCandles[i - 2].low &&
          currentLow < recentCandles[i + 1].low &&
          currentLow < recentCandles[i + 2].low
        ) {
          swingLows.push(currentLow);
        }
      }

      // Higher Highs / Lower Lows analysis
      const lastSwingHighs = swingHighs.slice(-3);
      const lastSwingLows = swingLows.slice(-3);

      let higherHighs = false;
      let lowerLows = false;
      let lowerHighs = false;
      let higherLows = false;

      if (lastSwingHighs.length >= 2) {
        higherHighs =
          lastSwingHighs[lastSwingHighs.length - 1] >
          lastSwingHighs[lastSwingHighs.length - 2];
        lowerHighs =
          lastSwingHighs[lastSwingHighs.length - 1] <
          lastSwingHighs[lastSwingHighs.length - 2];
      }

      if (lastSwingLows.length >= 2) {
        lowerLows =
          lastSwingLows[lastSwingLows.length - 1] <
          lastSwingLows[lastSwingLows.length - 2];
        higherLows =
          lastSwingLows[lastSwingLows.length - 1] >
          lastSwingLows[lastSwingLows.length - 2];
      }

      // Resistance và Support từ swing points
      const dynamicResistance =
        swingHighs.length > 0 ? Math.max(...swingHighs) : Math.max(...highs);
      const dynamicSupport =
        swingLows.length > 0 ? Math.min(...swingLows) : Math.min(...lows);

      // Key resistance và support levels
      const resistanceLevel = dynamicResistance;
      const supportLevel = dynamicSupport;

      // Volume analysis
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const currentVolume = volumes[volumes.length - 1];
      const volumeSpike = currentVolume > avgVolume * 1.5;

      // RSI calculation
      const rsiPeriod = 14;
      const rsiPrices =
        candles.length >= rsiPeriod
          ? candles.slice(-rsiPeriod - 1).map((c) => c.close)
          : prices;

      let gains = 0;
      let losses = 0;
      for (let i = 1; i < rsiPrices.length; i++) {
        const change = rsiPrices[i] - rsiPrices[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
      }

      const avgGain = gains / rsiPeriod || 0.001;
      const avgLoss = losses / rsiPeriod || 0.001;
      const rs = avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      // PREDICTION LOGIC - FIXED: Properly typed direction
      let predictionDirection: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
      let confidence = 50;
      let pattern = "RANGE_BOUND";
      let targetPrice: number | undefined;
      let stopLoss: number | undefined;

      // Bullish signals
      const bullishSignals: string[] = [];
      if (currentPrice > sma9 && sma9 > sma20) {
        bullishSignals.push("SMA_BULLISH_CROSS");
        confidence += 15;
      }
      if (higherHighs && higherLows) {
        bullishSignals.push("UPTREND_HH_HL");
        confidence += 20;
      }
      if (currentPrice > sma20) bullishSignals.push("ABOVE_SMA20");
      if (rsi > 50 && rsi < 70) {
        bullishSignals.push("RSI_BULLISH");
        confidence += 10;
      }
      if (currentPrice > resistanceLevel * 0.995) {
        bullishSignals.push("BREAKING_RESISTANCE");
        confidence += 15;
      }
      if (
        volumeSpike &&
        currentPrice > recentCandles[recentCandles.length - 2].close
      ) {
        bullishSignals.push("VOLUME_CONFIRMATION");
        confidence += 5;
      }
      if (
        currentPrice > supportLevel * 1.005 &&
        currentPrice > recentCandles[recentCandles.length - 2].close
      ) {
        bullishSignals.push("SUPPORT_BOUNCE");
        confidence += 10;
      }

      // Bearish signals
      const bearishSignals: string[] = [];
      if (currentPrice < sma9 && sma9 < sma20) {
        bearishSignals.push("SMA_BEARISH_CROSS");
        confidence += 15;
      }
      if (lowerHighs && lowerLows) {
        bearishSignals.push("DOWNTREND_LH_LL");
        confidence += 20;
      }
      if (currentPrice < sma20) bearishSignals.push("BELOW_SMA20");
      if (rsi < 50 && rsi > 30) {
        bearishSignals.push("RSI_BEARISH");
        confidence += 10;
      }
      if (currentPrice < supportLevel * 1.005) {
        bearishSignals.push("BREAKING_SUPPORT");
        confidence += 15;
      }
      if (
        volumeSpike &&
        currentPrice < recentCandles[recentCandles.length - 2].close
      ) {
        bearishSignals.push("VOLUME_CONFIRMATION");
        confidence += 5;
      }
      if (
        currentPrice < resistanceLevel * 0.995 &&
        currentPrice < recentCandles[recentCandles.length - 2].close
      ) {
        bearishSignals.push("RESISTANCE_REJECTION");
        confidence += 10;
      }

      // Pattern recognition với logic thực tế
      const lastCandle = recentCandles[recentCandles.length - 1];

      // STRONG TREND PATTERNS
      if (
        bullishSignals.includes("UPTREND_HH_HL") &&
        bullishSignals.includes("SMA_BULLISH_CROSS")
      ) {
        pattern = "STRONG_UPTREND";
        predictionDirection = "BULLISH";
        confidence = Math.min(90, 70 + bullishSignals.length * 3);
        targetPrice = currentPrice * 1.03;
        stopLoss = Math.min(lastCandle.low * 0.99, sma20 * 0.98);
      } else if (
        bearishSignals.includes("DOWNTREND_LH_LL") &&
        bearishSignals.includes("SMA_BEARISH_CROSS")
      ) {
        pattern = "STRONG_DOWNTREND";
        predictionDirection = "BEARISH";
        confidence = Math.min(90, 70 + bearishSignals.length * 3);
        targetPrice = currentPrice * 0.97;
        stopLoss = Math.max(lastCandle.high * 1.01, sma20 * 1.02);
      }
      // BREAKOUT PATTERNS
      else if (bullishSignals.includes("BREAKING_RESISTANCE") && volumeSpike) {
        pattern = "RESISTANCE_BREAKOUT";
        predictionDirection = "BULLISH";
        confidence = 80;
        targetPrice = resistanceLevel * 1.02;
        stopLoss = resistanceLevel * 0.99;
      } else if (bearishSignals.includes("BREAKING_SUPPORT") && volumeSpike) {
        pattern = "SUPPORT_BREAKDOWN";
        predictionDirection = "BEARISH";
        confidence = 80;
        targetPrice = supportLevel * 0.98;
        stopLoss = supportLevel * 1.01;
      }
      // REVERSAL PATTERNS
      else if (bullishSignals.includes("SUPPORT_BOUNCE")) {
        pattern = "SUPPORT_REVERSAL";
        predictionDirection = "BULLISH";
        confidence = 75;
        targetPrice = currentPrice * 1.02;
        stopLoss = supportLevel * 0.995;
      } else if (bearishSignals.includes("RESISTANCE_REJECTION")) {
        pattern = "RESISTANCE_REVERSAL";
        predictionDirection = "BEARISH";
        confidence = 75;
        targetPrice = currentPrice * 0.98;
        stopLoss = resistanceLevel * 1.005;
      }
      // MILD TREND BASED ON SIGNAL STRENGTH
      else if (bullishSignals.length > bearishSignals.length + 2) {
        pattern = "BULLISH_BIAS";
        predictionDirection = "BULLISH";
        confidence = 65 + bullishSignals.length * 2;
        targetPrice = currentPrice * 1.015;
        stopLoss = Math.min(sma20 * 0.99, supportLevel * 0.995);
      } else if (bearishSignals.length > bullishSignals.length + 2) {
        pattern = "BEARISH_BIAS";
        predictionDirection = "BEARISH";
        confidence = 65 + bearishSignals.length * 2;
        targetPrice = currentPrice * 0.985;
        stopLoss = Math.max(sma20 * 1.01, resistanceLevel * 1.005);
      }

      // Add prediction markers
      const lastCandleTime = recentCandles[recentCandles.length - 1].time;

      // Hiển thị support/resistance markers
      if (
        activeFilters["Bull Prediction"] ||
        activeFilters["Bear Prediction"]
      ) {
        // Support Level Marker
        if (Math.abs(currentPrice - supportLevel) / supportLevel < 0.02) {
          markers.push({
            time: lastCandleTime,
            position: "belowBar",
            color: "#4caf50",
            shape: "circle",
            text: `SUP ${supportLevel.toFixed(2)}`,
          });
        }

        // Resistance Level Marker
        if (Math.abs(currentPrice - resistanceLevel) / resistanceLevel < 0.02) {
          markers.push({
            time: lastCandleTime,
            position: "aboveBar",
            color: "#f44336",
            shape: "circle",
            text: `RES ${resistanceLevel.toFixed(2)}`,
          });
        }
      }

      if (
        activeFilters["Bull Prediction"] &&
        predictionDirection === "BULLISH"
      ) {
        markers.push({
          time: lastCandleTime,
          position: "belowBar",
          color: PREDICTION_CONFIGS.BULL_PREDICT.color,
          shape: PREDICTION_CONFIGS.BULL_PREDICT.shape,
          text: `BULL ${confidence}%`,
        });
      }

      if (
        activeFilters["Bear Prediction"] &&
        predictionDirection === "BEARISH"
      ) {
        markers.push({
          time: lastCandleTime,
          position: "aboveBar",
          color: PREDICTION_CONFIGS.BEAR_PREDICT.color,
          shape: PREDICTION_CONFIGS.BEAR_PREDICT.shape,
          text: `BEAR ${confidence}%`,
        });
      }

      if (
        activeFilters["Range Prediction"] &&
        predictionDirection === "NEUTRAL"
      ) {
        markers.push({
          time: lastCandleTime,
          position: "aboveBar",
          color: PREDICTION_CONFIGS.RANGE_PREDICT.color,
          shape: PREDICTION_CONFIGS.RANGE_PREDICT.shape,
          text: "RANGE",
        });
      }

      if (activeFilters["Breakout Prediction"] && pattern.includes("BREAK")) {
        markers.push({
          time: lastCandleTime,
          position: "aboveBar",
          color: PREDICTION_CONFIGS.BREAKOUT_PREDICT.color,
          shape: PREDICTION_CONFIGS.BREAKOUT_PREDICT.shape,
          text: pattern.includes("BREAKOUT") ? "BREAKOUT" : "BREAKDOWN",
        });
      }

      if (
        activeFilters["Reversal Prediction"] &&
        pattern.includes("REVERSAL")
      ) {
        markers.push({
          time: lastCandleTime,
          position: "aboveBar",
          color: PREDICTION_CONFIGS.REVERSAL_PREDICT.color,
          shape: PREDICTION_CONFIGS.REVERSAL_PREDICT.shape,
          text: "REVERSAL",
        });
      }

      // Hiển thị trend direction marker
      if (
        higherHighs &&
        higherLows &&
        (activeFilters["Bull Prediction"] ||
          activeFilters["Breakout Prediction"])
      ) {
        markers.push({
          time: lastCandleTime,
          position: "aboveBar",
          color: "#00c853",
          shape: "arrowUp",
          text: "UPTREND",
        });
      }

      if (
        lowerHighs &&
        lowerLows &&
        (activeFilters["Bear Prediction"] ||
          activeFilters["Breakout Prediction"])
      ) {
        markers.push({
          time: lastCandleTime,
          position: "aboveBar",
          color: "#ff1744",
          shape: "arrowDown",
          text: "DOWNTREND",
        });
      }

      // FIX: Properly create Prediction object with correct types
      const predictionResult: Prediction = {
        direction: predictionDirection,
        confidence: Math.min(95, Math.max(confidence, 40)),
        pattern,
        targetPrice,
        stopLoss,
        signals:
          predictionDirection === "BULLISH" ? bullishSignals : bearishSignals,
        sma9,
        sma20,
        currentPrice,
        support: supportLevel,
        resistance: resistanceLevel,
        trend:
          higherHighs && higherLows
            ? "UPTREND"
            : lowerHighs && lowerLows
            ? "DOWNTREND"
            : "RANGE",
      };

      return { markers, prediction: predictionResult };
    },
    [activeFilters]
  );

  const detectChartPatterns = useCallback(
    (
      candles: {
        time: UTCTimestamp;
        open: number;
        high: number;
        low: number;
        close: number;
      }[]
    ): SeriesMarker<UTCTimestamp>[] => {
      const markers: SeriesMarker<UTCTimestamp>[] = [];
      if (candles.length < 10) return markers;

      const swingHighs: number[] = [];
      const swingLows: number[] = [];

      for (let i = 3; i < candles.length - 3; i++) {
        const currentHigh = candles[i].high;
        const currentLow = candles[i].low;

        if (
          currentHigh > candles[i - 1].high &&
          currentHigh > candles[i - 2].high &&
          currentHigh > candles[i + 1].high &&
          currentHigh > candles[i + 2].high
        ) {
          swingHighs.push(i);
        }

        if (
          currentLow < candles[i - 1].low &&
          currentLow < candles[i - 2].low &&
          currentLow < candles[i + 1].low &&
          currentLow < candles[i + 2].low
        ) {
          swingLows.push(i);
        }
      }

      if (activeFilters["Double Top"] && swingHighs.length >= 2) {
        const lastTwoHighs = swingHighs.slice(-2);
        const firstHigh = candles[lastTwoHighs[0]];
        const secondHigh = candles[lastTwoHighs[1]];

        const priceDiff =
          Math.abs(firstHigh.high - secondHigh.high) / firstHigh.high;
        if (priceDiff < 0.02) {
          markers.push({
            time: secondHigh.time,
            position: "aboveBar",
            color: "#ff6b6b",
            shape: "arrowDown",
            text: "Double Top",
          });
        }
      }

      if (activeFilters["Double Bottom"] && swingLows.length >= 2) {
        const lastTwoLows = swingLows.slice(-2);
        const firstLow = candles[lastTwoLows[0]];
        const secondLow = candles[lastTwoLows[1]];

        const priceDiff = Math.abs(firstLow.low - secondLow.low) / firstLow.low;
        if (priceDiff < 0.02) {
          markers.push({
            time: secondLow.time,
            position: "belowBar",
            color: "#51cf66",
            shape: "arrowUp",
            text: "Double Bottom",
          });
        }
      }

      if (activeFilters["Head & Shoulders"] && swingHighs.length >= 3) {
        const lastThreeHighs = swingHighs.slice(-3);
        const [left, head, right] = lastThreeHighs.map((idx) => candles[idx]);

        if (head.high > left.high && head.high > right.high) {
          markers.push({
            time: right.time,
            position: "aboveBar",
            color: "#ffa8a8",
            shape: "arrowDown",
            text: "H&S",
          });
        }
      }

      return markers;
    },
    [activeFilters]
  );

  // Fetch data function với auto-refresh
  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!candleSeriesRef.current) return;

      setIsLoading(true);
      try {
        console.log(
          `Fetching data for ${coin} with interval ${interval}, refresh: ${forceRefresh}`
        );

        const url = `${API_URL}/risk/${coin}?interval=${interval}&limit=200${
          forceRefresh ? "&refresh=true" : ""
        }`;

        const res = await axios.get<RiskData>(url);
        const data = res.data;

        setRiskData(data);
        setLastUpdate(new Date());

        const candles = data.candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        console.log(
          `Loaded ${candles.length} candles for ${coin} (${interval})`
        );
        candleSeriesRef.current.setData(candles);

        // Generate markers
        const markers: SeriesMarker<UTCTimestamp>[] = [];

        // Flags from API
        candles.forEach((c) => {
          const flags = data.flagsMap[c.time] || [];
          flags.forEach((flag) => {
            if (
              activeFilters[flag as keyof typeof FLAG_CONFIGS] &&
              FLAG_CONFIGS[flag as keyof typeof FLAG_CONFIGS]
            ) {
              const config = FLAG_CONFIGS[flag as keyof typeof FLAG_CONFIGS];
              markers.push({
                time: c.time,
                position: "aboveBar",
                color: config.color,
                shape: config.shape,
                text: config.text,
              });
            }
          });
        });

        // Technical patterns
        const patterns = detectPatterns(candles);
        const chartPatterns = detectChartPatterns(candles);

        // PREDICTION PATTERNS - GỌI HÀM PREDICT
        const { markers: predictionMarkers, prediction: newPrediction } =
          predictPatterns(candles);

        markers.push(...patterns, ...chartPatterns, ...predictionMarkers);

        // Cập nhật prediction state
        setPrediction(newPrediction);

        // Limit markers to prevent overcrowding
        const limitedMarkers = markers.slice(-40);
        console.log(
          `Setting ${limitedMarkers.length} markers, Prediction:`,
          newPrediction
        );
        candleSeriesRef.current.setMarkers(limitedMarkers);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      coin,
      interval,
      activeFilters,
      detectPatterns,
      detectChartPatterns,
      predictPatterns,
      API_URL,
    ]
  );

  // Auto refresh effect
  useEffect(() => {
    let intervalId: number;

    const startAutoRefresh = () => {
      let refreshTime = 60000;

      if (interval.includes("m")) {
        const minutes = parseInt(interval);
        refreshTime = Math.max(30000, minutes * 1000);
      } else if (interval.includes("h")) {
        refreshTime = 5 * 60000;
      } else if (interval.includes("d")) {
        refreshTime = 30 * 60000;
      }

      console.log(
        `Auto refresh every ${refreshTime}ms for interval ${interval}`
      );

      intervalId = window.setInterval(() => {
        if (autoRefresh) {
          console.log("Auto-refreshing data...");
          fetchData(true);
        }
      }, refreshTime);
    };

    fetchData();
    startAutoRefresh();

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [fetchData, autoRefresh, interval]);

  const toggleFilter = (filterName: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterName]: !prev[filterName as keyof typeof prev],
    }));
  };

  const selectAllFilters = () => {
    setActiveFilters(
      (prev) =>
        Object.fromEntries(
          Object.keys(prev).map((key) => [key, true])
        ) as typeof activeFilters
    );
  };

  const deselectAllFilters = () => {
    setActiveFilters(
      (prev) =>
        Object.fromEntries(
          Object.keys(prev).map((key) => [key, false])
        ) as typeof activeFilters
    );
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px" }}>
      {/* Controls */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          value={coin}
          onChange={(e) => setCoin(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            minWidth: 120,
          }}
        >
          {AVAILABLE_COINS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            minWidth: 80,
          }}
        >
          {INTERVALS.map((intv) => (
            <option key={intv} value={intv}>
              {intv}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Type coin symbol..."
          onKeyDown={(e) =>
            e.key === "Enter" &&
            setCoin((e.target as HTMLInputElement).value.toUpperCase())
          }
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            minWidth: 200,
          }}
        />

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid #ccc",
            backgroundColor: isLoading ? "#ccc" : "#0070f3",
            color: "white",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Loading..." : "Refresh Now"}
        </button>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <span style={{ fontSize: 14 }}>Auto Refresh</span>
        </label>
      </div>

      {/* Status Bar với Prediction */}
      <div
        style={{
          marginBottom: 12,
          padding: "12px 16px",
          backgroundColor: prediction
            ? prediction.direction === "BULLISH"
              ? "#e8f5e8"
              : prediction.direction === "BEARISH"
              ? "#ffebee"
              : "#e3f2fd"
            : "#f5f5f5",
          borderRadius: 8,
          fontSize: 14,
          color: prediction
            ? prediction.direction === "BULLISH"
              ? "#2e7d32"
              : prediction.direction === "BEARISH"
              ? "#c62828"
              : "#1565c0"
            : "#666",
          border: `2px solid ${
            prediction
              ? prediction.direction === "BULLISH"
                ? "#4caf50"
                : prediction.direction === "BEARISH"
                ? "#f44336"
                : "#2196f3"
              : "#ddd"
          }`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <strong>📊 {coin}</strong> | Interval: <strong>{interval}</strong> |
            Auto Refresh: <strong>{autoRefresh ? "ON" : "OFF"}</strong>
          </div>

          {/* Prediction Display */}
          {prediction && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                backgroundColor: "white",
                borderRadius: 6,
                border: `1px solid ${
                  prediction.direction === "BULLISH"
                    ? "#4caf50"
                    : prediction.direction === "BEARISH"
                    ? "#f44336"
                    : "#2196f3"
                }`,
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: 16 }}>
                {prediction.direction === "BULLISH"
                  ? "📈 BULLISH"
                  : prediction.direction === "BEARISH"
                  ? "📉 BEARISH"
                  : "↔️ NEUTRAL"}
              </div>
              <div>
                Confidence: <strong>{prediction.confidence}%</strong>
              </div>
              <div>
                Pattern: <strong>{prediction.pattern}</strong>
              </div>
              {prediction.targetPrice && (
                <div>
                  Target: <strong>{prediction.targetPrice.toFixed(4)}</strong>
                </div>
              )}
              {prediction.stopLoss && (
                <div>
                  Stop: <strong>{prediction.stopLoss.toFixed(4)}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          {lastUpdate && `Last update: ${lastUpdate.toLocaleTimeString()}`}
          {isLoading && " | 🔄 Updating..."}
        </div>
      </div>

      {/* Filter Section - Thêm prediction filters */}
      <div
        style={{
          marginBottom: 16,
          padding: 16,
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          backgroundColor: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h4 style={{ margin: 0, color: "#333" }}>Filter Markers:</h4>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={selectAllFilters}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                backgroundColor: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Select All
            </button>
            <button
              onClick={deselectAllFilters}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Deselect All
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(activeFilters).map(([filterName, isActive]) => (
            <button
              key={filterName}
              onClick={() => toggleFilter(filterName)}
              style={{
                padding: "6px 12px",
                borderRadius: 16,
                border: `2px solid ${
                  isActive
                    ? filterName.includes("Bull")
                      ? "#4caf50"
                      : filterName.includes("Bear")
                      ? "#f44336"
                      : "#2196f3"
                    : "#ddd"
                }`,
                backgroundColor: isActive
                  ? filterName.includes("Bull")
                    ? "#4caf50"
                    : filterName.includes("Bear")
                    ? "#f44336"
                    : "#2196f3"
                  : "white",
                color: isActive ? "white" : "#333",
                cursor: "pointer",
                fontSize: 12,
                transition: "all 0.2s",
              }}
            >
              {filterName}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        style={{
          position: "relative",
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          overflow: "hidden",
          minHeight: 550,
        }}
      />

      {/* Risk Data Panel */}
      {riskData && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            backgroundColor: "#fafafa",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div>
              <strong style={{ color: "black" }}>Risk Score:</strong>{" "}
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  background:
                    riskData.score >= 70
                      ? "#f44336"
                      : riskData.score >= 50
                      ? "#ff9800"
                      : "#4caf50",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                {riskData.score}
              </span>
            </div>

            <div>
              <strong style={{ color: "black" }}>Prediction Score:</strong>{" "}
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  background:
                    calculatePredictionScore(
                      riskData.latest,
                      riskData.flagsMap[riskData.latest.time] || []
                    ) >= 60
                      ? "#4caf50"
                      : "#f44336",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                {calculatePredictionScore(
                  riskData.latest,
                  riskData.flagsMap[riskData.latest.time] || []
                )}
              </span>
            </div>

            <button
              onClick={() => setIsVisible(!isVisible)}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid #ccc",
                backgroundColor: "#f0f0f0",
                cursor: "pointer",
                fontSize: 14,
                color: "#030000ff",
              }}
            >
              {isVisible ? "Hide Details" : "Show Details"}
            </button>
          </div>

          <div style={{ fontSize: 14, color: "#666", marginTop: 12 }}>
            <strong>Last Candle:</strong> O:{riskData.latest.open.toFixed(4)}
            H:{riskData.latest.high.toFixed(4)} L:
            {riskData.latest.low.toFixed(4)}
            C:{riskData.latest.close.toFixed(4)} Vol:
            {(riskData.latest.volume / 1000).toFixed(1)}K
          </div>

          {isVisible && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #e0e0e0",
              }}
            >
              <h5 style={{ margin: "0 0 8px 0", color: "black" }}>
                Recent Flags:
              </h5>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(riskData.flagsMap)
                  .slice(-8)
                  .map(([time, flags]) => (
                    <div
                      key={time}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#e3f2fd",
                        borderRadius: 4,
                        fontSize: 12,
                        color: "#1565c0",
                      }}
                    >
                      <small>
                        {new Date(Number(time) * 1000).toLocaleString()}:
                      </small>{" "}
                      {flags.join(", ")}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "12px 24px",
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "white",
            borderRadius: 8,
            fontSize: 14,
            zIndex: 1000,
          }}
        >
          🔄 Loading {coin} ({interval})...
        </div>
      )}
    </div>
  );
}
