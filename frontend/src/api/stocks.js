import api from './axios.js'

export async function fetchPortfolio() {
  const res = await api.get('portfolio/')
  return res.data
}

export async function fetchPortfolioById(portfolioId) {
  const res = await api.get(`portfolio/${portfolioId}/`)
  return res.data
}

export async function fetchPortfolioLinearRegression(portfolioId) {
  const res = await api.get(`portfolio/${portfolioId}/linear-regression/`)
  return res.data
}

export async function fetchPortfolioLogisticRegression(portfolioId) {
  const res = await api.get(`portfolio/${portfolioId}/logistic-regression/`)
  return res.data
}

export async function fetchPortfolioTimeSeriesForecast(portfolioId, symbol, horizonDays = 1, modelType = 'ARIMA') {
  const res = await api.post(
    `portfolio/${portfolioId}/time-series-forecast/`,
    {
      symbol,
      horizon_days: horizonDays,
      model_type: modelType
    },
    {
      timeout: 120000
    }
  )
  return res.data
}

export async function fetchMetalsCorrelation(period = '5y', interval = '1d') {
  const res = await api.get('eda/metals/correlation/', {
    params: { period, interval }
  })
  return res.data
}

export async function fetchNiftyClusters(period = '1y', interval = '1d') {
  const params = { period, interval }
  const res = await api.get('eda/nifty/clusters/', {
    params,
    timeout: 120000
  })
  return res.data
}

export async function createPortfolio(payload) {
  const res = await api.post('portfolio/', payload)
  return res.data
}

export async function addStockToPortfolio(portfolioId, symbol, quantity, purchase_price, purchase_date) {
  const res = await api.post(`portfolio/${portfolioId}/add-stock/`, {
    symbol,
    quantity,
    purchase_price,
    purchase_date
  })
  return res.data
}

export async function removeStockFromPortfolio(portfolioId, symbol) {
  const res = await api.post(`portfolio/${portfolioId}/remove-stock/`, { symbol })
  return res.data
}

export async function fetchStocks(portfolioId) {
  const res = await api.get('stocks/', {
    params: { portfolio_id: portfolioId }
  })
  return res.data
}

export async function searchLiveStocks(query, limit = 10) {
  const res = await api.get('stocks/live-search/', {
    params: { q: query, limit }
  })
  return res.data
}

export async function fetchLiveStockBySymbol(symbol) {
  const res = await api.get('stocks/live-detail/', {
    params: { symbol }
  })
  return res.data
}

export async function fetchStockById(id) {
  const res = await api.get(`stocks/${id}/`)
  return res.data
}

export async function fetchHistoricalBySymbol(symbol, period = '1y', interval = '1mo') {
  const res = await api.get('stocks/historical/', {
    params: { symbol, period, interval }
  })
  return res.data
}
