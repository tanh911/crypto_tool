import { UTCTimestamp } from "lightweight-charts";

export interface Candle {
  time: number; // milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // ✅ Đổi thành required
}

export interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // ✅ Đổi thành required
}

export interface RiskData {
  symbol: string;
  score: number;
  flagsMap: { [key: string]: string[] };
  latest: Candle;
  candles: Candle[];
  interval: string;
}

export interface Prediction {
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  pattern: string;
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
