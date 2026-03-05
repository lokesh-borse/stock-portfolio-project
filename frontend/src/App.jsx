import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Portfolio from './pages/Portfolio.jsx'
import PortfolioDetail from './pages/PortfolioDetail.jsx'
import Stocks from './pages/Stocks.jsx'
import StockDetail from './pages/StockDetail.jsx'
import LiveStockDetail from './pages/LiveStockDetail.jsx'
import MetalsCorrelationPage from './pages/MetalsCorrelationPage.jsx'
import NiftyClustersPage from './pages/NiftyClustersPage.jsx'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/portfolio" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/portfolio"
          element={
            <ProtectedRoute>
              <Portfolio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portfolio/:id"
          element={
            <ProtectedRoute>
              <PortfolioDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stocks"
          element={
            <ProtectedRoute>
              <Stocks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stocks/:id"
          element={
            <ProtectedRoute>
              <StockDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stocks/live/:symbol"
          element={
            <ProtectedRoute>
              <LiveStockDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/metals"
          element={
            <ProtectedRoute>
              <MetalsCorrelationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nifty-clusters"
          element={
            <ProtectedRoute>
              <NiftyClustersPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
