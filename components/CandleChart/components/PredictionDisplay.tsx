import { Prediction } from "../types";

interface PredictionDisplayProps {
  prediction: Prediction;
}

export function PredictionDisplay({ prediction }: PredictionDisplayProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        backgroundColor: "white",
        borderRadius: 6,
        border: `1px solid ${
          prediction.direction === "BULLISH"
            ? "#4caf50"
            : prediction.direction === "BEARISH"
            ? "#f44336"
            : "#2196f3"
        }`,
      }}
    >
      <div style={{ fontWeight: "bold", fontSize: 16 }}>
        {prediction.direction === "BULLISH"
          ? "📈 BULLISH"
          : prediction.direction === "BEARISH"
          ? "📉 BEARISH"
          : "↔️ NEUTRAL"}
      </div>
      <div>
        Confidence: <strong>{prediction.confidence}%</strong>
      </div>
      <div>
        Pattern: <strong>{prediction.pattern}</strong>
      </div>
      {prediction.targetPrice && (
        <div>
          Target: <strong>{prediction.targetPrice.toFixed(4)}</strong>
        </div>
      )}
      {prediction.stopLoss && (
        <div>
          Stop: <strong>{prediction.stopLoss.toFixed(4)}</strong>
        </div>
      )}
    </div>
  );
}
