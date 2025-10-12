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
import {
  calculateSMA,
  analyzeTrend,
  calculateEMA,
  calculateBinanceMA,
} from "../utils/technicalIndicators";

interface BinanceKline {
  0: number; // Open time (milliseconds)
  1: string; // Open price
  2: string; // High price
  3: string; // Low price
  4: string; // Close price
  5: string; // Volume
  6: number; // Close time (milliseconds)
  7: string; // Quote asset volume
  8: number; // Number of trades
  9: string; // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Ignore
}

interface SimpleKline {
  t: number; // Start time
  o: string; // Open price
  c: string; // Close price
  h: string; // High price
  l: string; // Low price
  v: string; // Volume
  x: boolean; // Is closed?
  s?: string; // Symbol (optional)
  i?: string; // Interval (optional)
}

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
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  detectPatterns: (candles: CandleData[]) => SeriesMarker<UTCTimestamp>[];
  detectChartPatterns: (candles: CandleData[]) => SeriesMarker<UTCTimestamp>[];
  predictPatterns: (candles: CandleData[]) => {
    markers: SeriesMarker<UTCTimestamp>[];
    prediction: Prediction | null;
  };
}

// Hàm fetch dữ liệu từ Binance Futures
const fetchBinanceFuturesData = async (
  symbol: string,
  interval: string,
  limit: number = 500
): Promise<CandleData[]> => {
  try {
    const formattedSymbol = symbol.toUpperCase();
    const response = await axios.get(
      `https://fapi.binance.com/fapi/v1/klines`,
      {
        params: {
          symbol: formattedSymbol,
          interval: interval,
          limit: limit,
        },
        timeout: 30000,
      }
    );

    const klines: BinanceKline[] = response.data;

    const candles: CandleData[] = klines.map((kline: BinanceKline) => ({
      time: Math.floor(kline[0] / 1000) as UTCTimestamp, // Convert milliseconds to seconds
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
    }));

    console.log(
      `✅ Binance Futures returned ${candles.length} candles for ${formattedSymbol}`
    );
    return candles;
  } catch (error) {
    console.error(`❌ Error fetching from Binance Futures:`, error);
    throw error;
  }
};

