import { Prediction } from "../types";
import { PredictionDisplay } from "./PredictionDisplay";

interface StatusBarProps {
  coin: string;
  interval: string;
  autoRefresh: boolean;
  prediction: Prediction | null;
  lastUpdate: Date | null;
  isLoading: boolean;
}

export function StatusBar({
  coin,
  interval,
  autoRefresh,
  prediction,
  lastUpdate,
  isLoading,
}: StatusBarProps) {
  return (
    <div
      style={{
        marginBottom: 12,
        padding: "12px 16px",
        backgroundColor: prediction
          ? prediction.direction === "BULLISH"
            ? "#e8f5e8"
            : prediction.direction === "BEARISH"
            ? "#ffebee"
            : "#e3f2fd"
          : "#f5f5f5",
        borderRadius: 8,
        fontSize: 14,
        color: prediction
          ? prediction.direction === "BULLISH"
            ? "#2e7d32"
            : prediction.direction === "BEARISH"
            ? "#c62828"
            : "#1565c0"
          : "#666",
        border: `2px solid ${
          prediction
            ? prediction.direction === "BULLISH"
              ? "#4caf50"
              : prediction.direction === "BEARISH"
              ? "#f44336"
              : "#2196f3"
            : "#ddd"
        }`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <strong>📊 {coin}</strong> | Interval: <strong>{interval}</strong> |
          Auto Refresh: <strong>{autoRefresh ? "ON" : "OFF"}</strong>
        </div>

        {prediction && <PredictionDisplay prediction={prediction} />}
      </div>

      <div>
        {lastUpdate && `Last update: ${lastUpdate.toLocaleTimeString()}`}
        {isLoading && " | 🔄 Updating..."}
      </div>
    </div>
  );
}
