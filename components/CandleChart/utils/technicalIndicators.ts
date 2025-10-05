// utils/technicalIndicators.ts
import { CandleData } from "../types";
import { VolumeCluster, VolumeProfileLevel } from "../types";

/* ------------------------- MOVING AVERAGES ------------------------- */
export const calculateSMA = (
  data: CandleData[],
  period: number
): (number | null)[] => {
  if (data.length < period) return data.map(() => null);

  const sma: (number | null)[] = new Array(period - 1).fill(null);

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((total, candle) => total + candle.close, 0);
    sma.push(sum / period);
  }

  return sma;
};

export const calculateEMA = (
  data: CandleData[],
  period: number
): (number | null)[] => {
  if (data.length < period) return data.map(() => null);

  const k = 2 / (period + 1);
  const ema: (number | null)[] = new Array(period - 1).fill(null);

  // First EMA value is SMA
  const firstSMA =
    data.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) /
    period;
  ema.push(firstSMA);

  for (let i = period; i < data.length; i++) {
    const currentEMA = data[i].close * k + ema[i - 1]! * (1 - k);
    ema.push(currentEMA);
  }

  return ema;
};

/* ------------------------- TREND ANALYSIS -------------------------- */
export interface TrendAnalysis {
  trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  strength: number;
  signals: string[];
  maTrend?: "BULLISH" | "BEARISH" | "NEUTRAL";
  pricePosition?: "ABOVE_MA" | "BELOW_MA" | "NEAR_MA";
}

export const analyzeTrend = (
  candles: CandleData[],
  ma25: number[],
  ma99: number[]
): TrendAnalysis => {
  if (candles.length < 2) {
    return {
      trend: "SIDEWAYS",
      strength: 0,
      signals: ["INSUFFICIENT_DATA"],
    };
  }

  const signals: string[] = [];
  let bullishSignals = 0;
  let bearishSignals = 0;

  // Price position analysis
  const currentPrice = candles[candles.length - 1].close;
  const previousPrice = candles[candles.length - 2].close;

  // MA analysis
  if (ma25.length >= 2 && ma99.length >= 2) {
    const currentMA25 = ma25[ma25.length - 1];
    const previousMA25 = ma25[ma25.length - 2];
    const currentMA99 = ma99[ma99.length - 1];
    const previousMA99 = ma99[ma99.length - 2];

    // MA crossover signals
    if (currentMA25 > currentMA99 && previousMA25 <= previousMA99) {
      signals.push("MA25_CROSSED_ABOVE_MA99");
      bullishSignals++;
    }
    if (currentMA25 < currentMA99 && previousMA25 >= previousMA99) {
      signals.push("MA25_CROSSED_BELOW_MA99");
      bearishSignals++;
    }

    // Price vs MA position
    if (currentPrice > currentMA25 && currentPrice > currentMA99) {
      signals.push("PRICE_ABOVE_BOTH_MA");
      bullishSignals++;
    } else if (currentPrice < currentMA25 && currentPrice < currentMA99) {
      signals.push("PRICE_BELOW_BOTH_MA");
      bearishSignals++;
    }
  }

  // Price momentum
  const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
  if (Math.abs(priceChange) > 0.5) {
    if (priceChange > 0) {
      signals.push(`STRONG_UP_MOMENTUM_${priceChange.toFixed(2)}%`);
      bullishSignals++;
    } else {
      signals.push(`STRONG_DOWN_MOMENTUM_${Math.abs(priceChange).toFixed(2)}%`);
      bearishSignals++;
    }
  }

  // Determine overall trend
  let trend: "BULLISH" | "BEARISH" | "SIDEWAYS" = "SIDEWAYS";
  let strength = 0;

  if (bullishSignals > bearishSignals) {
    trend = "BULLISH";
    strength = bullishSignals / (bullishSignals + bearishSignals);
  } else if (bearishSignals > bullishSignals) {
    trend = "BEARISH";
    strength = bearishSignals / (bullishSignals + bearishSignals);
  } else {
    strength = 0.5;
  }

  return {
    trend,
    strength,
    signals,
  };
};

/* ------------------------- VOLUME ANALYSIS ------------------------- */
export const calculateVolumeProfile = (
  candles: CandleData[]
): VolumeCluster[] => {
  if (candles.length === 0) return [];

  // Group volume by price levels
  const priceLevels = new Map<number, number>();
  const priceStep = 0.001; // Adjust based on asset price

  candles.forEach((candle) => {
    const level = Math.round(candle.close / priceStep) * priceStep;
    priceLevels.set(level, (priceLevels.get(level) || 0) + candle.volume);
  });

  // Convert to array and calculate strength
  const totalVolume = Array.from(priceLevels.values()).reduce(
    (sum, vol) => sum + vol,
    0
  );
  const clusters: VolumeCluster[] = Array.from(priceLevels.entries())
    .map(([priceLevel, volume]) => ({
      priceLevel,
      volume,
      strength: volume / totalVolume,
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10); // Top 10 volume clusters

  return clusters;
};

export const analyzeVolumePattern = (candles: CandleData[]) => {
  if (candles.length < 20) return null;

  const recentVolumes = candles.slice(-5).map((c) => c.volume);
  const previousVolumes = candles.slice(-10, -5).map((c) => c.volume);

  const recentAvg =
    recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const previousAvg =
    previousVolumes.reduce((a, b) => a + b, 0) / previousVolumes.length;

  return {
    volumeChange: ((recentAvg - previousAvg) / previousAvg) * 100,
    isSpike: recentAvg > previousAvg * 2,
    trend: recentAvg > previousAvg ? "INCREASING" : "DECREASING",
  };
};

/* ------------------------- PATTERN DETECTION ----------------------- */
export const detectSupportResistance = (
  candles: CandleData[],
  lookback: number = 20
) => {
  if (candles.length < lookback) return { support: [], resistance: [] };

  const supportLevels: number[] = [];
  const resistanceLevels: number[] = [];

  for (let i = lookback; i < candles.length; i++) {
    const window = candles.slice(i - lookback, i);
    const currentHigh = window[window.length - 1].high;
    const currentLow = window[window.length - 1].low;

    // Check for resistance (price rejected at high)
    if (currentHigh === Math.max(...window.map((c) => c.high))) {
      resistanceLevels.push(currentHigh);
    }

    // Check for support (price rejected at low)
    if (currentLow === Math.min(...window.map((c) => c.low))) {
      supportLevels.push(currentLow);
    }
  }

  return {
    support: [...new Set(supportLevels)].sort((a, b) => a - b),
    resistance: [...new Set(resistanceLevels)].sort((a, b) => a - b),
  };
};

/* ------------------------- RISK METRICS --------------------------- */
export const calculateVolatility = (candles: CandleData[]): number => {
  if (candles.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    const returnVal =
      (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
    returns.push(returnVal);
  }

  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance =
    returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
    returns.length;

  return Math.sqrt(variance) * Math.sqrt(365); // Annualized volatility
};

export const calculateATR = (
  candles: CandleData[],
  period: number = 14
): number => {
  if (candles.length < period) return 0;

  const trueRanges = [];
  for (let i = 1; i < candles.length; i++) {
    const highLow = candles[i].high - candles[i].low;
    const highClose = Math.abs(candles[i].high - candles[i - 1].close);
    const lowClose = Math.abs(candles[i].low - candles[i - 1].close);
    trueRanges.push(Math.max(highLow, highClose, lowClose));
  }

  return trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
};
