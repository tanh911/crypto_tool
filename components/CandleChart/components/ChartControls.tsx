import { AVAILABLE_COINS, INTERVALS } from "../constants";

interface ChartControlsProps {
  coin: string;
  setCoin: (coin: string) => void;
  interval: string;
  setInterval: (interval: string) => void;
  isLoading: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (autoRefresh: boolean) => void;
  handleRefresh: () => void;
}

// Intervals optimized for historical data
const HISTORICAL_INTERVALS = ["1d", "4h", "1h", "15m", "5m", "1m"];

export function ChartControls({
  coin,
  setCoin,
  interval,
  setInterval,
  isLoading,
  autoRefresh,
  setAutoRefresh,
  handleRefresh,
}: ChartControlsProps) {
  return (
    <div
      style={{
        marginBottom: 16,
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <select
        value={coin}
        onChange={(e) => setCoin(e.target.value)}
        disabled={isLoading}
        style={{
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid #ccc",
          minWidth: 120,
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {AVAILABLE_COINS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={interval}
        onChange={(e) => setInterval(e.target.value)}
        disabled={isLoading}
        style={{
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid #ccc",
          minWidth: 80,
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {HISTORICAL_INTERVALS.map((intv) => (
          <option key={intv} value={intv}>
            {intv}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Type coin symbol..."
        onKeyDown={(e) =>
          e.key === "Enter" &&
          setCoin((e.target as HTMLInputElement).value.toUpperCase())
        }
        disabled={isLoading}
        style={{
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid #ccc",
          minWidth: 200,
          opacity: isLoading ? 0.6 : 1,
        }}
      />

      <button
        onClick={handleRefresh}
        disabled={isLoading}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "1px solid #ccc",
          backgroundColor: isLoading ? "#ccc" : "#0070f3",
          color: "white",
          cursor: isLoading ? "not-allowed" : "pointer",
        }}
      >
        {isLoading ? "Loading..." : "Refresh Now"}
      </button>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
          disabled={isLoading}
        />
        <span style={{ fontSize: 14 }}>Auto Refresh</span>
      </label>
    </div>
  );
}
