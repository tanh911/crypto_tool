// import { UTCTimestamp } from "lightweight-charts";
// import { TimeUtils } from "./utils/timeUtils";

// export interface Candle {
//   time: number; // milliseconds
//   open: number;
//   high: number;
//   low: number;
//   close: number;
//   volume: number; // ✅ Đổi thành required
// }

// export interface CandleData {
//   time: UTCTimestamp;
//   open: number;
//   high: number;
//   low: number;
//   close: number;
//   volume: number; // ✅ Đổi thành required
// }

// export interface RiskData {
//   symbol: string;
//   score: number;
//   flagsMap: { [key: string]: string[] };
//   latest: Candle;
//   candles: Candle[];
//   interval: string;
// }

export interface Prediction {
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  targetPrice?: number;
  stopLoss?: number;
  signals: string[];
  sma9: number;
  sma20: number;
  currentPrice: number;
  support: number;
  resistance: number;
  trend: "UPTREND" | "DOWNTREND" | "RANGE";
}

export interface ActiveFilters {
  SMC: boolean;
  SHOCK: boolean;
  LIQ: boolean;
  WYCK: boolean;
  "Bullish Engulfing": boolean;
  "Bearish Engulfing": boolean;
  Doji: boolean;
  "Double Top": boolean;
  "Double Bottom": boolean;
  "Head & Shoulders": boolean;
  Triangle: boolean;
  "Bull Prediction": boolean;
  "Bear Prediction": boolean;
  "Range Prediction": boolean;
  "Breakout Prediction": boolean;
  "Reversal Prediction": boolean;
}
// const convertToCandleData = (candles: Candle[]): CandleData[] => {
//   return candles.map((c) => ({
//     time: TimeUtils.toLocalTimestamp(c.time) as UTCTimestamp, // ✅ Convert sang UTCTimestamp
//     open: c.open,
//     high: c.high,
//     low: c.low,
//     close: c.close,
//     volume: c.volume || 0,
//   }));
// };
// types.ts
import { UTCTimestamp } from "lightweight-charts";

/* ----------------------------- CORE TYPES ----------------------------- */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  numberOfTrades?: number;
}

export interface VolumeData {
  time: UTCTimestamp;
  value: number;
  color?: string;
  quoteVolume?: number;
  numberOfTrades?: number;
  volumeMA?: number;
}

export interface RiskData {
  symbol: string;
  score: number;
  flagsMap: {
    [timestamp: string]: string | string[]; // ✅ Cho phép cả string và string[]
  };
  latest: Candle;
  candles: Candle[];
  interval: string;
  volumeAnalysis?: VolumeAnalysis;
}

export interface Prediction {
  confidence: number;
  targetPrice?: number;
  stopLoss?: number;
  timeframe?: string;
  pattern?: string;
  signals: string[];
}

export interface ActiveFilters {
  patterns?: boolean;
  indicators?: boolean;
  volume?: boolean;
  trend?: boolean;
}

/* ----------------------------- ANALYSIS TYPES ------------------------- */
export interface TrendAnalysis {
  trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  strength: number;
  signals: string[];
  maTrend?: "BULLISH" | "BEARISH" | "NEUTRAL";
  pricePosition?: "ABOVE_MA" | "BELOW_MA" | "NEAR_MA";
  supportLevel?: number;
  resistanceLevel?: number;
}

export interface VolumeAnalysis {
  totalVolume: number;
  averageVolume: number;
  volumeTrend: "INCREASING" | "DECREASING" | "STABLE";
  volumeClusters: VolumeCluster[];
  volumeSpike: boolean;
  spikeIntensity: number;
  relativeVolume?: number;
  volumeProfile?: VolumeProfileLevel[];
}

export interface VolumeCluster {
  priceLevel: number;
  volume: number;
  strength: number;
  type?: "SUPPORT" | "RESISTANCE";
}

export interface VolumeProfileLevel {
  priceLevel: number;
  totalVolume: number;
  percentage: number;
  type?: "POC" | "VA_HIGH" | "VA_LOW" | "SUPPORT" | "RESISTANCE";
}

/* ----------------------------- TECHNICAL TYPES ------------------------ */
export interface TechnicalIndicators {
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema12?: number;
  ema26?: number;
  rsi?: number;
  macd?: {
    value: number;
    signal: number;
    histogram: number;
  };
  bollingerBands?: {
    upper: number;
    middle: number;
    lower: number;
    width: number;
  };
  atr?: number;
  obv?: number;
}

export interface PatternSignal {
  type: string;
  strength: number;
  direction: "BULLISH" | "BEARISH";
  confidence: number;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: string;
}

/* ----------------------------- CHART TYPES ---------------------------- */
export interface ChartConfig {
  autoRefresh: boolean;
  showVolume: boolean;
  showIndicators: boolean;
  showPatterns: boolean;
  theme: "light" | "dark";
  priceScale: "left" | "right";
  timeScale: {
    visible: boolean;
    timeVisible: boolean;
    secondsVisible: boolean;
  };
}

export interface MarkerData {
  time: UTCTimestamp;
  position: "aboveBar" | "belowBar";
  color: string;
  shape: "arrowUp" | "arrowDown" | "circle" | "square";
  text: string;
}

/* ----------------------------- API TYPES ----------------------------- */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: number;
}

export interface HistoricalDataRequest {
  symbol: string;
  interval: string;
  limit: number;
  startTime?: number;
  endTime?: number;
  includeVolumeData?: boolean;
  includeIndicators?: boolean;
}

/* ----------------------------- SETTINGS TYPES ------------------------ */
export interface UserSettings {
  notifications: {
    priceAlerts: boolean;
    patternAlerts: boolean;
    volumeSpikeAlerts: boolean;
  };
  riskManagement: {
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
  };
  trading: {
    defaultLeverage: number;
    defaultMargin: number;
    autoClose: boolean;
  };
}

/* ----------------------------- UTILITY TYPES ------------------------- */
export type Timeframe =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "6h"
  | "8h"
  | "12h"
  | "1d"
  | "3d"
  | "1w"
  | "1M";

export type MarketType = "spot" | "futures" | "margin";

export interface ExchangeInfo {
  name: string;
  supportedPairs: string[];
  rateLimits: RateLimit[];
  timeframes: Timeframe[];
}

export interface RateLimit {
  rateLimitType: "REQUEST_WEIGHT" | "ORDERS" | "RAW_REQUESTS";
  interval: "MINUTE" | "SECOND";
  intervalNum: number;
  limit: number;
}

/* ----------------------------- ERROR TYPES --------------------------- */

export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  timeliness: number;
  consistency: number;
  overallScore: number;
}

// types.ts - Thêm các types này
export interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  numberOfTrades?: number;
}

export interface EnhancedVolumeData {
  time: UTCTimestamp;
  value: number;
  color: string;
  quoteVolume?: number;
  numberOfTrades?: number;
  volumeMA?: number;
}
