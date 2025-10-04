// utils/technicalIndicators.ts
import { CandleData } from "../types";

// Tính Simple Moving Average
// utils/technicalIndicators.ts
export const calculateSMA = (
  candles: CandleData[],
  period: number
): number[] => {
  if (candles.length < period) {
    console.warn(
      `❌ Not enough candles for SMA${period}: ${candles.length} < ${period}`
    );
    return [];
  }

  const sma: number[] = [];

  // Fill với null values cho các period đầu tiên
  for (let i = 0; i < period - 1; i++) {
    sma.push(0); // ✅ ĐÚNG: push null thay vì any
  }

  // Tính SMA cho các period đủ
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, candle) => acc + candle.close, 0);
    const average = sum / period;
    sma.push(average);
  }

  console.log(
    `✅ SMA${period} calculated: ${sma.length} values (${
      sma.filter((v) => v !== null).length
    } valid)`
  );
  return sma;
};

// Tính Exponential Moving Average
export const calculateEMA = (
  candles: CandleData[],
  period: number
): number[] => {
  if (candles.length < period) return [];

  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // SMA đầu tiên
  let emaValue =
    candles.slice(0, period).reduce((acc, candle) => acc + candle.close, 0) /
    period;
  ema.push(emaValue);

  // Các EMA tiếp theo
  for (let i = period; i < candles.length; i++) {
    emaValue = (candles[i].close - emaValue) * multiplier + emaValue;
    ema.push(emaValue);
  }

  return ema;
};

// Phân tích xu hướng
export const analyzeTrend = (
  candles: CandleData[],
  ma25: number[],
  ma99: number[]
): {
  trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  strength: number;
  signals: string[];
} => {
  if (candles.length < 100 || ma25.length < 2 || ma99.length < 2) {
    return { trend: "SIDEWAYS", strength: 0, signals: [] };
  }

  const signals: string[] = [];
  let bullishSignals = 0;
  let bearishSignals = 0;

  const currentPrice = candles[candles.length - 1].close;
  const currentMA25 = ma25[ma25.length - 1];
  const currentMA99 = ma99[ma99.length - 1];
  const prevMA25 = ma25[ma25.length - 2];
  const prevMA99 = ma99[ma99.length - 2];

  // Tín hiệu MA
  if (currentMA25 > currentMA99) {
    signals.push("MA25_ABOVE_MA99");
    bullishSignals++;
  } else {
    signals.push("MA25_BELOW_MA99");
    bearishSignals++;
  }

  if (currentPrice > currentMA25) {
    signals.push("PRICE_ABOVE_MA25");
    bullishSignals++;
  } else {
    signals.push("PRICE_BELOW_MA25");
    bearishSignals++;
  }

  if (currentPrice > currentMA99) {
    signals.push("PRICE_ABOVE_MA99");
    bullishSignals++;
  } else {
    signals.push("PRICE_BELOW_MA99");
    bearishSignals++;
  }

  // Xu hướng MA
  if (currentMA25 > prevMA25 && currentMA99 > prevMA99) {
    signals.push("MA_TREND_UP");
    bullishSignals += 2;
  } else if (currentMA25 < prevMA25 && currentMA99 < prevMA99) {
    signals.push("MA_TREND_DOWN");
    bearishSignals += 2;
  }

  // Xác định xu hướng
  let trend: "BULLISH" | "BEARISH" | "SIDEWAYS" = "SIDEWAYS";
  let strength = 0;

  if (bullishSignals > bearishSignals + 2) {
    trend = "BULLISH";
    strength = Math.min(
      100,
      (bullishSignals / (bullishSignals + bearishSignals)) * 100
    );
  } else if (bearishSignals > bullishSignals + 2) {
    trend = "BEARISH";
    strength = Math.min(
      100,
      (bearishSignals / (bullishSignals + bearishSignals)) * 100
    );
  } else {
    strength = Math.abs(bullishSignals - bearishSignals) * 10;
  }

  return { trend, strength: Math.round(strength), signals };
};

// Phát hiện mô hình giá
export const detectPricePatterns = (candles: CandleData[]): string[] => {
  const patterns: string[] = [];

  if (candles.length < 20) return patterns;

  const recentCandles = candles.slice(-20);

  // Higher Highs / Higher Lows (Uptrend)
  const highs = recentCandles.map((c) => c.high);
  const lows = recentCandles.map((c) => c.low);

  let higherHighs = true;
  let higherLows = true;
  let lowerHighs = true;
  let lowerLows = true;

  for (let i = 2; i < highs.length; i++) {
    if (highs[i] <= highs[i - 1]) higherHighs = false;
    if (lows[i] <= lows[i - 1]) higherLows = false;
    if (highs[i] >= highs[i - 1]) lowerHighs = false;
    if (lows[i] >= lows[i - 1]) lowerLows = false;
  }

  if (higherHighs && higherLows) patterns.push("UPTREND_HH_HL");
  if (lowerHighs && lowerLows) patterns.push("DOWNTREND_LH_LL");

  // Support/Resistance
  const currentClose = recentCandles[recentCandles.length - 1].close;
  const resistance = Math.max(...highs.slice(-10));
  const support = Math.min(...lows.slice(-10));

  if (Math.abs(currentClose - resistance) / resistance < 0.02) {
    patterns.push("NEAR_RESISTANCE");
  }
  if (Math.abs(currentClose - support) / support < 0.02) {
    patterns.push("NEAR_SUPPORT");
  }

  return patterns;
};
