import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  SeriesMarker,
  UTCTimestamp,
  ISeriesApi,
  IChartApi,
  LineStyle,
  createChart,
} from "lightweight-charts";
import { RiskData, ActiveFilters, Prediction, Candle } from "../types";
import { API_URL } from "../constants";
import { TimeUtils } from "../utils/timeUtils";
import { calculateSMA, analyzeTrend } from "../utils/technicalIndicators";

interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface VolumeData {
  time: UTCTimestamp;
  value: number;
  color: string;
}

interface UseDataFetchingProps {
  coin: string;
  interval: string;
  activeFilters: ActiveFilters;
  setRiskData: (data: RiskData | null) => void;
  setLastUpdate: (date: Date) => void;
  setPrediction: (prediction: Prediction | null) => void;
  setIsLoading: (loading: boolean) => void;
  // ✅ FIXED: chartContainerRef is now properly defined
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  detectPatterns: (candles: CandleData[]) => SeriesMarker<UTCTimestamp>[];
  detectChartPatterns: (candles: CandleData[]) => SeriesMarker<UTCTimestamp>[];
  predictPatterns: (candles: CandleData[]) => {
    markers: SeriesMarker<UTCTimestamp>[];
    prediction: Prediction | null;
  };
}

const fetchHistoricalDataFromBackend = async (
  coin: string,
  interval: string,
  limit: number = 1000
): Promise<Candle[]> => {
  try {
    const url = `${API_URL}/risk/${coin}?interval=${interval}&limit=${limit}`;
    const response = await axios.get<RiskData>(url, { timeout: 30000 });

    if (response.data && response.data.candles) {
      console.log(
        `✅ Backend returned ${response.data.candles.length} candles`
      );
      return response.data.candles;
    }

    console.warn("Backend returned no candles");
    return [];
  } catch (error) {
    console.error(`❌ Error fetching from backend:`, error);
    throw error;
  }
};

