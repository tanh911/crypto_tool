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

export function usePatternDetection(activeFilters: ActiveFilters) {
  const detectPatterns = useCallback(
    (candles: CandleData[]): SeriesMarker<UTCTimestamp>[] => {
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

        if (activeFilters["SMC"]) {
          for (let i = 4; i < candles.length; i++) {
            const current = candles[i];
            const prev1 = candles[i - 1];
            const prev2 = candles[i - 2];

            // ✅ CHECK: Đảm bảo volume tồn tại
            if (current.volume === undefined || prev1.volume === undefined) {
              continue; // Bỏ qua nếu không có volume data
            }

            // Simple SMC pattern logic
            const isSMCPattern =
              current.volume > prev1.volume * 1.5 && // Volume spike
              Math.abs(current.close - current.open) /
                (current.high - current.low) <
                0.3 && // Small body
              current.high - current.low > prev1.high - prev1.low; // Increased range

            if (isSMCPattern) {
              markers.push({
                time: current.time,
                position: "aboveBar",
                color: "#a46bffff",
                shape: "circle",
                text: "SMC",
              });
            }
          }
        }
      }

      return markers;
    },
    [activeFilters]
  );

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
  // Trong hooks/usePatternDetection.ts - cải tiến predictPatterns function

  const detectReversalPatterns = (
    candles: CandleData[],
    currentPrice: number,
    support: number,
    resistance: number
  ): { pattern: string; confidence: number; signals: string[] } => {
    const signals: string[] = [];
    let confidence = 0;
    let pattern = "NO_REVERSAL";

    if (candles.length < 5) return { pattern, confidence, signals };

    const recentCandles = candles.slice(-5);
    const current = recentCandles[recentCandles.length - 1];
    const prev = recentCandles[recentCandles.length - 2];

    // 1. SUPPORT BOUNCE REVERSAL (Bullish)
    if (current.low <= support * 1.01 && current.close > current.open) {
      signals.push("SUPPORT_BOUNCE");
      confidence += 25;

      // Tăng confidence nếu có volume confirmation
      if (current.volume && prev.volume && current.volume > prev.volume * 1.2) {
        signals.push("VOLUME_CONFIRMATION");
        confidence += 15;
      }
    }

    // 2. RESISTANCE REJECTION REVERSAL (Bearish)
    if (current.high >= resistance * 0.99 && current.close < current.open) {
      signals.push("RESISTANCE_REJECTION");
      confidence += 25;

      if (current.volume && prev.volume && current.volume > prev.volume * 1.2) {
        signals.push("VOLUME_CONFIRMATION");
        confidence += 15;
      }
    }

    // 3. HAMMER PATTERN (Bullish Reversal)
    const hammerBody = Math.abs(current.close - current.open);
    const hammerRange = current.high - current.low;
    const lowerShadow = Math.min(current.open, current.close) - current.low;
    const upperShadow = current.high - Math.max(current.open, current.close);

    if (
      hammerRange > 0 &&
      lowerShadow >= 2 * hammerBody &&
      upperShadow <= hammerBody * 0.5 &&
      current.close > current.open
    ) {
      signals.push("HAMMER_PATTERN");
      confidence += 30;
      pattern = "BULLISH_HAMMER_REVERSAL";
    }

    // 4. SHOOTING STAR (Bearish Reversal)
    if (
      hammerRange > 0 &&
      upperShadow >= 2 * hammerBody &&
      lowerShadow <= hammerBody * 0.5 &&
      current.close < current.open
    ) {
      signals.push("SHOOTING_STAR");
      confidence += 30;
      pattern = "BEARISH_SHOOTING_STAR_REVERSAL";
    }

    // 5. BULLISH ENGULFING tại support
    if (
      current.close > current.open &&
      prev.close < prev.open &&
      current.close > prev.open &&
      current.open < prev.close &&
      current.low <= support * 1.01
    ) {
      signals.push("BULLISH_ENGULFING_AT_SUPPORT");
      confidence += 35;
      pattern = "BULLISH_ENGULFING_REVERSAL";
    }

    // 6. BEARISH ENGULFING tại resistance
    if (
      current.close < current.open &&
      prev.close > prev.open &&
      current.open > prev.close &&
      current.close < prev.open &&
      current.high >= resistance * 0.99
    ) {
      signals.push("BEARISH_ENGULFING_AT_RESISTANCE");
      confidence += 35;
      pattern = "BEARISH_ENGULFING_REVERSAL";
    }

    // 7. RSI DIVERGENCE (Mạnh nhất)
    const rsiDivergence = detectRSIDivergence(candles);
    if (rsiDivergence !== "NO_DIVERGENCE") {
      signals.push(`RSI_${rsiDivergence}_DIVERGENCE`);
      confidence += 40;
      pattern = `${rsiDivergence}_DIVERGENCE_REVERSAL`;
    }

    // 8. DOUBLE TOP/BOTTOM
    const doublePattern = detectDoubleTopBottom(candles);
    if (doublePattern !== "NO_PATTERN") {
      signals.push(doublePattern);
      confidence += 35;
      pattern = `${doublePattern}_REVERSAL`;
    }

    return {
      pattern: confidence > 0 ? pattern : "NO_REVERSAL",
      confidence: Math.min(confidence, 95),
      signals,
    };
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

    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);

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
        // Chênh lệch < 2%
        return "DOUBLE_TOP";
      }
    }

    // Double Bottom: Hai swing lows gần bằng nhau
    if (swingLows.length >= 2) {
      const lastTwoLows = swingLows.slice(-2);
      const diff = Math.abs(lastTwoLows[0] - lastTwoLows[1]) / lastTwoLows[0];
      if (diff < 0.02) {
        // Chênh lệch < 2%
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
