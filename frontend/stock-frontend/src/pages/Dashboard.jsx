// src/pages/Dashboard.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Dashboard.css";

function Dashboard() {
  const [portfolios, setPortfolios] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("portfolio/")
      .then((res) => setPortfolios(res.data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">My Portfolios</h1>

      <div className="portfolio-grid">
        {portfolios.map((portfolio) => (
          <div
            key={portfolio.id}
            className="portfolio-card"
            onClick={() => navigate(`/portfolio/${portfolio.id}`)}
          >
            <h2>{portfolio.name}</h2>
            <p><strong>Sector:</strong> {portfolio.sector}</p>
            <p><strong>Total Stocks:</strong> {portfolio.stock_count ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;