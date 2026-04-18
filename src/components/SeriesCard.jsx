// Karta pojedynczej serii playoffs z animacjami statusu
import { motion } from 'framer-motion'
import TeamLogo from './TeamLogo'

// Tłumaczenie statusów
const STATUS_LABELS = {
  scheduled: 'Zaplanowana',
  inProgress: 'W toku',
  completed: 'Zakończona',
  tbd: 'Do ustalenia (Play-In)',
}

const STATUS_COLORS = {
  scheduled: 'text-gray-500',
  inProgress: 'text-blue-400',
  completed: 'text-gray-400',
  tbd: 'text-yellow-500',
}

// Oblicza opis serii
function getSeriesDescription(series) {
  if (series.status === 'tbd') return 'Zwycięzca Play-In do ustalenia'
  if (series.status === 'scheduled') return 'Seria nierozpoczęta'
  if (series.status === 'completed') {
    const winner = series.wins1 === 4 ? series.team1 : series.team2
    const score = series.wins1 === 4 ? `4:${series.wins2}` : `4:${series.wins1}`
    return `${winner.name} wygrali ${score}`
  }
  // W toku
  const leading = series.wins1 > series.wins2 ? series.team1 : series.wins2 > series.wins1 ? series.team2 : null
  if (!leading) return `Remis ${series.wins1}:${series.wins2}`
  const maxWins = Math.max(series.wins1, series.wins2)
  const minWins = Math.min(series.wins1, series.wins2)
  return `${leading.name} prowadzą ${maxWins}:${minWins}`
}

export default function SeriesCard({ series, playerPicks = {}, compact = false }) {
  if (!series) return null

  const { team1, team2, wins1, wins2, status } = series

  // Informacje o typach gracza
  const getPickFeedback = (pick) => {
    if (!pick || status === 'scheduled' || status === 'inProgress') return null
    const actualWinner = wins1 === 4 ? team1.abbr : team2.abbr
    const actualScore = wins1 === 4 ? `4:${wins2}` : `4:${wins1}`
    if (pick.winner === actualWinner && pick.score === actualScore) return 'perfect'
    if (pick.winner === actualWinner) return 'correct'
    return 'wrong'
  }

  const feedbackClasses = {
    perfect: 'pick-perfect',
    correct: 'pick-correct',
    wrong: 'pick-wrong',
  }

  const feedbackLabels = {
    perfect: '✓ Ideał! +2 pkt',
    correct: '~ Drużyna! +1 pkt',
    wrong: '✗ Pudło',
  }

  // Renderuj karty dla wszystkich graczy
  const playerEntries = Object.entries(playerPicks)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`series-card p-3 ${
        status === 'inProgress' ? 'status-in-progress' :
        status === 'completed' ? 'status-completed' : ''
      } ${compact ? '' : ''}`}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
          {status === 'inProgress' && (
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          )}
          {STATUS_LABELS[status] || status}
        </div>
        {status === 'inProgress' && (
          <span className="text-xs font-display text-blue-400 tracking-wider">
            {wins1}–{wins2}
          </span>
        )}
      </div>

      {/* Drużyny */}
      <div className="flex items-center gap-3">
        {/* Team 1 */}
        <div className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${
          status === 'completed' && wins1 === 4 ? 'bg-nba-gold/5 ring-1 ring-nba-gold/30' : ''
        }`}>
          <TeamLogo abbr={team1?.abbr} teamId={team1?.teamId} size={compact ? 36 : 44} />
          <div className="text-center">
            <div className={`font-display tracking-wider text-sm ${
              status === 'completed' && wins1 === 4 ? 'text-nba-gold' : 'text-white'
            }`}>
              {team1?.abbr}
            </div>
            <div className="text-gray-600 text-xs font-light">#{team1?.seed}</div>
          </div>
          {status !== 'scheduled' && (
            <div className={`font-display text-xl ${wins1 === 4 ? 'text-nba-gold' : 'text-gray-400'}`}>
              {wins1}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-gray-700 text-xs font-display tracking-widest">VS</span>
          {status === 'completed' && (
            <div className="text-xs text-gray-600 font-display">
              {wins1}:{wins2}
            </div>
          )}
        </div>

        {/* Team 2 */}
        <div className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${
          status === 'completed' && wins2 === 4 ? 'bg-nba-gold/5 ring-1 ring-nba-gold/30' : ''
        }`}>
          <TeamLogo abbr={team2?.abbr} teamId={team2?.teamId} size={compact ? 36 : 44} />
          <div className="text-center">
            <div className={`font-display tracking-wider text-sm ${
              status === 'completed' && wins2 === 4 ? 'text-nba-gold' : 'text-white'
            }`}>
              {team2?.abbr}
            </div>
            <div className="text-gray-600 text-xs font-light">#{team2?.seed}</div>
          </div>
          {status !== 'scheduled' && (
            <div className={`font-display text-xl ${wins2 === 4 ? 'text-nba-gold' : 'text-gray-400'}`}>
              {wins2}
            </div>
          )}
        </div>
      </div>

      {/* Opis serii */}
      {!compact && (
        <div className="mt-2 text-center text-xs text-gray-600">
          {getSeriesDescription(series)}
        </div>
      )}

      {/* Typy graczy */}
      {playerEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-nba-border space-y-1.5">
          {playerEntries.map(([playerId, pickData]) => {
            if (!pickData) return (
              <div key={playerId} className="flex items-center justify-between text-xs text-gray-600">
                <span className="capitalize">{playerId}</span>
                <span className="italic">brak typów</span>
              </div>
            )

            const feedback = getPickFeedback(pickData)
            const isHidden = pickData?.hidden

            return (
              <div
                key={playerId}
                className={`flex items-center justify-between text-xs rounded-lg px-2 py-1.5 ${
                  feedback ? `${feedbackClasses[feedback]} border` : 'bg-nba-dark/50'
                }`}
              >
                <span className="text-gray-400 capitalize font-medium">{playerId}</span>
                {isHidden ? (
                  <span className="text-gray-600 italic">🔒 ukryte</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-display tracking-wider text-white">
                      {pickData.winner} {pickData.score}
                    </span>
                    {feedback && (
                      <span className={`text-xs ${
                        feedback === 'perfect' ? 'text-green-400' :
                        feedback === 'correct' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {feedbackLabels[feedback]}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
