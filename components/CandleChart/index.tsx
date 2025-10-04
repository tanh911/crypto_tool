"use client";

import { useState, useEffect } from "react";
import { ChartControls } from "./components/ChartControls";
import { StatusBar } from "./components/StatusBar";
import { FilterSection } from "./components/FilterSection";
import { RiskPanel } from "./components/RiskPanel";
import { useChart } from "./hooks/useChart";
import { usePatternDetection } from "./hooks/usePatternDetection";
import { useDataFetching } from "./hooks/useDataFetching";
import { RiskData, ActiveFilters, Prediction } from "./types";
import { TrendAnalysis } from "./components/TrendAnalysis";

// Helper function để tạo ActiveFilters object với tất cả keys
const createActiveFilters = (value: boolean): ActiveFilters => ({
  SMC: value,
  SHOCK: value,
  LIQ: value,
  WYCK: value,
  "Bullish Engulfing": value,
  "Bearish Engulfing": value,
  Doji: value,
  "Double Top": value,
  "Double Bottom": value,
  "Head & Shoulders": value,
  Triangle: value,
  "Bull Prediction": value,
  "Bear Prediction": value,
  "Range Prediction": value,
  "Breakout Prediction": value,
  "Reversal Prediction": value,
});

// Historical data options
const HISTORICAL_OPTIONS = [
  { label: "1 Month", years: 0.083 },
  { label: "3 Months", years: 0.25 },
  { label: "6 Months", years: 0.5 },
  { label: "1 Year", years: 1 },
  { label: "2 Years", years: 2 },
  { label: "3 Years", years: 3 },
  { label: "5 Years", years: 5 },
];

