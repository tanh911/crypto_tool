import { RiskData } from "../types";
import { calculatePredictionScore } from "../utils/patternUtils";

interface RiskPanelProps {
  riskData: RiskData;
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  isTablet: boolean; // Thêm prop isTablet
  isMobile?: boolean; // Thêm prop isMobile, không bắt buộc
}

export function RiskPanel({
  riskData,
  isVisible,
  setIsVisible,
  isTablet = false,
}: RiskPanelProps) {
  // ✅ Hàm helper để đảm bảo flags là array
  const getFlagsArray = (flags: string | string[] | undefined): string[] => {
    if (!flags) return [];
    if (Array.isArray(flags)) return flags;
    return [flags];
  };

  // ✅ Lấy flags cho candle hiện tại
  const currentFlags = getFlagsArray(riskData.flagsMap[riskData.latest.time]);

  // ✅ Tính prediction score
  const predictionScore = calculatePredictionScore(
    riskData.latest,
    currentFlags
  );

  return (
    <div
      style={{
        marginTop: 16,
        padding: isTablet ? "16px" : "20px",
        fontSize: isTablet ? "14px" : "16px",
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        backgroundColor: "#fafafa",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
        }}
      >
        <div>
          <strong style={{ color: "black" }}>Risk Score:</strong>{" "}
          <span
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              background:
                riskData.score >= 70
                  ? "#f44336"
                  : riskData.score >= 50
                  ? "#ff9800"
                  : "#4caf50",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {riskData.score}
          </span>
        </div>

        <div>
          <strong style={{ color: "black" }}>Prediction Score:</strong>{" "}
          <span
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              background: predictionScore >= 60 ? "#4caf50" : "#f44336",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {predictionScore}
          </span>
        </div>

        <button
          onClick={() => setIsVisible(!isVisible)}
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            border: "1px solid #ccc",
            backgroundColor: "#f0f0f0",
            cursor: "pointer",
            fontSize: 14,
            color: "#030000ff",
          }}
        >
          {isVisible ? "Hide Details" : "Show Details"}
        </button>
      </div>

      <div style={{ fontSize: 14, color: "#666", marginTop: 12 }}>
        <strong>Last Candle:</strong> O:{riskData.latest.open.toFixed(4)}
        H:{riskData.latest.high.toFixed(4)} L:
        {riskData.latest.low.toFixed(4)}
        C:{riskData.latest.close.toFixed(4)} Vol:
        {(riskData.latest.volume / 1000).toFixed(1)}K
      </div>

      {isVisible && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <h5 style={{ margin: "0 0 8px 0", color: "black" }}>Recent Flags:</h5>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(riskData.flagsMap)
              .slice(-8)
              .map(([time, flags]) => {
                // ✅ Đảm bảo flags luôn là array khi hiển thị
                const displayFlags = getFlagsArray(flags);
                return (
                  <div
                    key={time}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: 4,
                      fontSize: 12,
                      color: "#1565c0",
                    }}
                  >
                    <small>
                      {new Date(Number(time) * 1000).toLocaleString()}:
                    </small>{" "}
                    {displayFlags.join(", ")}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
