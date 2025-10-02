"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface RiskData {
  symbol: string;
  score: number;
  flags: Record<string, string>;
  latest: Candle;
}

export default function RiskRadar() {
  const [data, setData] = useState<RiskData | null>(null);
  const [coin, setCoin] = useState("ETHUSDT");

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  async function fetchData(symbol: string = "ETHUSDT") {
    try {
      const res = await axios.get<RiskData>(`${API_URL}/risk/${symbol}`);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching risk data", err);

      setData(null);
    }
  }

  useEffect(() => {
    fetchData(coin);
    const interval = setInterval(() => fetchData(coin), 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [coin]);

  if (!data) {
    return (
      <p style={{ color: "gray", textAlign: "center" }}>
        Loading Risk Radar...
      </p>
    );
  }

  let riskColor = "green";
  if (data.score >= 70) riskColor = "red";
  else if (data.score >= 50) riskColor = "orange";

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "20px auto",
        padding: "16px",
        border: "1px solid #ccc",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        background: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
          Risk Radar
        </h2>
        <span
          style={{
            background: riskColor,
            color: "white",
            padding: "4px 12px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          Score {data.score}
        </span>
      </div>

      <div>
        {Object.entries(data.flags ?? {}).map(([flag, desc]) => (
          <div
            key={flag}
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #eee",
              padding: "4px 0",
            }}
          >
            <span style={{ fontWeight: "bold" }}>{flag}</span>
            <span style={{ fontSize: "14px", color: "#555" }}>{desc}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: "12px", color: "#777", marginTop: "8px" }}>
        Last candle: O:{data.latest.open} H:{data.latest.high} L:
        {data.latest.low} C:{data.latest.close} Vol:{data.latest.volume}
      </div>

      <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={coin}
          onChange={(e) => setCoin(e.target.value.toUpperCase())}
          placeholder="Coin symbol"
          style={{
            flex: 1,
            padding: "6px 8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontSize: "14px",
          }}
        />
        <button
          onClick={() => fetchData(coin)}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            background: "#4f46e5",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Fetch
        </button>
      </div>
    </div>
  );
}
