import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CONFIG, ROUND_NAMES } from './config'
import BracketView from './components/BracketView'
import PicksForm from './components/PicksForm'
import Leaderboard from './components/Leaderboard'

// ============================================================
// HOOK: pobieranie danych z API
// ============================================================
function useAppData() {
  const [bracket, setBracket] = useState(null)
  const [scores, setScores] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [bracketRes, scoresRes] = await Promise.all([
        fetch('/api/get-bracket'),
        fetch('/api/get-scores')
      ])

      if (bracketRes.ok) {
        const data = await bracketRes.json()
        setBracket(data)
      }

      if (scoresRes.ok) {
        const data = await scoresRes.json()
        setScores(data)
      }

      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      console.error('Błąd pobierania danych:', err)
      setError('Nie udało się pobrać danych. Sprawdź połączenie.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Polling co 5 minut
    const interval = setInterval(fetchData, CONFIG.refreshInterval)
    return () => clearInterval(interval)
  }, [fetchData])

  return { bracket, scores, loading, error, refresh: fetchData, lastRefresh }
}

// ============================================================
// STRONA GŁÓWNA
// ============================================================
function HomePage({ bracket, scores, loading, error, refresh, lastRefresh }) {
  const [activeTab, setActiveTab] = useState('bracket')

  return (
    <div className="min-h-screen grid-bg">
      {/* Nagłówek */}
      <header className="relative border-b border-nba-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-nba-blue/20 via-transparent to-nba-gold/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h1 className="font-display text-5xl md:text-7xl tracking-widest text-gold-gradient">
                NBA PLAYOFFS
              </h1>
              <p className="text-nba-gold/60 text-sm font-body font-light tracking-[0.3em] uppercase mt-1">
                Sezon {CONFIG.season} · Obstawianie Serii
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              {/* Przyciski graczy */}
              <div className="flex gap-3">
                {CONFIG.players.map(player => (
                  <Link
                    key={player.id}
                    to={`/gracz/${player.id}`}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-nba-border bg-nba-card hover:border-nba-gold/50 hover:bg-nba-gold/5 transition-all duration-200"
                  >
                    <span className="text-2xl">{player.avatar}</span>
                    <div className="text-left">
                      <div className="text-xs text-gray-500 font-light">Typy gracza</div>
                      <div className="text-white font-semibold text-sm">{player.name}</div>
                    </div>
                    <svg className="w-4 h-4 text-nba-gold/50 group-hover:text-nba-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>

              {/* Czas ostatniego odświeżenia */}
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <button
                  onClick={refresh}
                  className="flex items-center gap-1.5 hover:text-nba-gold transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Odśwież
                </button>
                {lastRefresh && (
                  <span>· {lastRefresh.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Komunikat błędu */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
              {bracket?.source === 'fallback' && (
                <span className="ml-1 text-yellow-400">(Wyświetlane dane zastępcze)</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabsy */}
        <div className="flex gap-1 mb-6 p-1 bg-nba-card rounded-xl border border-nba-border w-fit">
          {[
            { id: 'bracket', label: 'Drabinka' },
            { id: 'leaderboard', label: 'Wyniki' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-nba-gold text-nba-navy'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Zawartość tabsów */}
        <AnimatePresence mode="wait">
          {activeTab === 'bracket' && (
            <motion.div
              key="bracket"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <BracketView bracket={bracket} scores={scores} loading={loading} />
            </motion.div>
          )}
          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Leaderboard scores={scores} loading={loading} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============================================================
// STRONA GRACZA
// ============================================================
function PlayerPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const player = CONFIG.players.find(p => p.id === playerId?.toLowerCase())

  useEffect(() => {
    if (!player) navigate('/', { replace: true })
  }, [player, navigate])

  if (!player) return null

  return <PicksForm player={player} />
}

// ============================================================
// GŁÓWNA APLIKACJA Z ROUTINGIEM
// ============================================================
export default function App() {
  const appData = useAppData()

  return (
    <Routes>
      <Route path="/" element={<HomePage {...appData} />} />
      <Route path="/gracz/:playerId" element={<PlayerPage />} />
      <Route path="*" element={
        <div className="min-h-screen grid-bg flex items-center justify-center">
          <div className="text-center">
            <div className="font-display text-9xl text-nba-gold/20">404</div>
            <p className="text-gray-400 mb-6">Strona nie istnieje</p>
            <Link to="/" className="px-6 py-3 bg-nba-gold text-nba-navy rounded-xl font-bold hover:bg-nba-gold-light transition-colors">
              Wróć do głównej
            </Link>
          </div>
        </div>
      } />
    </Routes>
  )
}
