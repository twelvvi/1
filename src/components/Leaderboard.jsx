// Tabela wyników graczy z podziałem na rundy
import { motion } from 'framer-motion'
import { CONFIG, ROUND_NAMES } from '../config'

function SkeletonRow() {
  return <div className="skeleton rounded-xl h-20 w-full" />
}

export default function Leaderboard({ scores, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonRow />
        <SkeletonRow />
      </div>
    )
  }

  if (!scores?.leaderboard) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="text-4xl mb-3">📊</div>
        <p>Brak danych o wynikach</p>
      </div>
    )
  }

  const { leaderboard } = scores

  return (
    <div className="space-y-4">
      {/* Nagłówek */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-2xl tracking-widest text-white">Ranking</h2>
        {scores.calculatedAt && (
          <span className="text-xs text-gray-600">
            Obliczono: {new Date(scores.calculatedAt).toLocaleString('pl-PL')}
          </span>
        )}
      </div>

      {/* Karty graczy */}
      {leaderboard.map((entry, idx) => {
        const player = CONFIG.players.find(p => p.id === entry.player)
        const isLeading = idx === 0 && entry.totalPoints > 0

        return (
          <motion.div
            key={entry.player}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            className={`series-card p-5 ${isLeading ? 'gradient-border' : ''}`}
          >
            <div className="flex items-center gap-4">
              {/* Pozycja */}
              <div className={`font-display text-4xl w-10 text-center ${
                idx === 0 ? 'text-nba-gold' : 'text-gray-600'
              }`}>
                {idx === 0 && entry.totalPoints > 0 ? '🥇' : `#${entry.rank}`}
              </div>

              {/* Avatar + imię */}
              <div className="flex items-center gap-3 flex-1">
                <div className={`text-4xl ${isLeading ? 'animate-float' : ''}`}>
                  {player?.avatar || '🏀'}
                </div>
                <div>
                  <div className="font-semibold text-lg text-white">{player?.name || entry.player}</div>
                  <div className="text-xs text-gray-500">
                    {entry.hasPicks ? 'Typy wprowadzone' : 'Brak typów'}
                  </div>
                </div>
              </div>

              {/* Suma punktów */}
              <div className="text-right">
                <div className={`font-display text-5xl ${isLeading ? 'text-nba-gold' : 'text-white'}`}>
                  {entry.totalPoints}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">punktów</div>
              </div>
            </div>

            {/* Punkty per runda */}
            <div className="mt-4 pt-4 border-t border-nba-border grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(round => {
                const pts = entry.roundScores?.[round] ?? 0
                return (
                  <div key={round} className="text-center">
                    <div className={`font-display text-2xl ${pts > 0 ? 'text-nba-gold-light' : 'text-gray-700'}`}>
                      {pts}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {ROUND_NAMES[round]?.split(' ')[0]}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )
      })}

      {/* Wyjaśnienie punktacji */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-nba-card rounded-xl border border-nba-border"
      >
        <h3 className="font-display text-sm tracking-widest text-nba-gold/70 mb-3 uppercase">System punktacji</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-yellow-500/20 text-yellow-400 text-xs flex items-center justify-center font-bold">+1</span>
            Trafiona drużyna (bez względu na wynik)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-green-500/20 text-green-400 text-xs flex items-center justify-center font-bold">+2</span>
            Ideał: drużyna + dokładny wynik serii
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-600">
          Możliwe wyniki serii: 4:0, 4:1, 4:2, 4:3
        </div>
      </motion.div>
    </div>
  )
}
