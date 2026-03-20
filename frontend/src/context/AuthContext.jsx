import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
  }, [])

  async function login(email, password) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Login failed')
      }
      const data = await res.json()
      localStorage.setItem('token', data.token)
      setUser(data.user || null)
      setIsAuthenticated(true)
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  async function register(username, email, password) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        // DRF returns field errors as {field: ["msg"]} or {detail: "msg"}
        let msg = 'Registration failed'
        if (data?.detail) {
          msg = data.detail
        } else if (data && typeof data === 'object') {
          const messages = Object.entries(data)
            .map(([field, errs]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${Array.isArray(errs) ? errs.join(' ') : errs}`)
          if (messages.length) msg = messages.join(' | ')
        }
        throw new Error(msg)
      }
      // Don't auto-login after registration — redirect to login page instead
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
    setIsAuthenticated(false)
  }

  const value = { isAuthenticated, user, loading, error, login, register, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