export default function CandleChart() {
  const [coin, setCoin] = useState("ETHUSDT");
  const [interval, setInterval] = useState("1h");
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historicalYears, setHistoricalYears] = useState<number>(0); // 0 = không load historical

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(
    createActiveFilters(true)
  );

  const { chartContainerRef, candleSeriesRef, chartInstance } = useChart();
  const { detectPatterns, detectChartPatterns, predictPatterns } =
    usePatternDetection(activeFilters);

  const { fetchData, fetchLargeHistoricalData, trendAnalysis } =
    useDataFetching({
      coin,
      interval,
      activeFilters,
      setRiskData,
      setLastUpdate,
      setPrediction,
      setIsLoading,
      candleSeriesRef,
      chartInstance,
      detectPatterns,
      detectChartPatterns,
      predictPatterns,
    });

  // EFFECT 1: Fetch data khi coin hoặc interval thay đổi (realtime data)
  useEffect(() => {
    if (!historicalYears || historicalYears === 0) {
      console.log(`🔄 Auto-fetching for ${coin} with interval ${interval}`);
      const loadData = async () => {
        setError(null);
        await fetchData(false);
      };
      loadData();
    }
  }, [coin, interval, historicalYears, fetchData]); // Thêm interval vào dependency

  // EFFECT 2: Auto refresh
  useEffect(() => {
    let intervalId: number;
    let isMounted = true;

    const startAutoRefresh = () => {
      let refreshTime = 60000;

      if (interval.includes("m")) {
        const minutes = parseInt(interval);
        refreshTime = Math.max(30000, minutes * 1000);
      } else if (interval.includes("h")) {
        refreshTime = 5 * 60000;
      } else if (interval.includes("d")) {
        refreshTime = 30 * 60000;
      }

      console.log(
        `Auto refresh every ${refreshTime}ms for interval ${interval}`
      );

      intervalId = window.setInterval(() => {
        if (autoRefresh && isMounted && !historicalYears) {
          console.log("Auto-refreshing data...");
          fetchData(true);
        }
      }, refreshTime);
    };

    if (isMounted && !historicalYears) {
      startAutoRefresh();
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [fetchData, autoRefresh, interval, historicalYears]);

  // EFFECT 3: Load historical data khi historicalYears thay đổi
  useEffect(() => {
    if (historicalYears > 0) {
      console.log(`📊 Loading historical data: ${historicalYears} years`);
      const loadHistorical = async () => {
        setError(null);
        await fetchData(false, historicalYears);
      };
      loadHistorical();
    }
  }, [fetchData, historicalYears]);

  const toggleFilter = (filterName: keyof ActiveFilters) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterName]: !prev[filterName],
    }));
  };

  const selectAllFilters = () => {
    setActiveFilters(createActiveFilters(true));
  };

  const deselectAllFilters = () => {
    setActiveFilters(createActiveFilters(false));
  };

  const handleRefresh = () => {
    setError(null);
    setHistoricalYears(0); // Reset về realtime data
    fetchData(true);
  };

  const handleLoadHistorical = async (years: number) => {
    setError(null);
    setHistoricalYears(years);
  };

  const handleCoinChange = (newCoin: string) => {
    setError(null);
    setHistoricalYears(0); // Reset về realtime data khi đổi coin
    setCoin(newCoin);
  };

  const handleIntervalChange = (newInterval: string) => {
    setError(null);
    setHistoricalYears(0); // Reset về realtime data khi đổi interval
    setInterval(newInterval);
  };

  const handleResetToRealtime = () => {
    setHistoricalYears(0);
    setError(null);
    fetchData(true);
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px" }}>
      {/* Error Display */}
      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            backgroundColor: "#ffebee",
            border: "1px solid #f44336",
            borderRadius: 8,
            color: "#c62828",
          }}
        >
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 12,
              padding: "4px 8px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <ChartControls
        coin={coin}
        setCoin={handleCoinChange}
        interval={interval}
        setInterval={handleIntervalChange}
        isLoading={isLoading}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        handleRefresh={handleRefresh}
      />

      {/* Historical Data Controls với realtime indicator */}
      <div
        style={{
          marginBottom: 16,
          padding: "16px",
          backgroundColor: historicalYears > 0 ? "#fff3e0" : "#e8f5e8",
          border: `1px solid ${historicalYears > 0 ? "#ff9800" : "#4caf50"}`,
          borderRadius: 8,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong
              style={{
                color: historicalYears > 0 ? "#e65100" : "#2e7d32",
                fontSize: 16,
              }}
            >
              {historicalYears > 0 ? "📊 Historical Data" : "🔄 Real-time Data"}
            </strong>
            {historicalYears > 0 && (
              <button
                onClick={handleResetToRealtime}
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  backgroundColor: "#ff9800",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Back to Real-time
              </button>
            )}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#666" }}>
            {/* {riskData &&
              `Loaded: ${riskData.candles.length} candles • ${riskData.interval}`} */}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            onClick={handleResetToRealtime}
            style={{
              padding: "6px 12px",
              borderRadius: 16,
              border: `2px solid ${historicalYears === 0 ? "#4caf50" : "#ccc"}`,
              backgroundColor: historicalYears === 0 ? "#4caf50" : "white",
              color: historicalYears === 0 ? "white" : "#4caf50",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Real-time
          </button>

          {HISTORICAL_OPTIONS.map((option) => (
            <button
              key={option.label}
              onClick={() => handleLoadHistorical(option.years)}
              disabled={isLoading}
              style={{
                padding: "6px 12px",
                borderRadius: 16,
                border: `2px solid ${
                  historicalYears === option.years ? "#2196f3" : "#90caf9"
                }`,
                backgroundColor:
                  historicalYears === option.years ? "#2196f3" : "white",
                color: historicalYears === option.years ? "white" : "#2196f3",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: 12,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Hiển thị trạng thái */}
        {isLoading && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              backgroundColor: "#e3f2fd",
              borderRadius: 4,
              fontSize: 12,
              color: "#1565c0",
            }}
          >
            {historicalYears > 0 ? (
              <>
                ⏳ Loading {historicalYears} year
                {historicalYears > 1 ? "s" : ""} of historical data...
              </>
            ) : (
              <>🔄 Loading real-time data for {interval} interval...</>
            )}
          </div>
        )}
      </div>

      <StatusBar
        coin={coin}
        interval={interval}
        autoRefresh={autoRefresh}
        prediction={prediction}
        lastUpdate={lastUpdate}
        isLoading={isLoading}
      />

      <FilterSection
        activeFilters={activeFilters}
        toggleFilter={toggleFilter}
        selectAllFilters={selectAllFilters}
        deselectAllFilters={deselectAllFilters}
      />

      <div
        ref={chartContainerRef}
        style={{
          position: "relative",
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          overflow: "hidden",
          minHeight: 550,
        }}
      />
      <TrendAnalysis trendAnalysis={trendAnalysis} />
      {riskData && (
        <RiskPanel
          riskData={riskData}
          isVisible={isVisible}
          setIsVisible={setIsVisible}
        />
      )}
      {isLoading && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "20px 30px",
            backgroundColor: "rgba(0,0,0,0.9)",
            color: "white",
            borderRadius: 12,
            fontSize: 16,
            zIndex: 1000,
            textAlign: "center",
            minWidth: 300,
          }}
        >
          {historicalYears > 0 ? (
            <>
              <div style={{ marginBottom: 12 }}>
                📊 Loading Historical Data...
              </div>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>
                {coin} ({interval}) - {historicalYears} year
                {historicalYears > 1 ? "s" : ""}
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                🔄 Loading Real-time Data...
              </div>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>
                {coin} ({interval})
              </div>
            </>
          )}
          <div style={{ fontSize: 12, opacity: 0.6 }}>Fetching from API...</div>
          <div
            style={{
              marginTop: 12,
              height: 4,
              backgroundColor: "#333",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                backgroundColor: "#2196f3",
                width: "60%",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
