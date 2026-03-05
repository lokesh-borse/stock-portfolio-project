// src/pages/StockDetail.jsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "./StockDetail.css";

function StockDetail() {
  const { stockId } = useParams();

  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!stockId) return;

    setLoading(true);

    api.get(`eda/stock/${stockId}/`)
      .then((res) => {
        setStock(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setError("Failed to load stock data.");
        setLoading(false);
      });

  }, [stockId]);

  if (loading) return <h2>Loading...</h2>;
  if (error) return <h2>{error}</h2>;
  if (!stock) return <h2>No Data Available</h2>;

  // =========================
  // 📈 PRICE CHART
  // =========================
  const chartData =
    stock.price_history && stock.dates
      ? {
          labels: stock.dates,
          datasets: [
            {
              label: "1 Year Price",
              data: stock.price_history,
              borderColor: "#2962ff",
              borderWidth: 2,
              tension: 0.3,
              fill: false,
            },
          ],
        }
      : null;

  // =========================
  // 🧠 OPPORTUNITY SCORE LOGIC
  // =========================

  let score = 50; // neutral default

  const lowFactor = Math.max(0, 100 - stock.percent_from_low);
  const highFactor = Math.max(0, -stock.percent_from_high * 2);

  let peFactor = 50;
  if (stock.pe_ratio) {
    peFactor = stock.pe_ratio < 20 ? 80 :
               stock.pe_ratio < 30 ? 60 :
               30;
  }

  score = Math.round(
    (lowFactor * 0.4) +
    (highFactor * 0.3) +
    (peFactor * 0.3)
  );

  score = Math.min(100, Math.max(0, score));

  // =========================
  // 🎯 SCORE LABEL
  // =========================

  let scoreLabel = "Neutral";

  if (score >= 75) scoreLabel = "High Opportunity";
  else if (score >= 55) scoreLabel = "Moderate Opportunity";
  else if (score >= 40) scoreLabel = "Watch Zone";
  else scoreLabel = "Low Opportunity";

  return (
    <div className="stock-container">

      {/* HEADER */}
      <div className="stock-header">
        <h1>{stock.ticker}</h1>
        <h2>₹ {stock.current_price}</h2>
      </div>

      {/* 🎯 OPPORTUNITY SCORE CARD */}
      <div className="card">
        <h3>Opportunity Score</h3>
        <h2>{score} / 100</h2>

        <div className="score-bar">
          <div
            className="score-fill"
            style={{ width: `${score}%` }}
          ></div>
        </div>

        <p><strong>Status:</strong> {scoreLabel}</p>
      </div>

      {/* 52W RANGE */}
      <div className="card">
        <h3>52 Week Range</h3>
        <div className="range-bar">
          <div
            className="range-progress"
            style={{
              width: `${(
                (stock.current_price - stock.low_52w) /
                (stock.high_52w - stock.low_52w)
              ) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      {/* METRICS */}
      <div className="metrics-grid">
        <div className="card">
          <h4>PE Ratio</h4>
          <p>{stock.pe_ratio ?? "N/A"}</p>
        </div>

        <div className="card">
          <h4>Market Cap</h4>
          <p>
            {stock.market_cap
              ? `₹ ${(stock.market_cap / 1e9).toFixed(2)} B`
              : "N/A"}
          </p>
        </div>

        <div className="card">
          <h4>% From Low</h4>
          <p>{stock.percent_from_low}%</p>
        </div>

        <div className="card">
          <h4>% From High</h4>
          <p>{stock.percent_from_high}%</p>
        </div>
      </div>

      {/* PRICE CHART */}
      <div className="card chart-card">
        <h3>1 Year Price Chart</h3>
        {chartData && <Line data={chartData} />}
      </div>

    </div>
  );
}

export default StockDetail;