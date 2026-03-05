// src/App.js

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PortfolioDetail from "./pages/PortfolioDetail";
import StockDetail from "./pages/StockDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/portfolio/:portfolioId" element={<PortfolioDetail />} />
        <Route path="/stock/:stockId" element={<StockDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;