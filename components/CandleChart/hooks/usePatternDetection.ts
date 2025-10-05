import { useCallback } from "react";
import { SeriesMarker, UTCTimestamp } from "lightweight-charts";
import { Prediction, ActiveFilters } from "../types";
import { PREDICTION_CONFIGS } from "../constants";

interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
const REVERSAL_MARKER_CONFIG = {
  // Bullish Reversal Markers
  BULLISH_REVERSAL: {
    position: "belowBar" as const,
    color: "#00D26A", // Xanh lá đậm
    shape: "arrowUp" as const,
    size: 1.8,
  },

  BEARISH_REVERSAL: {
    position: "aboveBar" as const,
    color: "#ad2273ff", // Đỏ hồng
    shape: "arrowDown" as const,
    size: 1.8,
  },

  // Continuation Markers
  BULLISH_CONTINUATION: {
    position: "belowBar" as const,
    color: "#4ECDC4", // Xanh lá nhạt
    shape: "circle" as const,
    size: 1.3,
  },

  BEARISH_CONTINUATION: {
    position: "aboveBar" as const,
    color: "#FF6B6B", // Đỏ cam
    shape: "circle" as const,
    size: 1.3,
  },

  // Neutral/Pattern Markers
  NEUTRAL: {
    position: "inBar" as const,
    color: "#888888",
    shape: "square" as const,
    size: 1,
  },
};
export function usePatternDetection(activeFilters: ActiveFilters) {
  const predictPatterns = useCallback(
    (
      candles: CandleData[]
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
      if (activeFilters["Reversal Prediction"]) {
        const reversalMarkers = createReversalMarkers(
          candles,
          dynamicSupport,
          dynamicResistance
        );
        markers.push(...reversalMarkers);
      }
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

      // PREDICTION LOGIC
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
      if (
        activeFilters["Bull Prediction"] &&
        predictionDirection === "BULLISH"
      ) {
        const isReversal = pattern.includes("REVERSAL");
        const markerConfig = isReversal
          ? REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL
          : REVERSAL_MARKER_CONFIG.BULLISH_CONTINUATION;

        markers.push({
          time: lastCandleTime,
          position: markerConfig.position,
          color: markerConfig.color,
          shape: markerConfig.shape,
          size: markerConfig.size,
          text: isReversal
            ? `BULL-REV↑ ${confidence}%`
            : `BULL→ ${confidence}%`,
        });
      }

      if (
        activeFilters["Bear Prediction"] &&
        predictionDirection === "BEARISH"
      ) {
        const isReversal = pattern.includes("REVERSAL");
        const markerConfig = isReversal
          ? REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL
          : REVERSAL_MARKER_CONFIG.BEARISH_CONTINUATION;

        markers.push({
          time: lastCandleTime,
          position: markerConfig.position,
          color: markerConfig.color,
          shape: markerConfig.shape,
          size: markerConfig.size,
          text: isReversal
            ? `BEAR-REV↓ ${confidence}%`
            : `BEAR→ ${confidence}%`,
        });
      }
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
    (candles: CandleData[]): SeriesMarker<UTCTimestamp>[] => {
      const markers: SeriesMarker<UTCTimestamp>[] = [];
      if (candles.length < 10) return markers;

      const swingHighs: number[] = [];
      const swingLows: number[] = [];
      const usedTimes = new Set<number>();

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
      // 🎯 DOUBLE TOP - BEARISH REVERSAL
      if (activeFilters["Double Top"] && swingHighs.length >= 2) {
        const lastTwoHighs = swingHighs.slice(-2);
        const firstHigh = candles[lastTwoHighs[0]];
        const secondHigh = candles[lastTwoHighs[1]];

        const priceDiff =
          Math.abs(firstHigh.high - secondHigh.high) / firstHigh.high;
        if (priceDiff < 0.02 && !usedTimes.has(secondHigh.time)) {
          markers.push({
            time: secondHigh.time,
            position: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.position,
            color: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.color,
            shape: "circle",
            size: 1.8,
            text: "D-TOP↓",
          });
          usedTimes.add(secondHigh.time);
        }
      }

      // 🎯 DOUBLE BOTTOM - BULLISH REVERSAL
      if (activeFilters["Double Bottom"] && swingLows.length >= 2) {
        const lastTwoLows = swingLows.slice(-2);
        const firstLow = candles[lastTwoLows[0]];
        const secondLow = candles[lastTwoLows[1]];

        const priceDiff = Math.abs(firstLow.low - secondLow.low) / firstLow.low;
        if (priceDiff < 0.02 && !usedTimes.has(secondLow.time)) {
          markers.push({
            time: secondLow.time,
            position: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.position,
            color: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.color,
            shape: "circle",
            size: 1.8,
            text: "D-BOT↑",
          });
          usedTimes.add(secondLow.time);
        }
      }

      // 🎯 HEAD & SHOULDERS - BEARISH REVERSAL
      if (activeFilters["Head & Shoulders"] && swingHighs.length >= 3) {
        const lastThreeHighs = swingHighs.slice(-3);
        const [left, head, right] = lastThreeHighs.map((idx) => candles[idx]);

        if (
          head.high > left.high &&
          head.high > right.high &&
          !usedTimes.has(right.time)
        ) {
          markers.push({
            time: right.time,
            position: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.position,
            color: "#FF6B9D",
            shape: "circle",
            size: 2.0,
            text: "H&S↓",
          });
          usedTimes.add(right.time);
        }
      }
      // 🎯 DOUBLE TOP - BEARISH REVERSAL
      if (activeFilters["Double Top"] && swingHighs.length >= 2) {
        const lastTwoHighs = swingHighs.slice(-2);
        const firstHigh = candles[lastTwoHighs[0]];
        const secondHigh = candles[lastTwoHighs[1]];

        const priceDiff =
          Math.abs(firstHigh.high - secondHigh.high) / firstHigh.high;
        if (priceDiff < 0.02 && !usedTimes.has(secondHigh.time)) {
          markers.push({
            time: secondHigh.time,
            position: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.position,
            color: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.color,
            shape: "circle",
            size: 1.8,
            text: "D-TOP↓",
          });
          usedTimes.add(secondHigh.time);
        }
      }

      // 🎯 DOUBLE BOTTOM - BULLISH REVERSAL
      if (activeFilters["Double Bottom"] && swingLows.length >= 2) {
        const lastTwoLows = swingLows.slice(-2);
        const firstLow = candles[lastTwoLows[0]];
        const secondLow = candles[lastTwoLows[1]];

        const priceDiff = Math.abs(firstLow.low - secondLow.low) / firstLow.low;
        if (priceDiff < 0.02 && !usedTimes.has(secondLow.time)) {
          markers.push({
            time: secondLow.time,
            position: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.position,
            color: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.color,
            shape: "circle",
            size: 1.8,
            text: "D-BOT↑",
          });
          usedTimes.add(secondLow.time);
        }
      }

      // 🎯 HEAD & SHOULDERS - BEARISH REVERSAL
      if (activeFilters["Head & Shoulders"] && swingHighs.length >= 3) {
        const lastThreeHighs = swingHighs.slice(-3);
        const [left, head, right] = lastThreeHighs.map((idx) => candles[idx]);

        if (
          head.high > left.high &&
          head.high > right.high &&
          !usedTimes.has(right.time)
        ) {
          markers.push({
            time: right.time,
            position: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.position,
            color: "#FF6B9D",
            shape: "circle",
            size: 2.0,
            text: "H&S↓",
          });
          usedTimes.add(right.time);
        }
      }

      return markers;
    },
    [activeFilters]
  );
  // Trong hooks/usePatternDetection.ts - cải tiến predictPatterns function

  const detectReversalPatterns = useCallback(
    (
      candles: CandleData[],
      currentPrice: number,
      support: number,
      resistance: number
    ): {
      pattern: string;
      confidence: number;
      signals: string[];
      direction: "UP" | "DOWN";
    } => {
      const signals: string[] = [];
      let confidence = 0;
      let pattern = "NO_REVERSAL";
      let direction: "UP" | "DOWN" = "UP";

      if (candles.length < 5)
        return { pattern, confidence, signals, direction };

      const recentCandles = candles.slice(-5);
      const current = recentCandles[recentCandles.length - 1];
      const prev = recentCandles[recentCandles.length - 2];

      // 🎯 BULLISH REVERSAL SIGNALS
      const bullishSignals: string[] = [];
      let bullishConfidence = 0;

      // 1. SUPPORT BOUNCE REVERSAL
      if (current.low <= support * 1.01 && current.close > current.open) {
        bullishSignals.push("SUPPORT_BOUNCE");
        bullishConfidence += 25;
      }

      // 2. HAMMER PATTERN tại support
      const hammerBody = Math.abs(current.close - current.open);
      const hammerRange = current.high - current.low;
      const lowerShadow = Math.min(current.open, current.close) - current.low;

      if (
        hammerRange > 0 &&
        lowerShadow >= 2 * hammerBody &&
        current.low <= support * 1.01 &&
        current.close > current.open
      ) {
        bullishSignals.push("HAMMER_AT_SUPPORT");
        bullishConfidence += 30;
      }

      // 3. BULLISH ENGULFING tại support
      if (
        current.close > current.open &&
        prev.close < prev.open &&
        current.close > prev.open &&
        current.open < prev.close &&
        current.low <= support * 1.01
      ) {
        bullishSignals.push("ENGULFING_AT_SUPPORT");
        bullishConfidence += 35;
      }

      // 4. BULLISH RSI DIVERGENCE
      const rsiDivergence = detectRSIDivergence(candles);
      if (rsiDivergence === "BULLISH") {
        bullishSignals.push("RSI_BULLISH_DIVERGENCE");
        bullishConfidence += 40;
      }

      // 5. DOUBLE BOTTOM
      const doublePattern = detectDoubleTopBottom(candles);
      if (doublePattern === "DOUBLE_BOTTOM") {
        bullishSignals.push("DOUBLE_BOTTOM");
        bullishConfidence += 35;
      }

      // 🎯 BEARISH REVERSAL SIGNALS
      const bearishSignals: string[] = [];
      let bearishConfidence = 0;

      // 1. RESISTANCE REJECTION
      if (current.high >= resistance * 0.99 && current.close < current.open) {
        bearishSignals.push("RESISTANCE_REJECTION");
        bearishConfidence += 25;
      }

      // 2. SHOOTING STAR tại resistance
      const upperShadow = current.high - Math.max(current.open, current.close);
      if (
        hammerRange > 0 &&
        upperShadow >= 2 * hammerBody &&
        current.high >= resistance * 0.99 &&
        current.close < current.open
      ) {
        bearishSignals.push("SHOOTING_STAR_AT_RESISTANCE");
        bearishConfidence += 30;
      }

      // 3. BEARISH ENGULFING tại resistance
      if (
        current.close < current.open &&
        prev.close > prev.open &&
        current.open > prev.close &&
        current.close < prev.open &&
        current.high >= resistance * 0.99
      ) {
        bearishSignals.push("ENGULFING_AT_RESISTANCE");
        bearishConfidence += 35;
      }

      // 4. BEARISH RSI DIVERGENCE
      if (rsiDivergence === "BEARISH") {
        bearishSignals.push("RSI_BEARISH_DIVERGENCE");
        bearishConfidence += 40;
      }

      // 5. DOUBLE TOP
      if (doublePattern === "DOUBLE_TOP") {
        bearishSignals.push("DOUBLE_TOP");
        bearishConfidence += 35;
      }

      // 🎯 QUYẾT ĐỊNH REVERSAL DIRECTION
      if (bullishConfidence > bearishConfidence && bullishConfidence > 30) {
        pattern = "BULLISH_REVERSAL";
        confidence = Math.min(bullishConfidence, 95);
        signals.push(...bullishSignals);
        direction = "UP";
      } else if (
        bearishConfidence > bullishConfidence &&
        bearishConfidence > 30
      ) {
        pattern = "BEARISH_REVERSAL";
        confidence = Math.min(bearishConfidence, 95);
        signals.push(...bearishSignals);
        direction = "DOWN";
      }

      return { pattern, confidence, signals, direction };
    },
    []
  );

  // 🆕 HÀM TẠO REVERSAL MARKERS
  const createReversalMarkers = useCallback(
    (
      candles: CandleData[],
      support: number,
      resistance: number
    ): SeriesMarker<UTCTimestamp>[] => {
      const markers: SeriesMarker<UTCTimestamp>[] = [];
      if (candles.length < 5) return markers;

      const currentPrice = candles[candles.length - 1].close;
      const reversalData = detectReversalPatterns(
        candles,
        currentPrice,
        support,
        resistance
      );

      if (reversalData.pattern === "NO_REVERSAL") return markers;

      const currentTime = candles[candles.length - 1].time;
      const isBullish = reversalData.direction === "UP";

      if (isBullish) {
        markers.push({
          time: currentTime,
          position: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.position,
          color: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.color,
          shape: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.shape,
          size: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.size,
          text: `REV↑ ${reversalData.confidence}%`,
        });
      } else {
        markers.push({
          time: currentTime,
          position: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.position,
          color: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.color,
          shape: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.shape,
          size: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.size,
          text: `REV↓ ${reversalData.confidence}%`,
        });
      }

      return markers;
    },
    [detectReversalPatterns]
  );

  const detectPatterns = useCallback(
    (candles: CandleData[]): SeriesMarker<UTCTimestamp>[] => {
      const markers: SeriesMarker<UTCTimestamp>[] = [];
      const usedTimes = new Set<number>();

      for (let i = 2; i < candles.length; i++) {
        const prev = candles[i - 1];
        const current = candles[i];

        if (usedTimes.has(current.time)) continue;

        // 🎯 BULLISH ENGULFING - REVERSAL UP
        if (
          activeFilters["Bullish Engulfing"] &&
          current.close > current.open &&
          prev.close < prev.open &&
          current.close > prev.open &&
          current.open < prev.close
        ) {
          markers.push({
            time: current.time,
            position: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.position,
            color: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.color,
            shape: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.shape,
            size: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.size,
            text: "ENG↑",
          });
          usedTimes.add(current.time);
          continue;
        }

        // 🎯 BEARISH ENGULFING - REVERSAL DOWN
        if (
          activeFilters["Bearish Engulfing"] &&
          current.close < current.open &&
          prev.close > prev.open &&
          current.open > prev.close &&
          current.close < prev.open
        ) {
          markers.push({
            time: current.time,
            position: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.position,
            color: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.color,
            shape: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.shape,
            size: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.size,
            text: "ENG↓",
          });
          usedTimes.add(current.time);
          continue;
        }

        // 🎯 DOJI với context
        if (activeFilters["Doji"]) {
          const body = Math.abs(current.close - current.open);
          const range = current.high - current.low;
          if (range > 0 && body / range < 0.1) {
            const dojiContext = getDojiContext(candles, i);

            // 🎯 PHÂN BIỆT RÕ RÀNG 3 LOẠI DOJI
            switch (dojiContext) {
              case "bullish":
                markers.push({
                  time: current.time,
                  position: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.position, // belowBar
                  color: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.color, // #00D26A (xanh lá)
                  shape: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.shape, // arrowUp
                  size: REVERSAL_MARKER_CONFIG.BULLISH_REVERSAL.size, // 1.8
                  text: "DOJI↑", // Bullish reversal
                });
                break;

              case "bearish":
                markers.push({
                  time: current.time,
                  position: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.position, // aboveBar
                  color: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.color, // #6b3c54ff (đỏ hồng)
                  shape: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.shape, // arrowDown
                  size: REVERSAL_MARKER_CONFIG.BEARISH_REVERSAL.size, // 1.8
                  text: "DOJI↓", // Bearish reversal
                });
                break;

              default:
                markers.push({
                  time: current.time,
                  position: REVERSAL_MARKER_CONFIG.NEUTRAL.position, // inBar
                  color: REVERSAL_MARKER_CONFIG.NEUTRAL.color, // #888888 (xám)
                  shape: REVERSAL_MARKER_CONFIG.NEUTRAL.shape, // square
                  size: REVERSAL_MARKER_CONFIG.NEUTRAL.size, // 1
                  text: "DOJI", // Neutral
                });
            }

            usedTimes.add(current.time);
            continue;
          }
        }

        // 🎯 SMC PATTERNS
        if (activeFilters["SMC"] && i >= 4) {
          const prev1 = candles[i - 1];
          const prev2 = candles[i - 2];

          if (current.volume === undefined || prev1.volume === undefined) {
            continue;
          }

          const isSMCPattern =
            current.volume > prev1.volume * 1.5 &&
            Math.abs(current.close - current.open) /
              (current.high - current.low) <
              0.3 &&
            current.high - current.low > prev1.high - prev1.low;

          if (isSMCPattern) {
            markers.push({
              time: current.time,
              position: "aboveBar",
              color: "#a46bffff",
              shape: "circle",
              text: "SMC",
            });
            usedTimes.add(current.time);
            continue;
          }
        }
      }

      return markers;
    },
    [activeFilters]
  );

  // 🆕 HÀM XÁC ĐỊNH DOJI CONTEXT
  const getDojiContext = (
    candles: CandleData[],
    index: number
  ): "bullish" | "bearish" | "neutral" => {
    if (index < 2) return "neutral";

    const prevTrend = candles[index - 1].close - candles[index - 2].close;
    const currentClose = candles[index].close;
    const prevClose = candles[index - 1].close;

    if (prevTrend < 0 && currentClose > prevClose) return "bullish"; // Reversal up
    if (prevTrend > 0 && currentClose < prevClose) return "bearish"; // Reversal down
    return "neutral";
  };

  // Hàm phát hiện RSI Divergence
  const detectRSIDivergence = (candles: CandleData[]): string => {
    if (candles.length < 10) return "NO_DIVERGENCE";

    const recent = candles.slice(-10);

    // Tính RSI đơn giản
    const prices = recent.map((c) => c.close);
    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
    const rs = avgGain / (avgLoss || 0.001);
    const rsi = 100 - 100 / (1 + rs);

    // Bearish Divergence: Giá tạo higher high, RSI tạo lower high
    if (prices[prices.length - 1] > prices[prices.length - 3] && rsi < 70) {
      return "BEARISH";
    }

    // Bullish Divergence: Giá tạo lower low, RSI tạo higher low
    if (prices[prices.length - 1] < prices[prices.length - 3] && rsi > 30) {
      return "BULLISH";
    }

    return "NO_DIVERGENCE";
  };

  // Hàm phát hiện Double Top/Bottom
  const detectDoubleTopBottom = (candles: CandleData[]): string => {
    if (candles.length < 20) return "NO_PATTERN";

    const recent = candles.slice(-20);
    const highs = recent.map((c) => c.high);
    const lows = recent.map((c) => c.low);

    // Tìm các swing highs
    const swingHighs = [];
    for (let i = 2; i < highs.length - 2; i++) {
      if (
        highs[i] > highs[i - 1] &&
        highs[i] > highs[i - 2] &&
        highs[i] > highs[i + 1] &&
        highs[i] > highs[i + 2]
      ) {
        swingHighs.push(highs[i]);
      }
    }

    // Tìm các swing lows
    const swingLows = [];
    for (let i = 2; i < lows.length - 2; i++) {
      if (
        lows[i] < lows[i - 1] &&
        lows[i] < lows[i - 2] &&
        lows[i] < lows[i + 1] &&
        lows[i] < lows[i + 2]
      ) {
        swingLows.push(lows[i]);
      }
    }

    // Double Top: Hai swing highs gần bằng nhau
    if (swingHighs.length >= 2) {
      const lastTwoHighs = swingHighs.slice(-2);
      const diff =
        Math.abs(lastTwoHighs[0] - lastTwoHighs[1]) / lastTwoHighs[0];
      if (diff < 0.02) {
        return "DOUBLE_TOP";
      }
    }

    // Double Bottom: Hai swing lows gần bằng nhau
    if (swingLows.length >= 2) {
      const lastTwoLows = swingLows.slice(-2);
      const diff = Math.abs(lastTwoLows[0] - lastTwoLows[1]) / lastTwoLows[0];
      if (diff < 0.02) {
        return "DOUBLE_BOTTOM";
      }
    }

    return "NO_PATTERN";
  };

  return {
    detectPatterns,
    predictPatterns,
    detectChartPatterns,
    detectReversalPatterns,
    detectRSIDivergence,
    detectDoubleTopBottom,
  };
}