// Fallback đến backend nếu cần
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
  chartContainerRef,
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
  const candlesDataRef = useRef<CandleData[]>([]);

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

      // Price scale cho candles và MA (bên phải)
      const mainPriceScale = "right";
      chart.priceScale(mainPriceScale).applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.3,
        },
        borderColor: "#e0e0e0",
        mode: 1, // Logarithmic mode - sẽ cho khoảng cách đều hơn
        entireTextOnly: true, // Giúp giảm số lượng label hiển thị
      });

      // Điều chỉnh time scale để ảnh hưởng gián tiếp đến price scale
      chart.timeScale().applyOptions({
        barSpacing: 12, // Tăng khoảng cách nến
        minBarSpacing: 2,
        rightOffset: 15,
      });

      // Price scale cho volume (bên trái)
      const volumePriceScale = "left";
      chart.priceScale(volumePriceScale).applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0.1,
        },
        visible: false,
        borderColor: "#e0e0e0",
        entireTextOnly: true,
        autoScale: true,
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

      // Pane phụ (volume) - histogram
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: {
          type: "volume",
          precision: 0,
        },
        priceScaleId: volumePriceScale,
        color: "#26a69a",
      });

      volumeSeries.applyOptions({
        priceLineVisible: false,
        lastValueVisible: false,
        baseLineVisible: false,
      });

      // MA lines
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
    console.log(`✅ Volume updated: ${volumeData.length} data points`);
  }, []);

  // const updateMAs = useCallback((candles: CandleData[]) => {
  //   if (!ma25SeriesRef.current || !ma99SeriesRef.current) return;

  //   try {
  //     const closedCandles = candles.filter((c) => !!c.close);
  //     const ma25Values = calculateEMA(closedCandles, 25);
  //     const ma99Values = calculateEMA(closedCandles, 99);

  //     const ma25Data: { time: UTCTimestamp; value: number }[] = [];
  //     const ma99Data: { time: UTCTimestamp; value: number }[] = [];

  //     for (let i = 0; i < candles.length; i++) {
  //       const candle = candles[i];

  //       if (i >= 24 && ma25Values[i] !== null) {
  //         ma25Data.push({
  //           time: candle.time,
  //           value: ma25Values[i] as number,
  //         });
  //       }

  //       if (i >= 98 && ma99Values[i] !== null) {
  //         ma99Data.push({
  //           time: candle.time,
  //           value: ma99Values[i] as number,
  //         });
  //       }
  //     }

  //     // Set data
  //     ma25SeriesRef.current.setData(ma25Data);
  //     ma99SeriesRef.current.setData(ma99Data);

  //     // Phân tích xu hướng
  //     const validMa25Values = ma25Values.filter((v) => v !== null) as number[];
  //     const validMa99Values = ma99Values.filter((v) => v !== null) as number[];

  //     if (validMa25Values.length >= 2 && validMa99Values.length >= 2) {
  //       const trendAnalysis = analyzeTrend(
  //         candles,
  //         validMa25Values,
  //         validMa99Values
  //       );
  //       setTrendAnalysis(trendAnalysis);
  //     }

  //     console.log(
  //       `✅ MA lines updated: MA25=${ma25Data.length}, MA99=${ma99Data.length}`
  //     );
  //   } catch (error) {
  //     console.error("❌ Error updating MA lines:", error);
  //   }
  // }, []);

  // ===================== REAL-TIME CANDLE UPDATE =====================
  // Trong useDataFetching.ts
  const verifyMAWithBinance = (
    candles: CandleData[],
    ma25: (number | null)[],
    ma99: (number | null)[]
  ) => {
    if (candles.length < 99) return;

    const lastCandle = candles[candles.length - 1];
    const lastMA25 = ma25[ma25.length - 1];
    const lastMA99 = ma99[ma99.length - 1];

    console.log("🔍 MA VERIFICATION:");
    console.log("Current Price:", lastCandle.close);
    console.log("Our MA25:", lastMA25);
    console.log("Our MA99:", lastMA99);
    console.log(
      "Price vs MA25:",
      lastCandle.close > (lastMA25 || 0) ? "ABOVE" : "BELOW"
    );
    console.log(
      "Price vs MA99:",
      lastCandle.close > (lastMA99 || 0) ? "ABOVE" : "BELOW"
    );

    // Hiển thị các closes dùng để tính MA
    if (candles.length >= 25) {
      console.log(
        "Last 25 closes for MA25:",
        candles.slice(-25).map((c) => c.close)
      );
    }
    if (candles.length >= 99) {
      console.log(
        "Last 99 closes for MA99:",
        candles.slice(-99).map((c) => c.close)
      );
    }
  };

  const updateMAs = useCallback((candles: CandleData[]) => {
    if (!ma25SeriesRef.current || !ma99SeriesRef.current) return;

    try {
      if (candles.length < 100) {
        console.warn(`⚠️ Not enough candles for MA: ${candles.length} < 100`);
        return;
      }

      // 🔥 SỬ DỤNG HÀM TÍNH MA CHÍNH
      const ma25Values = calculateBinanceMA(candles, 25);
      const ma99Values = calculateBinanceMA(candles, 99);

      const ma25Data: { time: UTCTimestamp; value: number }[] = [];
      const ma99Data: { time: UTCTimestamp; value: number }[] = [];

      for (let i = 0; i < candles.length; i++) {
        if (ma25Values[i] !== null && i >= 24) {
          ma25Data.push({
            time: candles[i].time,
            value: ma25Values[i] as number,
          });
        }

        if (ma99Values[i] !== null && i >= 98) {
          ma99Data.push({
            time: candles[i].time,
            value: ma99Values[i] as number,
          });
        }
      }

      // UPDATE MA LINES
      ma25SeriesRef.current.setData(ma25Data);
      ma99SeriesRef.current.setData(ma99Data);

      // UPDATE TREND ANALYSIS
      const validMa25Values = ma25Values.filter((v): v is number => v !== null);
      const validMa99Values = ma99Values.filter((v): v is number => v !== null);

      if (validMa25Values.length >= 2 && validMa99Values.length >= 2) {
        const trend = analyzeTrend(candles, validMa25Values, validMa99Values);
        setTrendAnalysis(trend);
      }

      console.log(
        `✅ MA Updated - MA25: ${ma25Data[ma25Data.length - 1]?.value}, MA99: ${
          ma99Data[ma99Data.length - 1]?.value
        }`
      );
    } catch (error) {
      console.error("❌ MA update error:", error);
    }
  }, []);

  const updateCurrentCandle = useCallback(
    (kline: SimpleKline) => {
      if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

      try {
        const currentTime = Math.floor(kline.t / 1000) as UTCTimestamp; // Convert milliseconds to seconds
        const open = parseFloat(kline.o);
        const high = parseFloat(kline.h);
        const low = parseFloat(kline.l);
        const close = parseFloat(kline.c);
        const volume = parseFloat(kline.v);
        const isFinal = kline.x;

        const currentCandles = [...candlesDataRef.current];

        console.log("🔍 WEBSOCKET UPDATE DETAILS:", {
          time: new Date(currentTime * 1000),
          close: close,
          isFinal: isFinal,
          ourLastClose: currentCandles[currentCandles.length - 1]?.close,
        });

        if (isFinal) {
          // Candle closed - create new one
          const newCandle: CandleData = {
            time: currentTime,
            open: open,
            high: high,
            low: low,
            close: close,
            volume: volume,
          };
          currentCandles.push(newCandle);

          // Giới hạn số lượng candles để đảm bảo MA tính đúng
          if (currentCandles.length > 500) {
            currentCandles.splice(0, currentCandles.length - 500);
          }

          currentCandleRef.current = newCandle;

          console.log("🔄 NEW CANDLE CREATED:", {
            time: new Date(currentTime * 1000),
            close: close,
          });
        } else {
          // Update current candle
          const lastCandle = currentCandles[currentCandles.length - 1];
          if (lastCandle) {
            const updatedCandle: CandleData = {
              time: lastCandle.time,
              open: lastCandle.open,
              high: Math.max(lastCandle.high, high),
              low: Math.min(lastCandle.low, low),
              close: close,
              volume: volume,
            };
            currentCandles[currentCandles.length - 1] = updatedCandle;
            currentCandleRef.current = updatedCandle;

            // Update chart
            candleSeriesRef.current.update(updatedCandle);

            // Update volume
            const volumeColor =
              close >= updatedCandle.open ? "#26a69a" : "#ef5350";
            volumeSeriesRef.current.update({
              time: updatedCandle.time,
              value: volume,
              color: volumeColor,
            });

            console.log("📊 CANDLE UPDATED:", {
              previousClose: lastCandle.close,
              newClose: close,
              volume: volume,
            });
          }
        }

        // Cập nhật MA khi có thay đổi
        if (currentCandles.length >= 25) {
          updateMAs(currentCandles);
        }

        candlesDataRef.current = currentCandles;
        setLastUpdate(new Date());
      } catch (error) {
        console.error("❌ Error updating current candle:", error);
      }
    },
    [updateMAs, setLastUpdate]
  );

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

        let chartCandles: CandleData[] = [];

        // Thử fetch từ Binance Futures trước
        try {
          const binanceSymbol = coin.toUpperCase().endsWith("USDT")
            ? coin.toUpperCase()
            : `${coin.toUpperCase()}USDT`;

          chartCandles = await fetchBinanceFuturesData(
            binanceSymbol,
            interval,
            500
          );
          console.log(
            `✅ Successfully fetched ${chartCandles.length} candles from Binance Futures`
          );
        } catch (binanceError) {
          console.warn("❌ Binance Futures failed, falling back to backend");

          // Fallback đến backend
          const limit = historicalYears && historicalYears > 0 ? 1000 : 300;
          const backendCandles = await fetchHistoricalDataFromBackend(
            coin,
            interval,
            limit
          );

          chartCandles = backendCandles.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume || 0,
          }));
        }

        if (chartCandles.length === 0) {
          console.warn("No candles received from any source");
          return;
        }

        // Lưu vào reference
        candlesDataRef.current = chartCandles;
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
          latest: {
            time: chartCandles[chartCandles.length - 1].time,
            open: chartCandles[chartCandles.length - 1].open,
            high: chartCandles[chartCandles.length - 1].high,
            low: chartCandles[chartCandles.length - 1].low,
            close: chartCandles[chartCandles.length - 1].close,
            volume: chartCandles[chartCandles.length - 1].volume,
          },
          candles: chartCandles.map((c) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          })),
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

  // ===================== WEBSOCKET IMPROVED =====================
  useEffect(() => {
    if (!coin || !interval) {
      console.warn("❌ Coin or interval not specified for WebSocket");
      return;
    }

    // Đóng WebSocket cũ nếu tồn tại
    if (wsRef.current) {
      console.log("🔌 Closing previous WebSocket connection");
      wsRef.current.close();
      wsRef.current = null;
    }

    console.log(`🔌 Connecting to Binance WebSocket for ${coin}@${interval}`);

    try {
      // Sử dụng đúng format cho Futures
      const symbol = coin.toLowerCase().endsWith("usdt")
        ? coin.toLowerCase()
        : `${coin.toLowerCase()}usdt`;

      const wsUrl = `wss://fstream.binance.com/ws/${symbol}@kline_${interval}`;
      console.log(`🔌 WebSocket URL: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`✅ WebSocket connected for ${symbol}@${interval}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const kline = data.k;

          if (!kline) {
            console.warn("❌ No kline data in WebSocket message");
            return;
          }

          console.log(
            `📊 WebSocket update: ${kline.s} - ${kline.c} - Closed: ${kline.x}`
          );

          // Sử dụng hàm update mới
          updateCurrentCandle(kline);

          // Nếu candle đã đóng, fetch data mới sau 1 giây
          if (kline.x) {
            console.log("🔄 Candle closed, fetching new data...");
            setTimeout(() => {
              fetchData();
            }, 1000);
          }
        } catch (error) {
          console.error("❌ WebSocket message parse error:", error);
        }
      };

      ws.onerror = (error) => {
        console.error(`❌ WebSocket error for ${coin}:`, error);
      };

      ws.onclose = (event) => {
        console.log(
          `🔌 WebSocket closed for ${coin}:`,
          event.code,
          event.reason
        );

        // Tự động kết nối lại sau 5 giây
        if (event.code !== 1000) {
          console.log("🔄 Attempting to reconnect WebSocket in 5 seconds...");
          setTimeout(() => {
            if (coin && interval) {
              fetchData();
            }
          }, 5000);
        }
      };
    } catch (error) {
      console.error(`❌ Error creating WebSocket for ${coin}:`, error);
    }

    return () => {
      if (wsRef.current) {
        console.log("🧹 Cleaning up WebSocket connection");
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [coin, interval, fetchData, updateCurrentCandle]);

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
