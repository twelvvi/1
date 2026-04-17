// Komponent logo drużyny NBA – pobiera z CDN NBA lub pokazuje placeholder
import { useState } from 'react'
import { NBA_TEAM_IDS } from '../config'

export default function TeamLogo({ abbr, teamId, size = 40, className = '' }) {
  const [error, setError] = useState(false)

  // Pobierz ID drużyny
  const id = teamId || NBA_TEAM_IDS[abbr]

  if (!id || error) {
    // Placeholder z inicjałami
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-nba-border font-display text-nba-gold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {abbr?.slice(0, 3) || '?'}
      </div>
    )
  }

  return (
    <img
      src={`https://cdn.nba.com/logos/nba/${id}/global/L/logo.svg`}
      alt={`Logo ${abbr}`}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  )
}
