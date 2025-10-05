import CandleChart from "../components/CandleChart/index";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", padding: "20px" }}>
      <h1
        style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}
      >
        Binance Chart Tool
      </h1>
      <CandleChart />
    </main>
  );
}
