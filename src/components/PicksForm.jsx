// Formularz do wprowadzania typów gracza
// Obsługuje blokowanie typów gdy seria się zaczęła
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TeamLogo from './TeamLogo'
import { CONFIG, ROUND_NAMES } from '../config'

const VALID_SCORES = ['4:0', '4:1', '4:2', '4:3']

// Komponent pojedynczej serii w formularzu
function SeriesPickRow({ series, pick, onChange, locked }) {
  const { team1, team2 } = series
  const isLocked = locked || series.status === 'inProgress' || series.status === 'completed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border transition-all ${
        isLocked
          ? 'border-nba-border/50 bg-nba-dark/50 opacity-75'
          : 'border-nba-border bg-nba-card hover:border-nba-border'
      }`}
    >
      {/* Nagłówek serii */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          #{team1?.seed} vs #{team2?.seed}
        </div>
        {isLocked && (
          <span className="text-xs text-orange-400/80 flex items-center gap-1">
            🔒 Zablokowana
          </span>
        )}
        {series.status === 'scheduled' && !isLocked && (
          <span className="text-xs text-gray-600">Zaplanowana</span>
        )}
      </div>

      {/* Wybór drużyny */}
      <div className="flex gap-2 mb-3">
        {[team1, team2].map((team, idx) => {
          if (!team) return null
          const isSelected = pick?.winner === team.abbr
          return (
            <button
              key={team.abbr}
              onClick={() => !isLocked && onChange({ ...pick, winner: team.abbr })}
              disabled={isLocked}
              className={`team-pick-btn flex-1 flex flex-col items-center gap-2 p-3 rounded-xl ${
                isSelected ? 'selected' : 'bg-nba-dark/60'
              } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <TeamLogo abbr={team.abbr} teamId={team.teamId} size={40} />
              <div className="text-center">
                <div className={`font-display tracking-wider text-sm ${isSelected ? 'text-nba-gold' : 'text-white'}`}>
                  {team.abbr}
                </div>
                <div className="text-xs text-gray-600 font-light hidden sm:block">
                  {team.name}
                </div>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-4 h-4 rounded-full bg-nba-gold flex items-center justify-center"
                >
                  <svg className="w-2.5 h-2.5 text-nba-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </button>
          )
        })}
      </div>

      {/* Wybór wyniku */}
      <div>
        <div className="text-xs text-gray-600 mb-2">Wynik serii:</div>
        <div className="flex gap-1.5">
          {VALID_SCORES.map(score => {
            const isSelected = pick?.score === score
            return (
              <button
                key={score}
                onClick={() => !isLocked && onChange({ ...pick, score })}
                disabled={isLocked}
                className={`score-btn flex-1 py-2 rounded-lg text-sm border ${
                  isSelected
                    ? 'bg-nba-gold text-nba-navy border-nba-gold font-bold'
                    : 'border-nba-border text-gray-400 hover:border-nba-gold/30'
                } ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                {score}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// GŁÓWNY KOMPONENT FORMULARZA
// ============================================================
export default function PicksForm({ player }) {
  const navigate = useNavigate()
  const [bracket, setBracket] = useState(null)
  const [currentPicks, setCurrentPicks] = useState({}) // { seriesId: { winner, score } }
  const [activeRound, setActiveRound] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState(null) // { type: 'success'|'error', text }
  const [otherPlayerPicks, setOtherPlayerPicks] = useState(null)

  const otherPlayer = CONFIG.players.find(p => p.id !== player.id)

  // Załaduj drabinkę i istniejące typy
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [bracketRes, myPicksRes, otherPicksRes] = await Promise.all([
        fetch('/api/get-bracket'),
        fetch(`/api/get-picks?player=${player.id}`),
        otherPlayer ? fetch(
          `/api/get-picks?player=${otherPlayer.id}&viewAs=${player.id}&round=${activeRound}`
        ) : Promise.resolve(null)
      ])

      if (bracketRes.ok) {
        const data = await bracketRes.json()
        setBracket(data)

        // Ustal aktywną rundę (pierwsza z nieblokowanymi seriami)
        for (let r = 1; r <= 4; r++) {
          const series = [
            ...(data.rounds?.[r]?.east ?? []),
            ...(data.rounds?.[r]?.west ?? []),
            ...(data.rounds?.[r]?.finals ?? [])
          ]
          if (series.length > 0) {
            setActiveRound(r)
            break
          }
        }
      }

      if (myPicksRes.ok) {
        const data = await myPicksRes.json()
        if (data.picks?.rounds) {
          const flatPicks = {}
          Object.values(data.picks.rounds).forEach(roundPicks => {
            Object.entries(roundPicks).forEach(([seriesId, pick]) => {
              flatPicks[seriesId] = pick
            })
          })
          setCurrentPicks(flatPicks)
        }
      }

      if (otherPicksRes?.ok) {
        const data = await otherPicksRes.json()
        setOtherPlayerPicks(data)
      }
    } catch (err) {
      console.error('Błąd ładowania danych:', err)
    } finally {
      setLoading(false)
    }
  }, [player.id, otherPlayer?.id, activeRound])

  useEffect(() => {
    loadData()
  }, [player.id])

  // Zmień typ dla serii
  const handlePickChange = (seriesId, pick) => {
    setCurrentPicks(prev => ({ ...prev, [seriesId]: pick }))
  }

  // Zapisz typy
  const handleSave = async () => {
    if (!bracket) return

    const roundData = bracket.rounds?.[activeRound]
    const seriesInRound = [
      ...(roundData?.east ?? []),
      ...(roundData?.west ?? []),
      ...(roundData?.finals ?? [])
    ]

    // Sprawdź czy wszystkie serie mają typy
    const missingPicks = seriesInRound.filter(s =>
      s.status === 'scheduled' && (!currentPicks[s.id]?.winner || !currentPicks[s.id]?.score)
    )

    if (missingPicks.length > 0) {
      setSaveMessage({
        type: 'error',
        text: `Brak typów dla ${missingPicks.length} serii. Uzupełnij wszystkie typy przed zapisem.`
      })
      return
    }

    const picks = seriesInRound
      .filter(s => currentPicks[s.id]?.winner && currentPicks[s.id]?.score)
      .map(s => ({
        seriesId: s.id,
        winner: currentPicks[s.id].winner,
        score: currentPicks[s.id].score
      }))

    if (picks.length === 0) {
      setSaveMessage({ type: 'error', text: 'Nie ma nic do zapisania.' })
      return
    }

    setSaving(true)
    setSaveMessage(null)

    try {
      const res = await fetch('/api/save-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: player.id, round: activeRound, picks })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSaveMessage({ type: 'success', text: '✓ Typy zapisane pomyślnie!' })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage({ type: 'error', text: data.error || 'Błąd podczas zapisywania' })
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Błąd sieci. Spróbuj ponownie.' })
    } finally {
      setSaving(false)
    }
  }

  // Serie dla aktywnej rundy
  const activeRoundData = bracket?.rounds?.[activeRound]
  const seriesInRound = [
    ...(activeRoundData?.east ?? []),
    ...(activeRoundData?.west ?? []),
    ...(activeRoundData?.finals ?? [])
  ]

  const hasUnlockedSeries = seriesInRound.some(s => s.status === 'scheduled')

  // Dostępne rundy (te które mają serie)
  const availableRounds = [1, 2, 3, 4].filter(r => {
    const rd = bracket?.rounds?.[r]
    return rd && ([...(rd.east ?? []), ...(rd.west ?? []), ...(rd.finals ?? [])].length > 0)
  })

  return (
    <div className="min-h-screen grid-bg">
      {/* Nagłówek */}
      <header className="border-b border-nba-border bg-nba-dark/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-500 hover:text-nba-gold transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{player.avatar}</span>
              <div>
                <div className="font-display text-2xl tracking-wider text-white">{player.name}</div>
                <div className="text-xs text-gray-500">Moje typy · NBA Playoffs {CONFIG.season}</div>
              </div>
            </div>
          </div>

          {/* Link do drugiego gracza */}
          {otherPlayer && (
            <Link
              to={`/gracz/${otherPlayer.id}`}
              className="text-xs text-gray-500 hover:text-nba-gold transition-colors flex items-center gap-1"
            >
              <span>{otherPlayer.avatar}</span>
              {otherPlayer.name}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton rounded-xl h-40" />
            ))}
          </div>
        ) : (
          <>
            {/* Selektor rundy */}
            {availableRounds.length > 1 && (
              <div className="flex gap-2 mb-6 p-1 bg-nba-card rounded-xl border border-nba-border w-fit">
                {availableRounds.map(r => (
                  <button
                    key={r}
                    onClick={() => setActiveRound(r)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeRound === r
                        ? 'bg-nba-gold text-nba-navy'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {ROUND_NAMES[r]}
                  </button>
                ))}
              </div>
            )}

            {/* Tytuł rundy */}
            <div className="mb-4">
              <h2 className="font-display text-3xl tracking-widest text-white">
                {ROUND_NAMES[activeRound]}
              </h2>
              {!hasUnlockedSeries && (
                <p className="text-sm text-orange-400/80 mt-1">
                  🔒 Wszystkie serie tej rundy już trwają lub zakończyły się. Typy są zablokowane.
                </p>
              )}
            </div>

            {/* Lista serii */}
            {seriesInRound.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <div className="text-4xl mb-3">⏳</div>
                <p>Serie tej rundy nie zostały jeszcze ogłoszone</p>
              </div>
            ) : (
              <div className="space-y-3">
                {seriesInRound.map(series => (
                  <SeriesPickRow
                    key={series.id}
                    series={series}
                    pick={currentPicks[series.id] || {}}
                    onChange={(pick) => handlePickChange(series.id, pick)}
                    locked={false}
                  />
                ))}
              </div>
            )}

            {/* Przycisk zapisywania */}
            {hasUnlockedSeries && seriesInRound.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 space-y-3"
              >
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-4 bg-nba-gold hover:bg-nba-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-nba-navy font-bold font-display text-xl tracking-widest rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-nba-gold/20"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Zapisywanie...
                    </span>
                  ) : 'Zapisz typy'}
                </button>

                {/* Komunikat zapisu */}
                <AnimatePresence>
                  {saveMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className={`p-3 rounded-xl text-sm text-center ${
                        saveMessage.type === 'success'
                          ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                          : 'bg-red-500/10 border border-red-500/30 text-red-400'
                      }`}
                    >
                      {saveMessage.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Typy drugiego gracza */}
            {otherPlayer && otherPlayerPicks && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 pt-6 border-t border-nba-border"
              >
                <h3 className="font-display text-lg tracking-widest text-gray-500 mb-3">
                  {otherPlayer.avatar} Typy gracza {otherPlayer.name}
                </h3>

                {otherPlayerPicks.hidden ? (
                  <div className="p-4 rounded-xl bg-nba-card border border-nba-border/50 text-center">
                    <div className="text-3xl mb-2">🔒</div>
                    <p className="text-sm text-gray-500">
                      {otherPlayerPicks.hasPicks
                        ? `${otherPlayer.name} już wpisał typy, ale są ukryte dopóki nie wpiszesz swoich.`
                        : `${otherPlayer.name} jeszcze nie wpisał typów.`
                      }
                    </p>
                  </div>
                ) : otherPlayerPicks.picks ? (
                  <div className="space-y-2">
                    {seriesInRound.map(series => {
                      const theirPick = otherPlayerPicks.picks?.rounds?.[activeRound]?.[series.id]
                      return (
                        <div key={series.id} className="flex items-center justify-between p-3 bg-nba-card rounded-xl border border-nba-border text-sm">
                          <span className="text-gray-500">{series.team1?.abbr} vs {series.team2?.abbr}</span>
                          {theirPick ? (
                            <span className="font-display tracking-wider text-white">
                              {theirPick.winner} {theirPick.score}
                            </span>
                          ) : (
                            <span className="text-gray-700 italic">brak</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">{otherPlayer.name} nie wpisał jeszcze typów.</p>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
