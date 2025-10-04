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
export const API_URL = "http://localhost:4000";
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
