"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChartControls } from "./components/ChartControls";
import { StatusBar } from "./components/StatusBar";
import { FilterSection } from "./components/FilterSection";
import { RiskPanel } from "./components/RiskPanel";
import { useChart } from "./hooks/useChart";
import { usePatternDetection } from "./hooks/usePatternDetection";
import { useDataFetching } from "./hooks/useDataFetching";
import { RiskData, ActiveFilters, Prediction } from "./types";
import { TrendAnalysis } from "./components/TrendAnalysis";
import Image from "next/image";
import QRCODE from "../../public/OvD4M6ar.jpg";

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
  const [historicalYears, setHistoricalYears] = useState<number>(0);

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(
    createActiveFilters(true)
  );

  // Chart container ref
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const { detectPatterns, detectChartPatterns, predictPatterns } =
    usePatternDetection(activeFilters);

  // ✅ FIXED: Pass chartContainerRef to useDataFetching
  const { fetchData, trendAnalysis } = useDataFetching({
    coin,
    interval,
    activeFilters,
    setRiskData,
    setLastUpdate,
    setPrediction,
    setIsLoading,
    chartContainerRef, // Pass the chart container ref
    detectPatterns,
    detectChartPatterns,
    predictPatterns,
  });

  const isInitialMount = useRef(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);

  const optimizedFetchData = useCallback(
    async (isRefresh: boolean = false, years: number = 0) => {
      if (isFetchingRef.current) {
        console.log("⏳ Fetch already in progress, skipping...");
        return;
      }

      try {
        isFetchingRef.current = true;

        if (years > 0 || !isInitialMount.current) {
          setIsLoading(true);
        } else {
          setIsBackgroundLoading(true);
        }

        setError(null);
        await fetchData();
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch data. Please try again.");
      } finally {
        setIsLoading(false);
        setIsBackgroundLoading(false);
        isFetchingRef.current = false;

        if (isInitialMount.current) {
          isInitialMount.current = false;
        }
      }
    },
    [fetchData]
  );

  // EFFECT 1: Fetch data khi coin hoặc interval thay đổi
  useEffect(() => {
    if (!historicalYears || historicalYears === 0) {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        console.log(`🔄 Fetching data for ${coin} with interval ${interval}`);
        optimizedFetchData(false);
      }, 300);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [coin, interval, historicalYears, optimizedFetchData]);

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
        if (
          autoRefresh &&
          isMounted &&
          !historicalYears &&
          !isFetchingRef.current
        ) {
          console.log("🔄 Auto-refreshing data...");
          optimizedFetchData(true);
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
  }, [optimizedFetchData, autoRefresh, interval, historicalYears]);

  // EFFECT 3: Load historical data
  useEffect(() => {
    if (historicalYears > 0) {
      console.log(`📊 Loading historical data: ${historicalYears} years`);
      optimizedFetchData(false, historicalYears);
    }
  }, [optimizedFetchData, historicalYears]);

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

  const handleRefresh = useCallback(() => {
    setError(null);
    setHistoricalYears(0);
    optimizedFetchData(true);
  }, [optimizedFetchData]);

  const handleLoadHistorical = async (years: number) => {
    setError(null);
    setHistoricalYears(years);
  };

  const handleCoinChange = (newCoin: string) => {
    setError(null);
    setHistoricalYears(0);
    setCoin(newCoin);
  };

  const handleIntervalChange = (newInterval: string) => {
    setError(null);
    setHistoricalYears(0);
    setInterval(newInterval);
  };

  const handleResetToRealtime = () => {
    setHistoricalYears(0);
    setError(null);
    optimizedFetchData(true);
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

      {/* Historical Data Controls */}
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
            {(isLoading || isBackgroundLoading) && (
              <span style={{ color: "#2196f3" }}>
                {isLoading ? "🔄 Loading..." : "⏳ Updating..."}
              </span>
            )}
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
              <>🔄 Loading real-time data for ${interval} interval...</>
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

      {/* Main Price Chart */}
      <div
        ref={chartContainerRef}
        style={{
          position: "relative",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          overflow: "hidden",
          minHeight: 600,
          height: 600,
          backgroundColor: "white",
        }}
      />

      {/* Volume Chart Container */}
      {/* <div
        ref={volumeChartContainerRef}
        style={{
          border: "1px solid #e0e0e0",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          overflow: "hidden",
          height: 150,
          marginBottom: 16,
        }}
      /> */}

      <TrendAnalysis trendAnalysis={trendAnalysis} />

      {riskData && (
        <RiskPanel
          riskData={riskData}
          isVisible={isVisible}
          setIsVisible={setIsVisible}
        />
      )}

      {/* QR Code Section */}
      <div>
        <Image
          src={QRCODE}
          alt="Volume Chart Layout"
          width={250}
          height={250}
          style={{
            borderRadius: "8px",
            border: "1px solid #dee2e6",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
          placeholder="blur"
        />
        <div
          style={{
            marginTop: "8px",
            fontSize: "12px",
            color: "#6c757d",
            width: "250px",
          }}
        >
          <p
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              textAlign: "left",
              color: "#d32f2f",
              margin: 0,
              padding: "16px 32px",
              backgroundColor: "#ffebee",
              borderRadius: "8px",
              border: "2px dashed #d32f2f",
              width: "250px",
            }}
          >
            Ủng hộ mifnh nha
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
