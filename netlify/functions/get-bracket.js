// netlify/functions/get-bracket.js
// Pobiera aktualną drabinkę playoffów NBA z ESPN API
// Iteracja dzień po dniu, rozpoznawanie rund, budowanie serii

import { getStore } from "@netlify/blobs";

// Mapowanie team ID z ESPN do skrótów NBA
const ESPN_TEAM_MAP = {
  1: "ATL", 2: "BOS", 3: "NOP", 4: "CHI", 5: "CLE", 6: "DAL", 7: "DEN", 8: "DET",
  9: "GSW", 10: "HOU", 11: "IND", 12: "LAC", 13: "LAL", 14: "MIA", 15: "MIL",
  16: "MIN", 17: "BKN", 18: "NYK", 19: "ORL", 20: "PHI", 21: "PHX", 22: "POR",
  23: "SAC", 24: "SAS", 25: "OKC", 26: "TOR", 27: "UTA", 28: "MEM", 29: "WAS",
  30: "CHA"
};

const TEAM_NAMES = {
  ATL: "Atlanta Hawks", BOS: "Boston Celtics", BKN: "Brooklyn Nets", CHA: "Charlotte Hornets",
  CHI: "Chicago Bulls", CLE: "Cleveland Cavaliers", DAL: "Dallas Mavericks", DEN: "Denver Nuggets",
  DET: "Detroit Pistons", GSW: "Golden State Warriors", HOU: "Houston Rockets", IND: "Indiana Pacers",
  LAC: "LA Clippers", LAL: "Los Angeles Lakers", MIA: "Miami Heat", MIL: "Milwaukee Bucks",
  MIN: "Minnesota Timberwolves", NOP: "New Orleans Pelicans", NYK: "New York Knicks", OKC: "Oklahoma City Thunder",
  ORL: "Orlando Magic", PHI: "Philadelphia 76ers", PHX: "Phoenix Suns", POR: "Portland Trail Blazers",
  SAC: "Sacramento Kings", SAS: "San Antonio Spurs", TOR: "Toronto Raptors", UTA: "Utah Jazz", WAS: "Washington Wizards"
};

// Konferencje
const EAST_TEAMS = ["ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DET", "IND", "MIA", "MIL", "NYK", "ORL", "PHI", "TOR", "WAS"];
const WEST_TEAMS = ["DAL", "DEN", "GSW", "HOU", "LAC", "LAL", "MEM", "MIN", "NOP", "OKC", "PHX", "POR", "SAC", "SAS", "UTA"];

