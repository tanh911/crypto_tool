import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  SeriesMarker,
  UTCTimestamp,
  ISeriesApi,
  IChartApi,
  LineStyle,
} from "lightweight-charts";
import { RiskData, ActiveFilters, Prediction, Candle } from "../types";
import { API_URL } from "../constants";
import { TimeUtils } from "../utils/timeUtils";
import {
  calculateSMA,
  calculateEMA,
  analyzeTrend,
  detectPricePatterns,
} from "../utils/technicalIndicators";
interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // ✅ Đổi thành required
}

interface UseDataFetchingProps {
  coin: string;
  interval: string;
  activeFilters: ActiveFilters;
  setRiskData: (data: RiskData | null) => void;
  setLastUpdate: (date: Date) => void;
  setPrediction: (prediction: Prediction | null) => void;
  setIsLoading: (loading: boolean) => void;
  chartInstance: IChartApi | null;
  candleSeriesRef: React.MutableRefObject<ISeriesApi<"Candlestick"> | null>;
  detectPatterns: (candles: CandleData[]) => SeriesMarker<UTCTimestamp>[];
  detectChartPatterns: (candles: CandleData[]) => SeriesMarker<UTCTimestamp>[];
  predictPatterns: (candles: CandleData[]) => {
    markers: SeriesMarker<UTCTimestamp>[];
    prediction: Prediction | null;
  };
}

