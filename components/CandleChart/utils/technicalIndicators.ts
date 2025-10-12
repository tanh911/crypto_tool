// utils/technicalIndicators.ts
import { CandleData } from "../types";
import { VolumeCluster, VolumeProfileLevel } from "../types";

/* ------------------------- MOVING AVERAGES ------------------------- */

export const calculateSMA = (
  candles: CandleData[],
  period: number
): (number | null)[] => {
  if (candles.length < period) {
    console.warn(
      `⚠️ Not enough candles for SMA${period}: ${candles.length} < ${period}`
    );
    return new Array(candles.length).fill(null);
  }

  const sma: (number | null)[] = new Array(candles.length).fill(null);

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    const average = sum / period;
    sma[i] = average;
  }

  return sma;
};

// utils/technicalIndicators.ts

/**
 * Tính EMA chính xác theo Binance
 */
// utils/technicalIndicators.ts

export function calculateEMA(
  candles: CandleData[],
  period: number
): (number | null)[] {
  if (candles.length < period) {
    return new Array(candles.length).fill(null);
  }

  const ema: (number | null)[] = new Array(candles.length).fill(null);
  const multiplier = 2 / (period + 1);

  let sma = 0;
  for (let i = 0; i < period; i++) {
    sma += candles[i].close;
  }
  sma = sma / period;
  ema[period - 1] = sma;

  for (let i = period; i < candles.length; i++) {
    ema[i] = candles[i].close * multiplier + ema[i - 1]! * (1 - multiplier);
  }

  return ema;
}
export const calculateBinanceMA = (
  candles: CandleData[],
  period: number
): (number | null)[] => {
  if (candles.length < period) {
    console.warn(`Not enough candles: ${candles.length} < ${period}`);
    return new Array(candles.length).fill(null);
  }

  // 🔥 THỬ DÙNG SMA TRƯỚC VÌ BINANCE CÓ THỂ DÙNG SMA
  return calculateSMA(candles, period);
};
/**
 * Cách tính EMA thứ 2 - có thể Binance dùng cách này
 */
export function calculateEMA2(
  candles: CandleData[],
  period: number
): (number | null)[] {
  if (candles.length < period) {
    return new Array(candles.length).fill(null);
  }

  const ema: (number | null)[] = new Array(candles.length).fill(null);
  const k = 2 / (period + 1);

  // Bắt đầu từ candle thứ period
  let emaValue = candles[0].close; // Bắt đầu từ close đầu tiên

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      ema[i] = null;
      continue;
    }

    if (i === period - 1) {
      // Tính SMA cho period đầu tiên
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close;
      }
      emaValue = sum / period;
    } else {
      // Tính EMA
      emaValue = candles[i].close * k + emaValue * (1 - k);
    }

    ema[i] = emaValue;
  }

  return ema;
}

/**
 * Cách tính EMA thứ 3 - Reverse calculation (tính từ cuối)
 */
export function calculateEMA3(
  candles: CandleData[],
  period: number
): (number | null)[] {
  if (candles.length < period) {
    return new Array(candles.length).fill(null);
  }

  const ema: (number | null)[] = new Array(candles.length).fill(null);
  const multiplier = 2 / (period + 1);

  // Tính từ cuối mảng về đầu (có thể Binance làm vậy)
  for (let i = candles.length - 1; i >= period - 1; i--) {
    if (i === period - 1) {
      // SMA đầu tiên
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close;
      }
      ema[i] = sum / period;
    } else {
      ema[i] = candles[i].close * multiplier + ema[i + 1]! * (1 - multiplier);
    }
  }

  return ema;
}

/**
 * Hàm tính MA chính xác cho Binance Futures
 */

/**
 * Verify MA values với Binance
 */
export const verifyMAWithBinance = (
  candles: CandleData[],
  ma25: (number | null)[],
  ma99: (number | null)[]
) => {
  if (candles.length < 99) return;

  const lastCandle = candles[candles.length - 1];
  const lastMA25 = ma25[ma25.length - 1];
  const lastMA99 = ma99[ma99.length - 1];

  console.log("🔍 MA VERIFICATION:");
  console.log("Current Price:", lastCandle.close);
  console.log("Our MA25:", lastMA25);
  console.log("Our MA99:", lastMA99);

  // Hiển thị các closes dùng để tính MA
  console.log(
    "Last 25 closes for MA25:",
    candles.slice(-25).map((c) => c.close)
  );
  console.log(
    "Last 99 closes for MA99:",
    candles.slice(-99).map((c) => c.close)
  );
};

