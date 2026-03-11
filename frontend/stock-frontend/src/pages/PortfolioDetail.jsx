// src/pages/PortfolioDetail.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import "./PortfolioDetail.css";

function PortfolioDetail() {
  const { portfolioId } = useParams();
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState(null);
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    if (!portfolioId) return;

    api.get(`portfolio/${portfolioId}/`)
      .then((res) => {
        setPortfolio(res.data);
        setStocks(res.data.stocks || []);
      })
      .catch((err) => console.log(err));

  }, [portfolioId]);

  if (!portfolio) return <div className="loading-container"><div className="spinner"></div><p>Loading your portfolio...</p></div>;

  // Calculate portfolio metrics
  const calculateMetrics = () => {
    let totalValue = 0;
    let totalInvested = 0;

    stocks.forEach((stock) => {
      const shares = stock.quantity || 0;
      const currentPrice = parseFloat(stock.current_price) || 0;
      const buyPrice = parseFloat(stock.buy_price) || currentPrice;
      
      totalValue += shares * currentPrice;
      totalInvested += shares * buyPrice;
    });

    const totalGain = totalValue - totalInvested;
    const gainPercentage = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(2) : 0;

    return { totalValue: totalValue.toFixed(2), totalGain: totalGain.toFixed(2), gainPercentage, totalInvested: totalInvested.toFixed(2) };
  };

  const metrics = calculateMetrics();
  const isPositive = parseFloat(metrics.totalGain) >= 0;

  // Chart data for PE Ratio
  const peChartData = {
    labels: stocks.map((stock) => stock.ticker || stock.company_name),
    datasets: [
      {
        label: "PE Ratio",
        data: stocks.map((stock) => stock.pe_ratio || 0),
        backgroundColor: stocks.map((stock) => `hsl(${Math.random() * 360}, 70%, 60%)`),
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  // Chart data for stock allocation (Doughnut)
  const allocationData = {
    labels: stocks.map((stock) => stock.ticker || stock.company_name),
    datasets: [
      {
        data: stocks.map((stock) => {
          const shares = stock.quantity || 0;
          const currentPrice = parseFloat(stock.current_price) || 0;
          return shares * currentPrice;
        }),
        backgroundColor: [
          "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
          "#6C5CE7", "#A29BFE", "#FD79A8", "#FDCB6E", "#6C7A89"
        ],
        borderColor: "#fff",
        borderWidth: 3,
      },
    ],
  };

  // Sort stocks by value
  const sortedStocks = [...stocks].sort((a, b) => {
    const valueA = (a.quantity || 0) * (parseFloat(a.current_price) || 0);
    const valueB = (b.quantity || 0) * (parseFloat(b.current_price) || 0);
    return valueB - valueA;
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div className="portfolio-container">
      {/* Header with Portfolio Name */}
      <div className="portfolio-header">
        <div>
          <h1 className="portfolio-title">{portfolio.name}</h1>
          <p className="portfolio-subtitle">Your investment dashboard</p>
        </div>
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="metrics-grid">
        <div className="metric-card total-value">
          <div className="metric-label">Portfolio Value</div>
          <div className="metric-value">${metrics.totalValue}</div>
          <div className="metric-detail">Invested: ${metrics.totalInvested}</div>
        </div>

        <div className={`metric-card gain-loss ${isPositive ? 'positive' : 'negative'}`}>
          <div className="metric-label">Total Gain/Loss</div>
          <div className="metric-value">
            {isPositive ? '↑' : '↓'} ${Math.abs(metrics.totalGain)}
          </div>
          <div className="metric-detail">{isPositive ? '+' : '-'}{Math.abs(metrics.gainPercentage)}%</div>
        </div>

        <div className="metric-card holdings">
          <div className="metric-label">Holdings</div>
          <div className="metric-value">{stocks.length}</div>
          <div className="metric-detail">Active stocks</div>
        </div>

        <div className="metric-card avg-return">
          <div className="metric-label">Avg Return</div>
          <div className="metric-value">{(parseFloat(metrics.gainPercentage) / stocks.length).toFixed(2)}%</div>
          <div className="metric-detail">Per stock</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>PE Ratio Comparison</h3>
          <div className="chart-container">
            <Bar data={peChartData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Portfolio Allocation</h3>
          <div className="chart-container doughnut-container">
            <Doughnut data={allocationData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Stock Holdings List */}
      <div className="holdings-section">
        <div className="section-header">
          <h2>Your Holdings</h2>
          <span className="stock-count">{stocks.length} stocks</span>
        </div>

        <div className="stock-list">
          {sortedStocks.map((stock, index) => {
            const shares = stock.quantity || 0;
            const currentPrice = parseFloat(stock.current_price) || 0;
            const buyPrice = parseFloat(stock.buy_price) || currentPrice;
            const stockValue = shares * currentPrice;
            const gain = stockValue - (shares * buyPrice);
            const gainPercent = ((gain / (shares * buyPrice)) * 100).toFixed(2);
            const isStockPositive = gain >= 0;

            return (
              <div
                key={stock.id}
                className="stock-item"
                onClick={() => navigate(`/stock/${stock.id}`)}
              >
                <div className="stock-item-header">
                  <div className="stock-info">
                    <div className="stock-rank">{index + 1}</div>
                    <div>
                      <div className="stock-name">{stock.company_name}</div>
                      <div className="stock-ticker">{stock.ticker}</div>
                    </div>
                  </div>
                  <div className="stock-performance">
                    <div className="stock-value">${stockValue.toFixed(2)}</div>
                    <div className={`stock-change ${isStockPositive ? 'positive' : 'negative'}`}>
                      {isStockPositive ? '↑' : '↓'} ${Math.abs(gain).toFixed(2)} ({isStockPositive ? '+' : ''}{gainPercent}%)
                    </div>
                  </div>
                </div>

                <div className="stock-item-details">
                  <div className="detail-group">
                    <span className="detail-label">Shares</span>
                    <span className="detail-value">{shares}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Avg Cost</span>
                    <span className="detail-value">${buyPrice.toFixed(2)}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">Current</span>
                    <span className="detail-value">${currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="detail-group">
                    <span className="detail-label">PE Ratio</span>
                    <span className="detail-value">{stock.pe_ratio ? stock.pe_ratio.toFixed(2) : 'N/A'}</span>
                  </div>
                </div>

                <div className="stock-progress">
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${isStockPositive ? 'positive' : 'negative'}`}
                      style={{width: `${Math.min(Math.abs(gainPercent), 100)}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stocks.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No holdings yet</h3>
          <p>Start building your portfolio by adding some stocks</p>
        </div>
      )}
    </div>
  );
}

export default PortfolioDetail;