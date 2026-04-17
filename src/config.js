// ============================================================
// KONFIGURACJA APLIKACJI – EDYTUJ TUTAJ NAZWY GRACZY
// ============================================================

export const CONFIG = {
  players: [
    { id: "mateusz", name: "Mateusz", avatar: "???" },
    { id: "filip", name: "Filip", avatar: "???" }
  ],
  season: "2025-26",
  nbaSeasonYear: "2025",
  // Odświeżaj dane co N milisekund (domyślnie 5 minut)
  refreshInterval: 5 * 60 * 1000,
};

// Identyfikatory drużyn NBA (do pobierania logotypów)
export const NBA_TEAM_IDS = {
  "ATL": 1610612737, // Atlanta Hawks
  "BOS": 1610612738, // Boston Celtics
  "BKN": 1610612751, // Brooklyn Nets
  "CHA": 1610612766, // Charlotte Hornets
  "CHI": 1610612741, // Chicago Bulls
  "CLE": 1610612739, // Cleveland Cavaliers
  "DAL": 1610612742, // Dallas Mavericks
  "DEN": 1610612743, // Denver Nuggets
  "DET": 1610612765, // Detroit Pistons
  "GSW": 1610612744, // Golden State Warriors
  "HOU": 1610612745, // Houston Rockets
  "IND": 1610612754, // Indiana Pacers
  "LAC": 1610612746, // LA Clippers
  "LAL": 1610612747, // Los Angeles Lakers
  "MEM": 1610612763, // Memphis Grizzlies
  "MIA": 1610612748, // Miami Heat
  "MIL": 1610612749, // Milwaukee Bucks
  "MIN": 1610612750, // Minnesota Timberwolves
  "NOP": 1610612740, // New Orleans Pelicans
  "NYK": 1610612752, // New York Knicks
  "OKC": 1610612760, // Oklahoma City Thunder
  "ORL": 1610612753, // Orlando Magic
  "PHI": 1610612755, // Philadelphia 76ers
  "PHX": 1610612756, // Phoenix Suns
  "POR": 1610612757, // Portland Trail Blazers
  "SAC": 1610612758, // Sacramento Kings
  "SAS": 1610612759, // San Antonio Spurs
  "TOR": 1610612761, // Toronto Raptors
  "UTA": 1610612762, // Utah Jazz
  "WAS": 1610612764, // Washington Wizards
};

// Polskie nazwy rund
export const ROUND_NAMES = {
  1: "I Runda",
  2: "Półfinały Konferencji",
  3: "Finały Konferencji",
  4: "Finał NBA",
};
