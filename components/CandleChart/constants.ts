export const AVAILABLE_COINS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "ADAUSDT",
];
export const INTERVALS = [
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
//export const API_URL = "https://be-crypto-tool-1.onrender.com";
export const API_URL = "https://be-crypto-tool-1.onrender.com";
export const FLAG_CONFIGS = {
  SMC: { color: "red", text: "SMC↓", shape: "arrowDown" as const },
  SHOCK: { color: "blue", text: "Shock", shape: "circle" as const },
  LIQ: { color: "purple", text: "LIQ", shape: "arrowDown" as const },
  WYCK: { color: "orange", text: "WYCK", shape: "square" as const },
};

export const PREDICTION_CONFIGS = {
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

// Trong usePatternDetection hoặc constants
export const MARKER_CONFIG = {
  // Reversal Up markers (Bullish reversal)
  REVERSAL_UP: {
    position: "belowBar" as const,
    color: "#00D26A", // Xanh lá cho reversal up
    shape: "arrowUp" as const,
    size: 1.8,
  },

  // Reversal Down markers (Bearish reversal)
  REVERSAL_DOWN: {
    position: "aboveBar" as const,
    color: "#FF0080", // Đỏ hồng cho reversal down
    shape: "arrowDown" as const,
    size: 1.8,
  },

  // Pattern markers
  PATTERN_BULLISH: {
    position: "belowBar" as const,
    color: "#4ECDC4",
    shape: "circle" as const,
    size: 1.2,
  },

  PATTERN_BEARISH: {
    position: "aboveBar" as const,
    color: "#FF6B6B",
    shape: "circle" as const,
    size: 1.2,
  },

  // Prediction markers
  PREDICTION_BULL: {
    position: "inBar" as const,
    color: "#FFD93D",
    shape: "star" as const,
    size: 1.5,
  },

  PREDICTION_BEAR: {
    position: "inBar" as const,
    color: "#FF9F43",
    shape: "star" as const,
    size: 1.5,
  },
};
