import { Candle } from "../types";

export function calculatePredictionScore(
  candle: Candle,
  flags: string[]
): number {
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