// 🔥 HÀM TÍNH MA CHÍNH XÁC CHO REAL-TIME
export const calculateMovingAverages = (
  candles: CandleData[],
  periods: number[]
): Record<number, (number | null)[]> => {
  const result: Record<number, (number | null)[]> = {};

  periods.forEach((period) => {
    if (period === 25 || period === 99) {
      // Sử dụng EMA cho MA25 và MA99
      result[period] = calculateEMA(candles, period);
    } else {
      result[period] = calculateSMA(candles, period);
    }
  });

  return result;
};

/* ------------------------- TREND ANALYSIS -------------------------- */
export interface TrendAnalysis {
  trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  strength: number;
  signals: string[];
  ma25Value?: number;
  ma99Value?: number;
}

export const analyzeTrend = (
  candles: CandleData[],
  ma25: number[],
  ma99: number[]
): TrendAnalysis => {
  if (candles.length < 2 || ma25.length < 2 || ma99.length < 2) {
    return {
      trend: "SIDEWAYS",
      strength: 0,
      signals: ["INSUFFICIENT_DATA"],
    };
  }

  const signals: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;

  const currentPrice = candles[candles.length - 1].close;
  const currentMA25 = ma25[ma25.length - 1];
  const currentMA99 = ma99[ma99.length - 1];

  // Price position vs MA
  if (currentPrice > currentMA25) {
    signals.push("PRICE_ABOVE_MA25");
    bullishScore++;
  } else {
    signals.push("PRICE_BELOW_MA25");
    bearishScore++;
  }

  if (currentPrice > currentMA99) {
    signals.push("PRICE_ABOVE_MA99");
    bullishScore += 2;
  } else {
    signals.push("PRICE_BELOW_MA99");
    bearishScore += 2;
  }

  // MA crossover
  if (currentMA25 > currentMA99) {
    signals.push("MA25_ABOVE_MA99");
    bullishScore++;
  } else {
    signals.push("MA25_BELOW_MA99");
    bearishScore++;
  }

  // Determine trend
  let trend: "BULLISH" | "BEARISH" | "SIDEWAYS" = "SIDEWAYS";
  let strength = 0;

  if (bullishScore > bearishScore) {
    trend = "BULLISH";
    strength = bullishScore / (bullishScore + bearishScore);
  } else if (bearishScore > bullishScore) {
    trend = "BEARISH";
    strength = bearishScore / (bullishScore + bearishScore);
  } else {
    strength = 0.5;
  }

  return {
    trend,
    strength: Math.round(strength * 100) / 100,
    signals,
    ma25Value: currentMA25,
    ma99Value: currentMA99,
  };
};

/* ------------------------- VOLUME ANALYSIS ------------------------- */
export const calculateVolumeProfile = (
  candles: CandleData[]
): VolumeCluster[] => {
  if (candles.length === 0) return [];

  // Group volume by price levels
  const priceLevels = new Map<number, number>();

  // Xác định price step dựa trên biến động giá
  const priceRange =
    Math.max(...candles.map((c) => c.high)) -
    Math.min(...candles.map((c) => c.low));
  const priceStep = priceRange > 100 ? 1 : priceRange > 10 ? 0.1 : 0.001;

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

  const volumeChange = ((recentAvg - previousAvg) / previousAvg) * 100;

  return {
    volumeChange: Math.round(volumeChange * 100) / 100,
    isSpike: recentAvg > previousAvg * 2,
    trend: recentAvg > previousAvg ? "INCREASING" : "DECREASING",
    recentAvg: Math.round(recentAvg),
    previousAvg: Math.round(previousAvg),
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

  // Loại bỏ trùng lặp và sắp xếp
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

/* ------------------------- UTILITY FUNCTIONS ---------------------- */

// Hàm kiểm tra tính hợp lệ của dữ liệu candles
export const validateCandles = (candles: CandleData[]): boolean => {
  if (!candles || candles.length === 0) return false;

  return candles.every(
    (candle) =>
      candle.time > 0 &&
      candle.open > 0 &&
      candle.high > 0 &&
      candle.low > 0 &&
      candle.close > 0 &&
      candle.high >= candle.low &&
      candle.high >= Math.max(candle.open, candle.close) &&
      candle.low <= Math.min(candle.open, candle.close)
  );
};

// Hàm lấy các candles hợp lệ cho tính toán MA
export const getValidCandlesForMA = (
  candles: CandleData[],
  period: number
): CandleData[] => {
  const validCandles = candles.filter(
    (candle) => candle.close && candle.close > 0
  );

  if (validCandles.length < period) {
    console.warn(
      `Only ${validCandles.length} valid candles for MA${period} calculation`
    );
  }

  return validCandles;
};
