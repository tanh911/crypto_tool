import { Prediction } from "../types";
import { PredictionDisplay } from "./PredictionDisplay";

interface StatusBarProps {
  coin: string;
  interval: string;
  autoRefresh: boolean;
  prediction: Prediction | null;
  lastUpdate: Date | null;
  isLoading: boolean;
  isTablet?: boolean;
  isMobile?: boolean;
}

export function StatusBar({
  coin,
  interval,
  autoRefresh,
  prediction,
  lastUpdate,
  isLoading,
  isTablet = false,
  isMobile = false,
}: StatusBarProps) {
  // ✅ Thêm các helper functions còn thiếu
  const getContainerPadding = () => {
    if (isMobile) return "10px 16px"; // ✅ Tăng từ 12px lên 16px
    if (isTablet) return "12px 20px"; // ✅ Tăng từ 14px lên 20px
    return "12px 24px"; // ✅ Tăng từ 16px lên 24px
  };

  const getFontSize = () => {
    if (isMobile) return 12;
    if (isTablet) return 13;
    return 14;
  };

  return (
    <div
      style={{
        marginBottom: isMobile ? 8 : 12,
        padding: getContainerPadding(),
        backgroundColor: prediction
          ? prediction.direction === "BULLISH"
            ? "#e8f5e8"
            : prediction.direction === "BEARISH"
            ? "#ffebee"
            : "#e3f2fd"
          : "#f5f5f5",
        borderRadius: 8,
        fontSize: getFontSize(),
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
        flexDirection: isMobile ? "column" : isTablet ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile || isTablet ? "stretch" : "center",
        gap: isMobile ? 4 : isTablet ? 10 : 12,
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* 📱 Mobile & 📟 iPad Layout: Column */}
      {isMobile || isTablet ? (
        <>
          {/* Dòng 1: Coin info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center",
              paddingBottom: 4,
              borderBottom: "1px solid rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <strong>📊 {coin}</strong>
            <span>|</span>
            <span>
              Interval: <strong>{interval}</strong>
            </span>
            <span>|</span>
            <span>
              Auto: <strong>{autoRefresh ? "ON" : "OFF"}</strong>
            </span>
          </div>

          {/* Dòng 2: Prediction */}
          {prediction && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "4px 0",
                textAlign: "center",
                width: "100%",
              }}
            >
              <PredictionDisplay prediction={prediction} />
            </div>
          )}

          {/* Dòng 3: Update info - iPad sẽ xuống dòng nếu cần */}
          <div
            style={{
              display: "flex",
              flexDirection: isTablet ? "column" : "row",
              alignItems: "center",
              justifyContent: "center",
              gap: isTablet ? 4 : 8,
              paddingTop: 4,
              borderTop: "1px solid rgba(0,0,0,0.1)",
              fontSize: isTablet ? getFontSize() : getFontSize() - 1,
              textAlign: "center",
            }}
          >
            {lastUpdate && (
              <span
                style={{
                  opacity: 0.8,
                  whiteSpace: isTablet ? "normal" : "nowrap",
                  textAlign: "center",
                  width: isTablet ? "100%" : "auto",
                }}
              >
                {isTablet
                  ? `Time : ${lastUpdate.toLocaleTimeString()}`
                  : `Time :${lastUpdate.toLocaleTimeString()}`}
              </span>
            )}
            {isLoading && (
              <span
                style={{
                  color: "#2196f3",
                  fontWeight: "bold",
                  marginTop: isTablet ? 2 : 0,
                }}
              >
                {isTablet ? "🔄 Đang cập nhật..." : "🔄 Updating"}
              </span>
            )}
          </div>
        </>
      ) : (
        /* 💻 Desktop Layout: 1 dòng */
        <>
          {/* Main Content */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <strong>📊 {coin}</strong>
              <span style={{ whiteSpace: "nowrap" }}>
                | Interval: <strong>{interval}</strong>
              </span>
              <span style={{ whiteSpace: "nowrap" }}>
                | Auto: <strong>{autoRefresh ? "ON" : "OFF"}</strong>
              </span>
            </div>

            {prediction && (
              <div style={{ flexShrink: 0, marginLeft: 8 }}>
                <PredictionDisplay prediction={prediction} />
              </div>
            )}
          </div>

          {/* Update Info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {/* {lastUpdate && (
              <span style={{ opacity: 0.8 }}>
                {`Last: ${lastUpdate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
              </span>
            )} */}
            {lastUpdate && `Time: ${lastUpdate.toLocaleTimeString()}`}
            {isLoading && (
              <span style={{ color: "#2196f3", fontWeight: "bold" }}>
                🔄 Updating
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