// Fallback bracket
const FALLBACK_BRACKET = {
  season: "2025-26",
  lastUpdated: new Date().toISOString(),
  source: "fallback",
  rounds: {
    1: {
      east: [
        { id: "e1-1", round: 1, conference: "east", seriesNumber: 1, team1: { abbr: "DET", name: "Detroit Pistons", seed: 1 }, team2: { abbr: "TBD", name: "TBD", seed: 8 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "e1-2", round: 1, conference: "east", seriesNumber: 2, team1: { abbr: "BOS", name: "Boston Celtics", seed: 2 }, team2: { abbr: "TBD", name: "TBD", seed: 7 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "e1-3", round: 1, conference: "east", seriesNumber: 3, team1: { abbr: "NYK", name: "New York Knicks", seed: 3 }, team2: { abbr: "TBD", name: "TBD", seed: 6 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "e1-4", round: 1, conference: "east", seriesNumber: 4, team1: { abbr: "CLE", name: "Cleveland Cavaliers", seed: 4 }, team2: { abbr: "TBD", name: "TBD", seed: 5 }, wins1: 0, wins2: 0, status: "scheduled" }
      ],
      west: [
        { id: "w1-1", round: 1, conference: "west", seriesNumber: 1, team1: { abbr: "OKC", name: "Oklahoma City Thunder", seed: 1 }, team2: { abbr: "TBD", name: "TBD", seed: 8 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "w1-2", round: 1, conference: "west", seriesNumber: 2, team1: { abbr: "SAS", name: "San Antonio Spurs", seed: 2 }, team2: { abbr: "TBD", name: "TBD", seed: 7 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "w1-3", round: 1, conference: "west", seriesNumber: 3, team1: { abbr: "DEN", name: "Denver Nuggets", seed: 3 }, team2: { abbr: "TBD", name: "TBD", seed: 6 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "w1-4", round: 1, conference: "west", seriesNumber: 4, team1: { abbr: "LAL", name: "Los Angeles Lakers", seed: 4 }, team2: { abbr: "TBD", name: "TBD", seed: 5 }, wins1: 0, wins2: 0, status: "scheduled" }
      ]
    },
    2: {
      east: [
        { id: "e2-1", round: 2, conference: "east", seriesNumber: 1, team1: { abbr: "TBD", name: "TBD", seed: 1 }, team2: { abbr: "TBD", name: "TBD", seed: 4 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "e2-2", round: 2, conference: "east", seriesNumber: 2, team1: { abbr: "TBD", name: "TBD", seed: 2 }, team2: { abbr: "TBD", name: "TBD", seed: 3 }, wins1: 0, wins2: 0, status: "scheduled" }
      ],
      west: [
        { id: "w2-1", round: 2, conference: "west", seriesNumber: 1, team1: { abbr: "TBD", name: "TBD", seed: 1 }, team2: { abbr: "TBD", name: "TBD", seed: 4 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "w2-2", round: 2, conference: "west", seriesNumber: 2, team1: { abbr: "TBD", name: "TBD", seed: 2 }, team2: { abbr: "TBD", name: "TBD", seed: 3 }, wins1: 0, wins2: 0, status: "scheduled" }
      ]
    },
    3: {
      east: [{ id: "e3-1", round: 3, conference: "east", seriesNumber: 1, team1: { abbr: "TBD", name: "TBD", seed: 1 }, team2: { abbr: "TBD", name: "TBD", seed: 2 }, wins1: 0, wins2: 0, status: "scheduled" }],
      west: [{ id: "w3-1", round: 3, conference: "west", seriesNumber: 1, team1: { abbr: "TBD", name: "TBD", seed: 1 }, team2: { abbr: "TBD", name: "TBD", seed: 2 }, wins1: 0, wins2: 0, status: "scheduled" }]
    },
    4: { finals: [{ id: "f4-1", round: 4, conference: "finals", seriesNumber: 1, team1: { abbr: "TBD", name: "TBD East", seed: 1 }, team2: { abbr: "TBD", name: "TBD West", seed: 1 }, wins1: 0, wins2: 0, status: "scheduled" }] }
  }
};

// Format daty YYYYMMDD
function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// Dodaj dni do daty
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Pobierz scoreboard dla konkretnej daty
async function fetchScoreboardByDate(dateStr) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}&seasontype=3`;
  console.log(`Fetching: ${url}`);
  
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`HTTP ${res.status} for ${dateStr}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`Error fetching ${dateStr}: ${err.message}`);
    return null;
  }
}

// Parsuj event ze scoreboardu
function parseScoreboardEvent(event) {
  if (!event?.competitions?.[0]) return null;
  
  const comp = event.competitions[0];
  const teams = comp.competitors || [];
  if (teams.length < 2) return null;

  const team1 = teams[0];
  const team2 = teams[1];
  
  const t1Abbr = ESPN_TEAM_MAP[team1.team?.id] || team1.team?.abbreviation || "TBD";
  const t2Abbr = ESPN_TEAM_MAP[team2.team?.id] || team2.team?.abbreviation || "TBD";

  // Określ konferencję
  let conference = "east";
  if (WEST_TEAMS.includes(t1Abbr) || WEST_TEAMS.includes(t2Abbr)) {
    conference = "west";
  }

  // Określ rundę na podstawie nazwy/typu
  let round = 1;
  let roundName = "First Round";
  let isPlayIn = false;
  
  const name = (event.name || "").toLowerCase();
  const shortName = (event.shortName || "").toLowerCase();
  
  if (name.includes("play-in") || shortName.includes("play-in")) {
    isPlayIn = true;
    roundName = "Play-In";
    round = 0; // Play-in przed Round 1
  } else if (name.includes("conference semifinal") || shortName.includes("semifinal")) {
    round = 2;
    roundName = "Conference Semifinals";
  } else if (name.includes("conference final") || shortName.includes("conf final")) {
    round = 3;
    roundName = "Conference Finals";
  } else if (name.includes("nba final") || name.includes("championship") || shortName.includes("final")) {
    round = 4;
    roundName = "NBA Finals";
    conference = "finals";
  }

  // Status meczu
  const status = event.status;
  const isCompleted = status?.type?.completed || false;
  const isLive = status?.type?.state === "in";
  const gameStatus = isCompleted ? "final" : isLive ? "live" : "scheduled";

  return {
    eventId: event.id,
    date: event.date,
    name: event.name,
    shortName: event.shortName,
    round,
    roundName,
    isPlayIn,
    conference,
    status: gameStatus,
    period: status?.period,
    clock: status?.displayClock,
    completed: isCompleted,
    team1: {
      abbr: t1Abbr,
      name: TEAM_NAMES[t1Abbr] || team1.team?.displayName || "TBD",
      id: team1.team?.id,
      seed: team1.seed || 0,
      score: parseInt(team1.score || 0),
      winner: team1.winner || false,
      homeAway: team1.homeAway
    },
    team2: {
      abbr: t2Abbr,
      name: TEAM_NAMES[t2Abbr] || team2.team?.displayName || "TBD",
      id: team2.team?.id,
      seed: team2.seed || 0,
      score: parseInt(team2.score || 0),
      winner: team2.winner || false,
      homeAway: team2.homeAway
    }
  };
}

// Zbuduj serie z listy meczów
function buildSeries(games) {
  // Grupuj mecze po parze drużyn (niezależnie od kolejności)
  const seriesMap = new Map();
  
  for (const game of games) {
    if (game.isPlayIn) continue; // Pomiń play-iny przy budowaniu serii playoff
    
    const key = [game.team1.abbr, game.team2.abbr].sort().join("-");
    
    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        team1: game.team1,
        team2: game.team2,
        conference: game.conference,
        round: game.round,
        games: [],
        wins1: 0,
        wins2: 0
      });
    }
    
    const series = seriesMap.get(key);
    series.games.push(game);
    
    // Zliczaj zwycięstwa
    if (game.completed) {
      if (game.team1.winner) series.wins1++;
      else if (game.team2.winner) series.wins2++;
    }
  }
  
  // Konwertuj na tablicę i sortuj
  return Array.from(seriesMap.values()).map(series => {
    // Sortuj mecze po dacie
    series.games.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Określ status serii
    const isComplete = series.wins1 >= 4 || series.wins2 >= 4;
    const isInProgress = (series.wins1 > 0 || series.wins2 > 0) && !isComplete;
    
    return {
      ...series,
      status: isComplete ? "completed" : isInProgress ? "inProgress" : "scheduled",
      gamesPlayed: series.games.length,
      lastGame: series.games[series.games.length - 1]
    };
  });
}

// Główna funkcja handler
export default async function handler(req, context) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS"
      }
    });
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    // Sprawdź cache
    let store;
    try {
      store = getStore("bracket-cache");
      const cached = await store.get("bracket", { type: "json" });
      if (cached) {
        const age = Date.now() - new Date(cached.cachedAt).getTime();
        if (age < 5 * 60 * 1000) {
          return new Response(JSON.stringify(cached.data), { status: 200, headers });
        }
      }
    } catch (blobErr) {
      console.warn("Błąd odczytu cache:", blobErr.message);
    }

    // Playoffs start: 19 kwietnia 2026
    const playoffStart = new Date("2026-04-19");
    const today = new Date();
    const endDate = addDays(today, 1); // Do jutra (przyszłe mecze mogą być zaplanowane)

    // Iteruj dzień po dniu
    const allGames = [];
    const seenEventIds = new Set();
    
    for (let d = new Date(playoffStart); d <= endDate; d = addDays(d, 1)) {
      const dateStr = formatDate(d);
      const data = await fetchScoreboardByDate(dateStr);
      
      if (data?.events) {
        for (const event of data.events) {
          // Deduplikacja
          if (seenEventIds.has(event.id)) continue;
          seenEventIds.add(event.id);
          
          const parsed = parseScoreboardEvent(event);
          if (parsed) {
            allGames.push(parsed);
          }
        }
      }
    }

    console.log(`Pobrano ${allGames.length} unikalnych meczów`);

    // Zbuduj serie
    const series = buildSeries(allGames);
    console.log(`Zbudowano ${series.length} serii playoffowych`);

    // Zbuduj strukturę bracketu
    let bracketData;
    
    if (allGames.length > 0) {
      // Zacznij od fallbacka
      bracketData = {
        season: "2025-26",
        lastUpdated: new Date().toISOString(),
        source: "espn-api",
        rounds: JSON.parse(JSON.stringify(FALLBACK_BRACKET.rounds)),
        games: allGames,
        series: series
      };

      // Znajdź mecze Round 1 (nie play-in) i uzupełnij fallback
      const round1Games = allGames.filter(g => g.round === 1 && !g.isPlayIn);
      
      // Grupuj po konferencji
      const eastGames = round1Games.filter(g => g.conference === "east" || EAST_TEAMS.includes(g.team1.abbr));
      const westGames = round1Games.filter(g => g.conference === "west" || WEST_TEAMS.includes(g.team1.abbr));
      
      // Uzupełnij East Round 1 - sortuj po seedzie team1
      eastGames.sort((a, b) => a.team1.seed - b.team1.seed);
      for (let i = 0; i < Math.min(eastGames.length, 4); i++) {
        const game = eastGames[i];
        if (bracketData.rounds[1].east[i]) {
          bracketData.rounds[1].east[i].team1 = game.team1;
          bracketData.rounds[1].east[i].team2 = game.team2;
          bracketData.rounds[1].east[i].status = game.status;
        }
      }
      
      // Uzupełnij West Round 1 - sortuj po seedzie team1
      westGames.sort((a, b) => a.team1.seed - b.team1.seed);
      for (let i = 0; i < Math.min(westGames.length, 4); i++) {
        const game = westGames[i];
        if (bracketData.rounds[1].west[i]) {
          bracketData.rounds[1].west[i].team1 = game.team1;
          bracketData.rounds[1].west[i].team2 = game.team2;
          bracketData.rounds[1].west[i].status = game.status;
        }
      }

      // Uzupełnij wyniki serii dla Round 1
      for (const s of series.filter(s => s.round === 1)) {
        const conf = s.conference;
        const slots = bracketData.rounds[1][conf];
        if (slots) {
          // Znajdź slot po parze drużyn (sprawdź obie kolejności)
          for (const slot of slots) {
            if ((slot.team1.abbr === s.team1.abbr && slot.team2.abbr === s.team2.abbr) ||
                (slot.team1.abbr === s.team2.abbr && slot.team2.abbr === s.team1.abbr)) {
              slot.wins1 = s.wins1;
              slot.wins2 = s.wins2;
              slot.status = s.status;
              break;
            }
          }
        }
      }

      // Mapuj wyższe rundy (2, 3, 4) jeśli są dostępne
      for (const s of series.filter(s => s.round > 1)) {
        const round = s.round;
        const conf = s.conference;
        
        if (round === 4 && bracketData.rounds[4]?.finals?.[0]) {
          Object.assign(bracketData.rounds[4].finals[0], {
            team1: s.team1,
            team2: s.team2,
            wins1: s.wins1,
            wins2: s.wins2,
            status: s.status
          });
        } else if (bracketData.rounds[round]?.[conf]) {
          const slots = bracketData.rounds[round][conf];
          for (let i = 0; i < slots.length; i++) {
            if (slots[i].team1.abbr === "TBD" || slots[i].team2.abbr === "TBD") {
              Object.assign(slots[i], {
                team1: s.team1,
                team2: s.team2,
                wins1: s.wins1,
                wins2: s.wins2,
                status: s.status
              });
              break;
            }
          }
        }
      }
    } else {
      // Brak danych - fallback
      bracketData = {
        ...FALLBACK_BRACKET,
        source: "fallback",
        apiError: "Brak meczów playoffowych w ESPN API",
        games: [],
        series: []
      };
    }

    // Zapisz do cache
    if (store) {
      try {
        await store.setJSON("bracket", { data: bracketData, cachedAt: new Date().toISOString() });
      } catch (blobErr) {
        console.warn("Błąd zapisu cache:", blobErr.message);
      }
    }

    return new Response(JSON.stringify(bracketData), { status: 200, headers });

  } catch (err) {
    console.error("Krytyczny błąd get-bracket:", err);
    return new Response(
      JSON.stringify({ 
        ...FALLBACK_BRACKET, 
        source: "fallback", 
        error: err.message,
        games: [],
        series: []
      }),
      { status: 200, headers }
    );
  }
}

export const config = { path: "/api/get-bracket" };
