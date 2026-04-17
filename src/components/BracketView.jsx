// Wizualizacja całej drabinki playoffów NBA
// Układ: Wschód (lewo) | Finał (środek) | Zachód (prawo)
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import SeriesCard from './SeriesCard'
import { CONFIG, ROUND_NAMES } from '../config'

// Skeleton loading
function SkeletonCard() {
  return (
    <div className="skeleton rounded-xl h-36 w-full" />
  )
}

// Kolumna rundy
function RoundColumn({ title, series, scores, side, roundNum }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-center font-display text-xs tracking-[0.3em] text-nba-gold/60 uppercase mb-1">
        {title}
      </h3>
      {series.map((s, i) => (
        <motion.div
          key={s.id || i}
          initial={{ opacity: 0, x: side === 'west' ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
        >
          <SeriesCard
            series={s}
            playerPicks={getPicksForSeries(s.id, scores)}
            compact
          />
        </motion.div>
      ))}
    </div>
  )
}

// Pobiera typy obu graczy dla danej serii
function getPicksForSeries(seriesId, scores) {
  if (!scores?.scores) return {}
  const picks = {}
  for (const player of CONFIG.players) {
    const seriesResult = scores.scores[player.id]?.seriesResults?.[seriesId]
    if (seriesResult) {
      picks[player.id] = seriesResult.pick
    }
  }
  return picks
}

export default function BracketView({ bracket, scores, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!bracket) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-5xl mb-4">🏀</div>
        <p>Nie udało się załadować drabinki</p>
      </div>
    )
  }

  const r = bracket.rounds

  // Zbierz serie z poszczególnych rund
  const eastR1 = r[1]?.east ?? []
  const eastR2 = r[2]?.east ?? []
  const eastR3 = r[3]?.east ?? []
  const westR1 = r[1]?.west ?? []
  const westR2 = r[2]?.west ?? []
  const westR3 = r[3]?.west ?? []
  const finals = r[4]?.finals ?? []

  const hasFinals = finals.length > 0
  const hasEastFinals = eastR3.length > 0
  const hasWestFinals = westR3.length > 0
  const hasSemis = eastR2.length > 0 || westR2.length > 0

  return (
    <div>
      {/* Źródło danych */}
      {bracket.source === 'fallback' && (
        <div className="mb-4 flex items-center gap-2 text-xs text-yellow-500/80 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-2.5">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Wyświetlane są przykładowe dane zastępcze. NBA API chwilowo niedostępne.
        </div>
      )}

      {/* Desktop: pełna drabinka pozioma */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-7 gap-2 items-start">

          {/* WSCHÓD – R1 */}
          <div className="col-span-1">
            <RoundColumn title="1. Runda" series={eastR1} scores={scores} side="east" roundNum={1} />
          </div>

          {/* WSCHÓD – R2 */}
          <div className="col-span-1">
            <div className="flex flex-col gap-3 pt-[4.5rem]">
              {hasSemis && eastR2.map((s, i) => (
                <motion.div key={s.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <SeriesCard series={s} playerPicks={getPicksForSeries(s.id, scores)} compact />
                </motion.div>
              ))}
              {!hasSemis && eastR1.slice(0, 2).map((_, i) => (
                <div key={i} className="h-36 rounded-xl border border-dashed border-nba-border/40 flex items-center justify-center text-gray-700 text-xs">
                  TBD
                </div>
              ))}
            </div>
          </div>

          {/* WSCHÓD – Finały Konferencji */}
          <div className="col-span-1">
            <div className="flex flex-col gap-3 pt-[11rem]">
              {hasEastFinals ? eastR3.map((s, i) => (
                <motion.div key={s.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  <SeriesCard series={s} playerPicks={getPicksForSeries(s.id, scores)} compact />
                </motion.div>
              )) : (
                <div className="h-36 rounded-xl border border-dashed border-nba-border/40 flex items-center justify-center text-gray-700 text-xs">
                  Finał Wschodu
                </div>
              )}
            </div>
          </div>

          {/* ŚRODEK – Finał NBA */}
          <div className="col-span-1 flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-full flex flex-col items-center gap-3">
              <div className="text-center">
                <div className="font-display text-lg tracking-[0.3em] text-nba-gold uppercase mb-1">Finał NBA</div>
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-nba-gold to-transparent mx-auto" />
              </div>
              {hasFinals ? finals.map((s, i) => (
                <motion.div key={s.id || i} className="w-full" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }}>
                  <SeriesCard series={s} playerPicks={getPicksForSeries(s.id, scores)} />
                </motion.div>
              )) : (
                <div className="w-full h-44 rounded-xl border border-dashed border-nba-gold/20 flex flex-col items-center justify-center text-gray-600 text-xs gap-2">
                  <span className="text-2xl">🏆</span>
                  <span>Finał NBA</span>
                </div>
              )}
            </div>
          </div>

          {/* ZACHÓD – Finały Konferencji */}
          <div className="col-span-1">
            <div className="flex flex-col gap-3 pt-[11rem]">
              {hasWestFinals ? westR3.map((s, i) => (
                <motion.div key={s.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  <SeriesCard series={s} playerPicks={getPicksForSeries(s.id, scores)} compact />
                </motion.div>
              )) : (
                <div className="h-36 rounded-xl border border-dashed border-nba-border/40 flex items-center justify-center text-gray-700 text-xs">
                  Finał Zachodu
                </div>
              )}
            </div>
          </div>

          {/* ZACHÓD – R2 */}
          <div className="col-span-1">
            <div className="flex flex-col gap-3 pt-[4.5rem]">
              {hasSemis && westR2.map((s, i) => (
                <motion.div key={s.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <SeriesCard series={s} playerPicks={getPicksForSeries(s.id, scores)} compact />
                </motion.div>
              ))}
              {!hasSemis && westR1.slice(0, 2).map((_, i) => (
                <div key={i} className="h-36 rounded-xl border border-dashed border-nba-border/40 flex items-center justify-center text-gray-700 text-xs">
                  TBD
                </div>
              ))}
            </div>
          </div>

          {/* ZACHÓD – R1 */}
          <div className="col-span-1">
            <RoundColumn title="1. Runda" series={westR1} scores={scores} side="west" roundNum={1} />
          </div>
        </div>

        {/* Legenda */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
            Seria w toku
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Idealny typ (+2 pkt)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            Trafiona drużyna (+1 pkt)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            Pudło (0 pkt)
          </div>
        </div>
      </div>

      {/* Mobile: widok listowy per runda */}
      <div className="lg:hidden space-y-8">
        {[1, 2, 3, 4].map(roundNum => {
          const seriesInRound = [
            ...(r[roundNum]?.east ?? []),
            ...(r[roundNum]?.west ?? []),
            ...(r[roundNum]?.finals ?? [])
          ]
          if (seriesInRound.length === 0) return null

          return (
            <div key={roundNum}>
              <h2 className="font-display text-xl tracking-widest text-nba-gold mb-4">
                {ROUND_NAMES[roundNum]}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {seriesInRound.map((s, i) => (
                  <motion.div
                    key={s.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <SeriesCard series={s} playerPicks={getPicksForSeries(s.id, scores)} />
                  </motion.div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
