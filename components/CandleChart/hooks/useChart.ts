import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  HistogramData,
} from "lightweight-charts";
import { CandleData } from "../types";

type VolumeData = HistogramData & {
  time: UTCTimestamp;
  value: number;
  color?: string;
};

export function useChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);

  // 🎯 Ref để lưu trữ timestamp hiện tại (tránh real-time update cho nến cũ)
  const currentTimeRef = useRef<UTCTimestamp | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#000000",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      grid: {
        vertLines: { color: "#f0f0f0" },
        horzLines: { color: "#f0f0f0" },
      },
      rightPriceScale: {
        borderColor: "#cccccc",
        scaleMargins: {
          top: 0.1,
          bottom: 0.3,
        },
        visible: true,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: "#cccccc",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
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
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceScaleId: "right",
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "left",
      priceLineVisible: false,
      lastValueVisible: false,
    });

    volumeSeries.applyOptions({
      color: "#26a69a",
      priceScaleId: "left",
    });

    chart.priceScale("left").applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
      visible: false,
    });

    chart.priceScale("right").applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.3,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    setChartInstance(chart);

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // 🎯 Hàm loại bỏ nến cuối cùng (current candle) để giống Binance
  const removeCurrentCandle = useCallback(
    (candleData: CandleData[]): CandleData[] => {
      if (candleData.length === 0) return candleData;

      // Chỉ giữ lại các nến đã đóng (loại bỏ nến cuối cùng)
      return candleData.slice(0, -1);
    },
    []
  );

  // 🎯 Hàm tạo volume data - LOẠI BỎ VOLUME CỦA NẾN CUỐI CÙNG
  const createVolumeData = useCallback(
    (candleData: CandleData[]): VolumeData[] => {
      if (candleData.length === 0) return [];

      // 🎯 QUAN TRỌNG: Loại bỏ nến cuối cùng để volume không bị cao bất thường
      const closedCandles = removeCurrentCandle(candleData);

      return closedCandles.map((candle) => ({
        time: candle.time,
        value: candle.volume || 0,
        color:
          candle.close >= candle.open
            ? "rgba(38, 166, 154, 0.6)"
            : "rgba(239, 83, 80, 0.6)",
      }));
    },
    [removeCurrentCandle]
  );

  // 🎯 Hàm update volume data
  const updateVolumeData = useCallback((volumeData: VolumeData[]) => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(volumeData);
    }
  }, []);

  // 🎯 Hàm update cả candle và volume data - LOẠI BỎ NẾN CUỐI
  const updateChartData = useCallback(
    (candleData: CandleData[], volumeData?: VolumeData[]) => {
      if (candleSeriesRef.current) {
        // 🎯 Hiển thị tất cả nến (bao gồm current candle)
        candleSeriesRef.current.setData(candleData);
      }

      if (volumeSeriesRef.current) {
        // 🎯 QUAN TRỌNG: Volume chỉ hiển thị cho nến ĐÃ ĐÓNG
        const dataToUse = volumeData || createVolumeData(candleData);
        volumeSeriesRef.current.setData(dataToUse);
      }
    },
    [createVolumeData]
  );

  // 🎯 Hàm update real-time - XỬ LÝ KHI CÓ NẾN MỚI HOÀN THÀNH
  const updateRealtimeData = useCallback(
    (candleUpdate: CandleData, volumeUpdate?: VolumeData) => {
      if (candleSeriesRef.current && volumeSeriesRef.current) {
        const currentTime = candleUpdate.time;

        // 🎯 Kiểm tra nếu đây là nến mới (khác timestamp)
        if (currentTimeRef.current !== currentTime) {
          // Đây là nến mới -> cập nhật cả candle và volume
          candleSeriesRef.current.update(candleUpdate);

          const volumeData = volumeUpdate || {
            time: candleUpdate.time,
            value: candleUpdate.volume || 0,
            color:
              candleUpdate.close >= candleUpdate.open
                ? "rgba(38, 166, 154, 0.6)"
                : "rgba(239, 83, 80, 0.6)",
          };
          volumeSeriesRef.current.update(volumeData);

          currentTimeRef.current = currentTime;
        } else {
          // 🎯 Cùng timestamp -> chỉ update candle, KHÔNG update volume
          // (tránh volume tăng liên tục cho nến chưa đóng)
          candleSeriesRef.current.update(candleUpdate);
        }
      }
    },
    []
  );

  // 🎯 Hàm xử lý khi nến đóng (complete candle)
  const onCandleClose = useCallback((closedCandle: CandleData) => {
    if (candleSeriesRef.current && volumeSeriesRef.current) {
      // Cập nhật candle
      candleSeriesRef.current.update(closedCandle);

      // 🎯 CHỈ update volume khi nến đã đóng
      const volumeData = {
        time: closedCandle.time,
        value: closedCandle.volume || 0,
        color:
          closedCandle.close >= closedCandle.open
            ? "rgba(38, 166, 154, 0.6)"
            : "rgba(239, 83, 80, 0.6)",
      };
      volumeSeriesRef.current.update(volumeData);
    }
  }, []);

  return {
    chartContainerRef,
    chartRef,
    candleSeriesRef,
    volumeSeriesRef,
    chartInstance,
    updateVolumeData,
    updateChartData,
    updateRealtimeData,
    onCandleClose, // 🎯 Thêm hàm xử lý nến đóng
    createVolumeData,
  };
}
