import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPortfolio, createPortfolio } from '../api/stocks.js'

export default function Portfolio() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPortfolio()
      setItems(data)
    } catch (e) {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onCreate(e) {
    e.preventDefault()
    if (!name) return
    try {
      await createPortfolio({ name, description })
      setName('')
      setDescription('')
      load()
    } catch {
      setError('Create failed')
    }
  }

  return (
    <div className="mx-auto w-[96vw] max-w-[1500px] p-4 md:p-6">
      <div className="rounded-3xl border border-white/70 bg-gradient-to-r from-teal-50 via-cyan-50 to-amber-50 p-6 shadow-lg shadow-teal-900/10 mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Dashboard</div>
        <h1 className="text-4xl font-extrabold text-slate-900 mt-1">Portfolio Control Center</h1>
        <p className="text-slate-600 mt-2">Create and manage your watchlists and active investment portfolios.</p>
      </div>

      <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
        <input
          className="md:col-span-2 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="Portfolio name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="md:col-span-2 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="bg-gradient-to-r from-teal-700 to-cyan-700 text-white px-4 py-2.5 rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition">
          Create
        </button>
      </form>
      {loading && <div>Loading...</div>}
      {error && <div className="text-rose-600">{error}</div>}
      <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((p) => (
          <li key={p.id} className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm hover:shadow-md transition">
            <Link to={`/portfolio/${p.id}`} className="block">
              <div className="font-bold text-xl text-slate-900">{p.name}</div>
              <div className="text-sm text-slate-600 mb-2 mt-1">{p.description || 'No description'}</div>
              <div className="text-sm text-slate-700">Total value: {p.total_value ?? '-'}</div>
              <div className="text-sm text-teal-700 mt-3 font-semibold">Open portfolio</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
