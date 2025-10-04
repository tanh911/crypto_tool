// components/TrendAnalysis.tsx
import React from "react";

interface TrendAnalysisProps {
  trendAnalysis: {
    trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
    strength: number;
    signals: string[];
  } | null;
}

export function TrendAnalysis({ trendAnalysis }: TrendAnalysisProps) {
  if (!trendAnalysis) return null;

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "BULLISH":
        return "#4caf50";
      case "BEARISH":
        return "#f44336";
      default:
        return "#ff9800";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "BULLISH":
        return "📈";
      case "BEARISH":
        return "📉";
      default:
        return "➡️";
    }
  };

  return (
    <div
      style={{
        padding: "12px 16px",
        backgroundColor: "#f8f9fa",
        border: `2px solid ${getTrendColor(trendAnalysis.trend)}`,
        borderRadius: "8px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontSize: "20px" }}>
          {getTrendIcon(trendAnalysis.trend)}
        </span>
        <div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: getTrendColor(trendAnalysis.trend),
            }}
          >
            {trendAnalysis.trend} TREND
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>
            Strength: {trendAnalysis.strength}%
          </div>
        </div>
      </div>

      <div style={{ fontSize: "12px", color: "#555" }}>
        <strong>Signals:</strong> {trendAnalysis.signals.join(", ")}
      </div>
    </div>
  );
}