export function useDataFetching({
  coin,
  interval,
  setRiskData,
  setLastUpdate,
  setPrediction,
  setIsLoading,
  chartContainerRef, // ✅ Now properly received from props
  detectPatterns,
  detectChartPatterns,
  predictPatterns,
}: UseDataFetchingProps) {
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ma25SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma99SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const currentCandleRef = useRef<CandleData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [trendAnalysis, setTrendAnalysis] = useState<{
    trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
    strength: number;
    signals: string[];
  } | null>(null);

  // ===================== INIT CHART =====================
  useEffect(() => {
    if (!chartContainerRef?.current) {
      console.warn("❌ Chart container not found");
      return;
    }

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    try {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 600,
        layout: {
          background: { color: "#ffffff" },
          textColor: "#333333",
        },
        grid: {
          vertLines: { color: "rgba(0,0,0,0.1)" },
          horzLines: { color: "rgba(0,0,0,0.1)" },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: "rgba(0,0,0,0.5)",
            labelBackgroundColor: "#ffffff",
          },
          horzLine: {
            color: "rgba(0,0,0,0.5)",
            labelBackgroundColor: "#ffffff",
          },
        },
        timeScale: {
          borderColor: "rgba(0,0,0,0.2)",
          timeVisible: true,
          secondsVisible: false,
          barSpacing: 6,
          minBarSpacing: 0.5,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      // ✅ Price scale cho candles và MA (bên phải) - CHÍNH
      const mainPriceScale = "right";
      chart.priceScale(mainPriceScale).applyOptions({
        scaleMargins: {
          top: 0.1, // 10% trên cùng
          bottom: 0.3, // 30% dưới cùng (chừa chỗ cho volume)
        },
        borderColor: "#e0e0e0",
      });

      // ✅ Price scale cho volume (bên trái) - RIÊNG BIỆT
      const volumePriceScale = "left";
      chart.priceScale(volumePriceScale).applyOptions({
        scaleMargins: {
          top: 0.7, // 70% trên cùng (volume ở dưới)
          bottom: 0.1, // 10% dưới cùng
        },
        visible: false,
        borderColor: "#e0e0e0",
        entireTextOnly: true,
        autoScale: true, // ✅ Tự động scale theo volume data
        mode: 2, // ✅ Chế độ logarithmic hoặc normal
      });

      // Pane chính (price) - candles
      const candleSeries = chart.addCandlestickSeries({
        priceScaleId: mainPriceScale,
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: false,
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
      });

      // Pane phụ (volume) - histogram - DÙNG PRICE SCALE RIÊNG
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: {
          type: "volume",
          precision: 0,
        },
        priceScaleId: volumePriceScale, // ✅ Dùng price scale riêng
        color: "#26a69a",
      });

      // Cấu hình thêm cho volume series
      volumeSeries.applyOptions({
        priceLineVisible: false,
        lastValueVisible: false, // Ẩn last value để gọn
        baseLineVisible: false,
      });

      // MA lines - dùng chung price scale với candles
      const ma25 = chart.addLineSeries({
        color: "#2962FF",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        title: "MA25",
        priceScaleId: mainPriceScale,
        lastValueVisible: true,
        priceLineVisible: false,
      });

      const ma99 = chart.addLineSeries({
        color: "#FF6D00",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        title: "MA99",
        priceScaleId: mainPriceScale,
        lastValueVisible: true,
        priceLineVisible: false,
      });

      // Lưu references
      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;
      ma25SeriesRef.current = ma25;
      ma99SeriesRef.current = ma99;

      console.log("✅ Chart initialized with separate price scales");

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    } catch (error) {
      console.error("Error initializing chart:", error);
    }
  }, [chartContainerRef]);

  // ===================== UPDATE FUNCTIONS =====================

  const updateVolume = useCallback((candles: CandleData[]) => {
    if (!volumeSeriesRef.current) return;

    const volumeData: VolumeData[] = candles.map((candle) => {
      const color = candle.close >= candle.open ? "#26a69a" : "#ef5350";

      return {
        time: candle.time,
        value: candle.volume,
        color: color,
      };
    });

    volumeSeriesRef.current.setData(volumeData);
    console.log(
      `✅ Volume updated with separate price scale: ${volumeData.length} data points`
    );
  }, []);

  const updateMAs = useCallback((candles: CandleData[]) => {
    if (!ma25SeriesRef.current || !ma99SeriesRef.current) return;

    try {
      const ma25Values = calculateSMA(candles, 25);
      const ma99Values = calculateSMA(candles, 99);

      const ma25Data = candles
        .map((candle, index) => {
          if (index < 24) return null;
          const maValue = ma25Values[index];
          return maValue !== null
            ? { time: candle.time, value: maValue }
            : null;
        })
        .filter((item) => item !== null) as {
        time: UTCTimestamp;
        value: number;
      }[];

      const ma99Data = candles
        .map((candle, index) => {
          if (index < 98) return null;
          const maValue = ma99Values[index];
          return maValue !== null
            ? { time: candle.time, value: maValue }
            : null;
        })
        .filter((item) => item !== null) as {
        time: UTCTimestamp;
        value: number;
      }[];

      // Clear old data
      ma25SeriesRef.current.setData([]);
      ma99SeriesRef.current.setData([]);

      // Set new data
      if (ma25Data.length > 0) ma25SeriesRef.current.setData(ma25Data);
      if (ma99Data.length > 0) ma99SeriesRef.current.setData(ma99Data);

      // Phân tích xu hướng
      const validMa25Values = ma25Values.filter((v) => v !== null) as number[];
      const validMa99Values = ma99Values.filter((v) => v !== null) as number[];

      if (validMa25Values.length >= 2 && validMa99Values.length >= 2) {
        const trendAnalysis = analyzeTrend(
          candles,
          validMa25Values,
          validMa99Values
        );
        setTrendAnalysis(trendAnalysis);
      }

      console.log(
        `✅ MA lines updated: MA25=${ma25Data.length}, MA99=${ma99Data.length}`
      );
    } catch (error) {
      console.error("❌ Error updating MA lines:", error);
    }
  }, []);

  // ===================== FETCH DATA =====================
  const fetchData = useCallback(
    async (forceRefresh: boolean = false, historicalYears?: number) => {
      if (!candleSeriesRef.current) {
        console.warn("❌ Candle series not initialized");
        return;
      }

      setIsLoading(true);
      try {
        console.log(`🔄 Fetching data for ${coin} with interval ${interval}`);

        const limit = historicalYears && historicalYears > 0 ? 1000 : 300;
        const candles = await fetchHistoricalDataFromBackend(
          coin,
          interval,
          limit
        );

        if (candles.length === 0) {
          console.warn("No candles received from backend");
          return;
        }

        // Convert to chart data
        const chartCandles: CandleData[] = candles.map((c) => ({
          time: TimeUtils.toLocalTimestamp(c.time) as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume || 0,
        }));

        // LƯU CURRENT CANDLE để update real-time
        currentCandleRef.current = chartCandles[chartCandles.length - 1];

        // Set data lên chart
        candleSeriesRef.current.setData(chartCandles);

        // Cập nhật indicators
        updateMAs(chartCandles);
        updateVolume(chartCandles);

        // Generate markers
        const markers: SeriesMarker<UTCTimestamp>[] = [];

        try {
          const patterns = detectPatterns(chartCandles);
          const chartPatterns = detectChartPatterns(chartCandles);
          const { markers: predictionMarkers, prediction: newPrediction } =
            predictPatterns(chartCandles.slice(-50));

          markers.push(...patterns, ...chartPatterns, ...predictionMarkers);
          setPrediction(newPrediction);
          console.log(`Generated ${markers.length} markers`);
        } catch (patternError) {
          console.warn("Error in pattern detection:", patternError);
        }

        const limitedMarkers = markers.slice(-50);
        candleSeriesRef.current.setMarkers(limitedMarkers);

        // Tạo risk data
        const riskData: RiskData = {
          symbol: coin,
          score: 50,
          flagsMap: {},
          latest: candles[candles.length - 1],
          candles: candles,
          interval,
        };

        setRiskData(riskData);
        setLastUpdate(new Date());

        console.log(`✅ Data loaded: ${chartCandles.length} candles`);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      coin,
      interval,
      setRiskData,
      setLastUpdate,
      setPrediction,
      setIsLoading,
      detectPatterns,
      detectChartPatterns,
      predictPatterns,
      updateMAs,
      updateVolume,
    ]
  );

  // ===================== WEBSOCKET =====================
  useEffect(() => {
    if (!coin) return;

    // Đóng WebSocket cũ nếu tồn tại
    if (wsRef.current) {
      wsRef.current.close();
    }

    console.log(`🔌 Connecting to Binance WebSocket for ${coin}`);

    try {
      const ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${coin.toLowerCase()}@kline_${interval}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`✅ WebSocket connected for ${coin}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const kline = data.k;

          if (kline && kline.x) {
            // Candle closed - fetch new data
            fetchData();
            return;
          }

          // Update current candle với volume
          if (kline && currentCandleRef.current && candleSeriesRef.current) {
            const currentPrice = parseFloat(kline.c);
            const currentVolume = parseFloat(kline.v);

            const updatedCandle = {
              ...currentCandleRef.current,
              high: Math.max(
                currentCandleRef.current.high,
                parseFloat(kline.h)
              ),
              low: Math.min(currentCandleRef.current.low, parseFloat(kline.l)),
              close: currentPrice,
              volume: currentVolume,
            };

            // Update MAIN CHART
            candleSeriesRef.current.update(updatedCandle);
            currentCandleRef.current = updatedCandle;

            // Update VOLUME
            if (volumeSeriesRef.current) {
              const volumeColor =
                currentPrice > updatedCandle.open ? "#26a69a" : "#ef5350";
              volumeSeriesRef.current.update({
                time: updatedCandle.time,
                value: currentVolume,
                color: volumeColor,
              });
            }

            setLastUpdate(new Date());
          }
        } catch (error) {
          console.error("WebSocket message parse error:", error);
        }
      };

      ws.onerror = (error) => {
        console.error(`❌ WebSocket error for ${coin}:`, error);
      };

      ws.onclose = () => {
        console.log(`🔌 WebSocket closed for ${coin}`);
      };
    } catch (error) {
      console.error(`❌ Error creating WebSocket for ${coin}:`, error);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [coin, interval, fetchData, setLastUpdate]);

  // ===================== AUTO REFRESH =====================
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log("🔄 Auto-refreshing chart data...");
      fetchData();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [fetchData]);

  return {
    fetchData,
    fetchLargeHistoricalData: fetchData,
    trendAnalysis,
  };
}
