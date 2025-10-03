import CandleChart from "@/components/CandleChart";
import LoginPage from "./login/page";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", padding: "20px" }}>
      <h1
        style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}
      >
        Binance Candlestick Chart + Risk Radar
      </h1>
      <CandleChart />
    </main>
  );
}
