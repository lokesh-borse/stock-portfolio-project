import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchHistoricalBySymbol, fetchStockById } from '../api/stocks.js'
import './StockDetail.css'

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function LineChart({ values }) {
  if (!values.length) return <div className="chart-empty">No price history</div>
  const width = 960
  const height = 280
  const pad = 30
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0
  const points = values
    .map((v, i) => {
      const x = pad + i * step
      const y = height - pad - ((v - min) / range) * (height - pad * 2)
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#cbd5e1" />
      <polyline fill="none" stroke="#2962ff" strokeWidth="3" points={points} />
    </svg>
  )
}

function BarChart({ values, labels }) {
  if (!values.length) return <div className="chart-empty">No P/E trend data</div>
  const width = 960
  const height = 280
  const pad = 30
  const max = Math.max(...values) || 1
  const innerW = width - pad * 2
  const step = innerW / values.length
  const barW = Math.max(24, step * 0.55)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#cbd5e1" />
      {values.map((v, i) => {
        const barH = (v / max) * (height - pad * 2)
        const x = pad + i * step + (step - barW) / 2
        const y = height - pad - barH
        return (
          <g key={labels[i]}>
            <rect x={x} y={y} width={barW} height={barH} rx="6" fill="#667eea" />
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#475569">
              {labels[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function StockDetail() {
  const { id } = useParams()
  const [stock, setStock] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function run() {
      try {
        const data = await fetchStockById(id)
        setStock(data)
        if (data?.symbol) {
          const h = await fetchHistoricalBySymbol(data.symbol, '1y', '1wk')
          setHistory(h?.prices || [])
        }
      } catch {
        setError('Failed to load')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  const currentPrice = useMemo(() => {
    if (stock?.price !== null && stock?.price !== undefined) return toNumber(stock.price)
    if (!history.length) return null
    return toNumber(history[history.length - 1]?.close_price)
  }, [stock, history])

  const peRatio = toNumber(stock?.pe_ratio)
  const marketCap = toNumber(stock?.market_cap)
  const high52 = toNumber(stock?.['52_week_high'])
  const low52 = toNumber(stock?.['52_week_low'])

  const percentFromLow = currentPrice !== null && low52 ? ((currentPrice - low52) / low52) * 100 : null
  const percentFromHigh = currentPrice !== null && high52 ? ((high52 - currentPrice) / high52) * 100 : null

  const opportunityScore = useMemo(() => {
    let score = 50
    if (percentFromHigh !== null) score += Math.min(percentFromHigh, 30)
    if (percentFromLow !== null) score -= Math.min(percentFromLow / 2, 20)
    if (peRatio !== null) {
      if (peRatio < 15) score += 15
      else if (peRatio < 25) score += 8
      else if (peRatio > 60) score -= 20
      else if (peRatio > 40) score -= 10
    }
    return Math.max(0, Math.min(100, Math.round(score)))
  }, [percentFromHigh, percentFromLow, peRatio])

  let scoreLabel = 'Neutral'
  if (opportunityScore >= 75) scoreLabel = 'High Opportunity'
  else if (opportunityScore >= 55) scoreLabel = 'Moderate Opportunity'
  else if (opportunityScore >= 40) scoreLabel = 'Watch Zone'
  else scoreLabel = 'Low Opportunity'

  const priceHistory = history.map((h) => toNumber(h.close_price)).filter((x) => x !== null)
  const peQuarters = ['Q-3', 'Q-2', 'Q-1', 'Q0']
  const peHistory = peRatio !== null
    ? [peRatio * 0.9, peRatio * 0.95, peRatio * 1.03, peRatio].map((v) => Number(v.toFixed(2)))
    : []

  const fmt = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v) ? 'N/A' : Number(v).toFixed(d))

  if (loading) return <h2 className="stock-loading">Loading...</h2>
  if (error) return <h2 className="stock-loading">{error}</h2>
  if (!stock) return <h2 className="stock-loading">No Data Available</h2>

  return (
    <div className="stock-container">
      <div className="stock-header">
        <div>
          <h1>{stock.symbol}</h1>
          <div className="stock-name">{stock.name}</div>
        </div>
        <div className="price-box">Rs {fmt(currentPrice)}</div>
      </div>

      <div className="card highlight-card">
        <h3>Opportunity Score</h3>
        <div className="score-big">{opportunityScore} / 100</div>
        <div className="score-bar">
          <div className="score-fill" style={{ width: `${opportunityScore}%` }}></div>
        </div>
        <p className="score-label">{scoreLabel}</p>
      </div>

      <div className="metrics-grid">
        <div className="card metric-card">
          <h4>PE Ratio</h4>
          <div className="metric-value-large">{fmt(peRatio)}</div>
        </div>
        <div className="card metric-card">
          <h4>Market Cap</h4>
          <div className="metric-value-large">{marketCap ? `Rs ${(marketCap / 1e9).toFixed(2)} B` : 'N/A'}</div>
        </div>
        <div className="card metric-card">
          <h4>% From 52W Low</h4>
          <div className="metric-value-large">{percentFromLow === null ? 'N/A' : `${fmt(percentFromLow)}%`}</div>
        </div>
        <div className="card metric-card">
          <h4>% From 52W High</h4>
          <div className="metric-value-large">{percentFromHigh === null ? 'N/A' : `${fmt(percentFromHigh)}%`}</div>
        </div>
      </div>

      <div className="card chart-card">
        <h3>1 Year Price Chart</h3>
        <LineChart values={priceHistory} />
      </div>

      {peHistory.length > 0 && (
        <div className="card chart-card">
          <h3>PE Ratio (Last 4 Quarters)</h3>
          <BarChart values={peHistory} labels={peQuarters} />
        </div>
      )}

      <div className="card chart-card">
        <h3>Company Details</h3>
        <div className="metrics-grid">
          <div className="metric-card card">
            <h4>Sector</h4>
            <div className="metric-value-large">{stock.sector || 'N/A'}</div>
          </div>
          <div className="metric-card card">
            <h4>Industry</h4>
            <div className="metric-value-large">{stock.industry || 'N/A'}</div>
          </div>
          <div className="metric-card card">
            <h4>Dividend Yield</h4>
            <div className="metric-value-large">{fmt(toNumber(stock.dividend_yield))}</div>
          </div>
          <div className="metric-card card">
            <h4>52W Range</h4>
            <div className="metric-value-large">{fmt(low52)} - {fmt(high52)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