// Hàm fetch data từ backend
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
  candleSeriesRef,
  chartInstance,
  detectPatterns,
  detectChartPatterns,
  predictPatterns,
}: UseDataFetchingProps) {
  const currentCandleRef = useRef<CandleData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const ma25SeriesRef = useRef<ISeriesApi<"Line"> | null>(null); // ✅ Sửa type
  const ma99SeriesRef = useRef<ISeriesApi<"Line"> | null>(null); //
  const [trendAnalysis, setTrendAnalysis] = useState<{
    trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
    strength: number;
    signals: string[];
  } | null>(null);
  const initializeMASeries = useCallback((chart: IChartApi) => {
    if (!chart) return;

    try {
      // Clean up existing series
      if (ma25SeriesRef.current) {
        chart.removeSeries(ma25SeriesRef.current);
      }
      if (ma99SeriesRef.current) {
        chart.removeSeries(ma99SeriesRef.current);
      }

      // Tạo MA25 line (màu xanh)
      ma25SeriesRef.current = chart.addLineSeries({
        color: "#2962FF",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        title: "MA 25",
        priceScaleId: "right", // ✅ QUAN TRỌNG: Dùng chung price scale với candles
        lastValueVisible: true,
        priceLineVisible: false,
      });

      // Tạo MA99 line (màu cam)
      ma99SeriesRef.current = chart.addLineSeries({
        color: "#FF6D00",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        title: "MA 99",
        priceScaleId: "right", // ✅ QUAN TRỌNG: Dùng chung price scale với candles
        lastValueVisible: true,
        priceLineVisible: false,
      });

      console.log("✅ MA series initialized");
    } catch (error) {
      console.error("Error initializing MA series:", error);
    }
  }, []);

  // ✅ Khởi tạo MA series khi chart ready
  useEffect(() => {
    if (chartInstance) {
      initializeMASeries(chartInstance);
    }
  }, [chartInstance, initializeMASeries]);

  // ✅ Tính toán và vẽ MA lines
  const updateMALines = useCallback((candles: CandleData[]) => {
    if (!ma25SeriesRef.current || !ma99SeriesRef.current) {
      console.warn("❌ MA series not initialized");
      return;
    }

    try {
      console.log(`📊 Calculating MA for ${candles.length} candles...`);

      // Tính MA25 và MA99
      const ma25Values = calculateSMA(candles, 25);
      const ma99Values = calculateSMA(candles, 99);

      console.log(
        `📈 MA25 values: ${ma25Values.length}, MA99 values: ${ma99Values.length}`
      );

      if (ma25Values.length === 0 || ma99Values.length === 0) {
        console.warn("❌ MA calculation returned empty arrays");
        return;
      }

      // ✅ Tạo data cho MA lines - ĐẢM BẢO SỐ LƯỢNG BẰNG NHAU
      const ma25Data = candles
        .map((candle, index) => {
          // Nếu có MA value cho candle này thì dùng, không thì bỏ qua
          if (index < 24) {
            return null; // Không đủ data cho MA25
          }
          const maValue = ma25Values[index];
          return maValue !== null
            ? {
                time: candle.time,
                value: maValue,
              }
            : null;
        })
        .filter((item) => item !== null) as {
        time: UTCTimestamp;
        value: number;
      }[];

      const ma99Data = candles
        .map((candle, index) => {
          // Nếu có MA value cho candle này thì dùng, không thì bỏ qua
          if (index < 98) {
            return null; // Không đủ data cho MA99
          }
          const maValue = ma99Values[index];
          return maValue !== null
            ? {
                time: candle.time,
                value: maValue,
              }
            : null;
        })
        .filter((item) => item !== null) as {
        time: UTCTimestamp;
        value: number;
      }[];

      console.log(
        `📊 MA25 data points: ${ma25Data.length}, MA99 data points: ${ma99Data.length}`
      );

      // ✅ CLEAR DATA TRƯỚC KHI SET DATA MỚI
      ma25SeriesRef.current.setData([]);
      ma99SeriesRef.current.setData([]);

      // Set data cho MA lines
      if (ma25Data.length > 0) {
        ma25SeriesRef.current.setData(ma25Data);
      }
      if (ma99Data.length > 0) {
        ma99SeriesRef.current.setData(ma99Data);
      }

      // Phân tích xu hướng (chỉ khi có đủ data)
      if (ma25Data.length >= 2 && ma99Data.length >= 2) {
        const validMa25Values = ma25Values.filter(
          (v) => v !== null
        ) as number[];
        const validMa99Values = ma99Values.filter(
          (v) => v !== null
        ) as number[];

        const trendAnalysis = analyzeTrend(
          candles,
          validMa25Values,
          validMa99Values
        );
        console.log("🎯 Trend Analysis Result:", trendAnalysis);
        setTrendAnalysis(trendAnalysis);
      } else {
        console.warn("⚠️ Not enough MA data for trend analysis");
        setTrendAnalysis({
          trend: "SIDEWAYS",
          strength: 0,
          signals: ["INSUFFICIENT_MA_DATA"],
        });
      }

      console.log(`✅ MA lines updated successfully`);
    } catch (error) {
      console.error("❌ Error updating MA lines:", error);
    }
  }, []);
  // ✅ Hàm fetch data chính

  const fetchData = useCallback(
    async (forceRefresh = false, historicalYears?: number) => {
      if (!candleSeriesRef.current) return;

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

        // Convert to chart data với timezone correction
        const chartCandles: CandleData[] = candles.map((c) => ({
          time: TimeUtils.toLocalTimestamp(c.time) as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume || 0, // ✅ Đảm bảo có volume
        }));

        // ✅ LƯU CURRENT CANDLE để update real-time
        currentCandleRef.current = chartCandles[chartCandles.length - 1];

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

        // Set data lên chart
        candleSeriesRef.current.setData(chartCandles);
        //MA Line draw
        updateMALines(chartCandles);
        // Generate markers cho TOÀN BỘ data
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

        console.log(`✅ Data loaded: ${chartCandles.length} candles`);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      candleSeriesRef,
      setIsLoading,
      coin,
      interval,
      setRiskData,
      setLastUpdate,
      updateMALines,
      detectPatterns,
      detectChartPatterns,
      predictPatterns,
      setPrediction,
    ]
  );

  // ✅ Hàm fetch historical data
  const fetchLargeHistoricalData = useCallback(
    async (years: number = 1) => {
      if (!candleSeriesRef.current) {
        console.warn("Chart not initialized");
        return;
      }

      setIsLoading(true);
      console.log(`📊 Fetching ${years} years historical data for ${coin}`);

      try {
        // Tạm thời sử dụng fetchData với limit lớn
        await fetchData(false, years);
      } catch (error) {
        console.error("❌ Error in historical data fetch:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [coin, fetchData, candleSeriesRef, setIsLoading]
  );

  // ✅ WEBSOCKET - REAL-TIME CURRENT CANDLE UPDATES
  useEffect(() => {
    if (!coin) return;

    // Đóng connection cũ nếu có
    if (wsRef.current) {
      wsRef.current.close();
    }

    console.log(`🔌 Connecting to Binance WebSocket for ${coin}`);

    wsRef.current = new WebSocket(
      `wss://stream.binance.com:9443/ws/${coin.toLowerCase()}@ticker`
    );

    wsRef.current.onopen = () => {
      console.log(`✅ Binance WebSocket connected for ${coin}`);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const currentPrice = parseFloat(data.c);

        // ✅ CHỈ UPDATE CURRENT CANDLE - giống Binance
        if (currentCandleRef.current && candleSeriesRef.current) {
          const updatedCandle = {
            ...currentCandleRef.current,
            high: Math.max(currentCandleRef.current.high, currentPrice),
            low: Math.min(currentCandleRef.current.low, currentPrice),
            close: currentPrice,
          };

          // Update trên chart
          candleSeriesRef.current.update(updatedCandle);
          currentCandleRef.current = updatedCandle;

          // Update last update time
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error(`❌ WebSocket error for ${coin}:`, error);
    };

    wsRef.current.onclose = () => {
      console.log(`🔌 WebSocket closed for ${coin}`);
    };

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [coin, candleSeriesRef, setLastUpdate]);

  // ✅ Auto refresh data mỗi phút (chỉ data, WebSocket vẫn chạy)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔄 Auto-refreshing chart data...");
      fetchData();
    }, 60000); // 1 phút

    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    fetchData,
    fetchLargeHistoricalData,
    trendAnalysis,
  };
}
