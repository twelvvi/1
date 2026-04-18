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

// Hardcoded seeds dla sezonu 2025-26 (po play-in, oficjalny bracket NBA)
const TEAM_SEEDS_2025_26 = {
  // East - top 4
  DET: 1, BOS: 2, NYK: 3, CLE: 4,
  // East - play-in winners: TOR(5), ATL(6), PHI(7), ORL(8)
  TOR: 5, ATL: 6, PHI: 7, ORL: 8,
  // West - top 4
  OKC: 1, SAS: 2, DEN: 3, LAL: 4,
  // West - play-in winners: HOU(5), MIN(6), POR(7), PHX(8)
  HOU: 5, MIN: 6, POR: 7, PHX: 8
};

// Fallback bracket
const FALLBACK_BRACKET = {
  season: "2025-26",
  lastUpdated: new Date().toISOString(),
  source: "fallback",
  rounds: {
    1: {
      east: [
        { id: "e1-1", round: 1, conference: "east", seriesNumber: 1, team1: { abbr: "DET", name: "Detroit Pistons", seed: 1 }, team2: { abbr: "ORL", name: "Orlando Magic", seed: 8 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "e1-2", round: 1, conference: "east", seriesNumber: 2, team1: { abbr: "BOS", name: "Boston Celtics", seed: 2 }, team2: { abbr: "PHI", name: "Philadelphia 76ers", seed: 7 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "e1-3", round: 1, conference: "east", seriesNumber: 3, team1: { abbr: "NYK", name: "New York Knicks", seed: 3 }, team2: { abbr: "ATL", name: "Atlanta Hawks", seed: 6 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "e1-4", round: 1, conference: "east", seriesNumber: 4, team1: { abbr: "CLE", name: "Cleveland Cavaliers", seed: 4 }, team2: { abbr: "TOR", name: "Toronto Raptors", seed: 5 }, wins1: 0, wins2: 0, status: "scheduled" }
      ],
      west: [
        { id: "w1-1", round: 1, conference: "west", seriesNumber: 1, team1: { abbr: "OKC", name: "Oklahoma City Thunder", seed: 1 }, team2: { abbr: "PHX", name: "Phoenix Suns", seed: 8 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "w1-2", round: 1, conference: "west", seriesNumber: 2, team1: { abbr: "SAS", name: "San Antonio Spurs", seed: 2 }, team2: { abbr: "POR", name: "Portland Trail Blazers", seed: 7 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "w1-3", round: 1, conference: "west", seriesNumber: 3, team1: { abbr: "DEN", name: "Denver Nuggets", seed: 3 }, team2: { abbr: "MIN", name: "Minnesota Timberwolves", seed: 6 }, wins1: 0, wins2: 0, status: "scheduled" },
        { id: "w1-4", round: 1, conference: "west", seriesNumber: 4, team1: { abbr: "LAL", name: "Los Angeles Lakers", seed: 4 }, team2: { abbr: "HOU", name: "Houston Rockets", seed: 5 }, wins1: 0, wins2: 0, status: "scheduled" }
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

  // Określ konferencję - obydwie drużyny muszą być z tej samej konferencji
  // (w playoffach drużyny z różnych konferencji grają tylko w Finale)
  const t1IsEast = EAST_TEAMS.includes(t1Abbr);
  const t2IsEast = EAST_TEAMS.includes(t2Abbr);
  const t1IsWest = WEST_TEAMS.includes(t1Abbr);
  const t2IsWest = WEST_TEAMS.includes(t2Abbr);
  let conference = "east";
  if (t1IsWest && t2IsWest) {
    conference = "west";
  } else if (t1IsEast && t2IsEast) {
    conference = "east";
  } else if (t1IsWest || t2IsWest) {
    // Jedna drużyna z Zachodu - to może być Finał NBA
    conference = "west";
  }

  // Określ rundę na podstawie nazwy/typu
  let round = 1;
  let roundName = "First Round";
  let isPlayIn = false;
  
  const name = (event.name || "").toLowerCase();
  const shortName = (event.shortName || "").toLowerCase();
  const notes = (event.notes?.[0]?.text || "").toLowerCase();
  
  // Debug log - zobacz surowe dane z ESPN
  console.log(`\n[ESPN] name="${event.name}" shortName="${event.shortName}" notes="${event.notes?.[0]?.text || 'none'}"`);
  console.log(`[ESPN] seasonType=${event.season?.type}, status=${event.status?.type?.name}`);
  
  // Sprawdź czy to play-in czy playoff
  const isPlayInName = name.includes("play-in") || shortName.includes("play-in") || notes.includes("play-in");
  const isFirstRound = name.toLowerCase().includes("first round") || 
                       shortName.toLowerCase().includes("1st") ||
                       notes.toLowerCase().includes("first round");
  
  console.log(`[ESPN] isPlayIn=${isPlayInName}, isFirstRound=${isFirstRound}`);
  
  if (isPlayInName) {
    isPlayIn = true;
    roundName = "Play-In";
    round = 0;
  } else if (name.includes("conference semifinal") || shortName.includes("semifinal") || notes.includes("semifinal")) {
    round = 2;
    roundName = "Conference Semifinals";
  } else if (name.includes("conference final") || shortName.includes("conf final") || notes.includes("conf final")) {
    round = 3;
    roundName = "Conference Finals";
  } else if (name.includes("nba final") || name.includes("championship") || shortName.includes("final") || notes.includes("finals")) {
    round = 4;
    roundName = "NBA Finals";
    conference = "finals";
  }

  // Status meczu
  const status = event.status;
  const isCompleted = status?.type?.completed || false;
  const isLive = status?.type?.state === "in";
  const gameStatus = isCompleted ? "final" : isLive ? "live" : "scheduled";

  // Seed - ESPN może mieć w różnych polach
  const getSeed = (team, teamAbbr) => {
    // Sprawdź różne możliwe lokalizacje seedu
    if (team.seed && team.seed > 0) return team.seed;
    if (team.curatedRank?.current && team.curatedRank.current > 0) return team.curatedRank.current;
    if (team.rank && team.rank > 0) return team.rank;
    if (team.playoffSeed && team.playoffSeed > 0) return team.playoffSeed;
    if (team.seriesSeed && team.seriesSeed > 0) return team.seriesSeed;
    
    // Sprawdź w notes meczu
    if (comp.notes) {
      for (const note of comp.notes) {
        if (note.text?.includes(teamAbbr)) {
          const match = note.text.match(/#(\d+)/);
          if (match) return parseInt(match[1]);
        }
      }
    }
    
    // Sprawdź w headline
    if (comp.headline?.includes(teamAbbr)) {
      const match = comp.headline.match(new RegExp(`${teamAbbr}.*?(\\d+)`, 'i'));
      if (match) return parseInt(match[1]);
    }
    
    // Sprawdź w nazwie drużyny
    if (team.team?.shortDisplayName?.includes("(")) {
      const match = team.team.shortDisplayName.match(/\((\d+)\)/);
      if (match) return parseInt(match[1]);
    }
    
    // Fallback: hardcoded seeds dla sezonu 2025-26
    if (TEAM_SEEDS_2025_26[teamAbbr]) {
      return TEAM_SEEDS_2025_26[teamAbbr];
    }
    
    return 0;
  };

  const seed1 = getSeed(team1, t1Abbr);
  const seed2 = getSeed(team2, t2Abbr);

  // Debug - pokaż wszystkie dostępne pola dla diagnozy
  if (seed1 === 0 || seed2 === 0) {
    console.log(`  DEBUG ${t1Abbr} fields:`, Object.keys(team1).join(","));
    console.log(`  DEBUG ${t1Abbr} data:`, JSON.stringify({seed: team1.seed, rank: team1.rank, curatedRank: team1.curatedRank, playoffSeed: team1.playoffSeed, seriesSeed: team1.seriesSeed}));
    console.log(`  DEBUG comp notes:`, JSON.stringify(comp.notes?.map(n => n.text)));
  }

  console.log(`  Teams: ${t1Abbr}(seed:${seed1}) vs ${t2Abbr}(seed:${seed2}), round=${round}, isPlayIn=${isPlayIn}`);

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
      seed: seed1,
      score: parseInt(team1.score || 0),
      winner: team1.winner || false,
      homeAway: team1.homeAway
    },
    team2: {
      abbr: t2Abbr,
      name: TEAM_NAMES[t2Abbr] || team2.team?.displayName || "TBD",
      id: team2.team?.id,
      seed: seed2,
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

    // Map.get() zwraca referencję do tego samego obiektu - modyfikacje działają bezpośrednio
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
        if (false) { // DISABLED: age < 5 * 60 * 1000) {
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

    // DEBUG: Zaloguj wszystkie mecze przed filtrowaniem
    console.log('\n=== WSZYSTKIE MECZE PRZED FILTROWANIEM ===');
    allGames.forEach((g, i) => {
      console.log(`  [${i}] ${g.team1.abbr}(${g.team1.seed}) vs ${g.team2.abbr}(${g.team2.seed}) - Round: ${g.round}, isPlayIn: ${g.isPlayIn}, Conf: ${g.conference}`);
    });

    // Zbuduj serie
    const series = buildSeries(allGames);
    console.log(`Zbudowano ${series.length} serii playoffowych`);

    // Szczegółowe logowanie dla debugowania
    console.log('\n=== SERIE PO BUILD ===');
    series.forEach(s => {
      console.log(`  ${s.team1.abbr} (${s.team1.seed}) vs ${s.team2.abbr} (${s.team2.seed}) - Round ${s.round} ${s.conference}`);
      console.log(`    Mecze: ${s.games.length}, Wynik: ${s.wins1}-${s.wins2}, Status: ${s.status}`);
    });

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
      console.log(`\n=== FILTROWANIE ROUND 1 ===`);
      console.log(`Round 1 games found: ${round1Games.length} (z ${allGames.length} wszystkich)`);
      console.log('Play-iny (round=0):', allGames.filter(g => g.isPlayIn).length);
      console.log('Inne rundy:', allGames.filter(g => g.round > 1).length);
      
      // Grupuj po konferencji
      const eastGames = round1Games.filter(g => g.conference === "east" || EAST_TEAMS.includes(g.team1.abbr));
      const westGames = round1Games.filter(g => g.conference === "west" || WEST_TEAMS.includes(g.team1.abbr));
      
      console.log(`East Round 1: ${eastGames.length} games`);
      console.log(`West Round 1: ${westGames.length} games`);
      
      console.log('\nRound 1 East Games:');
      eastGames.forEach(g => {
        console.log(`  ${g.team1.abbr}(${g.team1.seed}) vs ${g.team2.abbr}(${g.team2.seed})`);
      });

      console.log('\nRound 1 West Games:');
      westGames.forEach(g => {
        console.log(`  ${g.team1.abbr}(${g.team1.seed}) vs ${g.team2.abbr}(${g.team2.seed})`);
      });

      // Uzupełnij East Round 1 - dopasuj po seedach z fallback na abbr
      const eastSlotSeeds = [
        [1, 8], // slot 0
        [2, 7], // slot 1
        [3, 6], // slot 2
        [4, 5]  // slot 3
      ];

      // Mapa drużyn East po seedzie (z hardcoded fallback)
      const eastTeamBySeed = new Map();
      for (const game of eastGames) {
        const s1 = game.team1.seed || TEAM_SEEDS_2025_26[game.team1.abbr] || 0;
        const s2 = game.team2.seed || TEAM_SEEDS_2025_26[game.team2.abbr] || 0;
        if (s1 > 0 && !eastTeamBySeed.has(s1)) eastTeamBySeed.set(s1, game.team1);
        if (s2 > 0 && !eastTeamBySeed.has(s2)) eastTeamBySeed.set(s2, game.team2);
      }
      // Dodaj hardcoded drużyny jeśli brakuje
      for (const [abbr, seed] of Object.entries(TEAM_SEEDS_2025_26)) {
        if (EAST_TEAMS.includes(abbr) && !eastTeamBySeed.has(seed)) {
          eastTeamBySeed.set(seed, { abbr, name: TEAM_NAMES[abbr] || abbr, seed });
        }
      }

      for (let i = 0; i < 4; i++) {
        const [expectedSeed1, expectedSeed2] = eastSlotSeeds[i];
        const slot = bracketData.rounds[1].east[i];

        // Najpierw spróbuj dopasować cały mecz po seedach
        let matchedGame = null;
        for (const game of eastGames) {
          const s1 = game.team1.seed || TEAM_SEEDS_2025_26[game.team1.abbr] || 0;
          const s2 = game.team2.seed || TEAM_SEEDS_2025_26[game.team2.abbr] || 0;
          if ((s1 === expectedSeed1 && s2 === expectedSeed2) ||
              (s1 === expectedSeed2 && s2 === expectedSeed1)) {
            matchedGame = game;
            // Upewnij się że seedy są ustawione
            game.team1.seed = s1;
            game.team2.seed = s2;
            break;
          }
        }

        if (matchedGame && slot) {
          const shouldSwap = matchedGame.team1.seed > matchedGame.team2.seed;
          slot.team1 = shouldSwap ? matchedGame.team2 : matchedGame.team1;
          slot.team2 = shouldSwap ? matchedGame.team1 : matchedGame.team2;
          slot.status = matchedGame.status;
          console.log(`[East] Matched slot ${i}: ${slot.team1.abbr}(${slot.team1.seed}) vs ${slot.team2.abbr}(${slot.team2.seed})`);
        } else if (slot) {
          // Fallback: zbuduj parę z mapy drużyn po seedzie
          const t1 = eastTeamBySeed.get(expectedSeed1);
          const t2 = eastTeamBySeed.get(expectedSeed2);
          if (t1 && t2) {
            slot.team1 = { ...t1, seed: expectedSeed1 };
            slot.team2 = { ...t2, seed: expectedSeed2 };
            slot.status = "scheduled";
            console.log(`[East] Fallback slot ${i}: ${slot.team1.abbr}(${expectedSeed1}) vs ${slot.team2.abbr}(${expectedSeed2})`);
          } else {
            console.log(`[East] No game for slot ${i} (seeds ${expectedSeed1}-${expectedSeed2}), t1=${t1?.abbr}, t2=${t2?.abbr}`);
          }
        }
      }

      // Uzupełnij West Round 1 - to samo podejście
      const westSlotSeeds = [
        [1, 8], [2, 7], [3, 6], [4, 5]
      ];

      // Mapa drużyn West po seedzie (z hardcoded fallback)
      const westTeamBySeed = new Map();
      for (const game of westGames) {
        const s1 = game.team1.seed || TEAM_SEEDS_2025_26[game.team1.abbr] || 0;
        const s2 = game.team2.seed || TEAM_SEEDS_2025_26[game.team2.abbr] || 0;
        if (s1 > 0 && !westTeamBySeed.has(s1)) westTeamBySeed.set(s1, game.team1);
        if (s2 > 0 && !westTeamBySeed.has(s2)) westTeamBySeed.set(s2, game.team2);
      }
      // Dodaj hardcoded drużyny jeśli brakuje
      for (const [abbr, seed] of Object.entries(TEAM_SEEDS_2025_26)) {
        if (WEST_TEAMS.includes(abbr) && !westTeamBySeed.has(seed)) {
          westTeamBySeed.set(seed, { abbr, name: TEAM_NAMES[abbr] || abbr, seed });
        }
      }

      for (let i = 0; i < 4; i++) {
        const [expectedSeed1, expectedSeed2] = westSlotSeeds[i];
        const slot = bracketData.rounds[1].west[i];

        let matchedGame = null;
        for (const game of westGames) {
          const s1 = game.team1.seed || TEAM_SEEDS_2025_26[game.team1.abbr] || 0;
          const s2 = game.team2.seed || TEAM_SEEDS_2025_26[game.team2.abbr] || 0;
          if ((s1 === expectedSeed1 && s2 === expectedSeed2) ||
              (s1 === expectedSeed2 && s2 === expectedSeed1)) {
            matchedGame = game;
            game.team1.seed = s1;
            game.team2.seed = s2;
            break;
          }
        }

        if (matchedGame && slot) {
          const shouldSwap = matchedGame.team1.seed > matchedGame.team2.seed;
          slot.team1 = shouldSwap ? matchedGame.team2 : matchedGame.team1;
          slot.team2 = shouldSwap ? matchedGame.team1 : matchedGame.team2;
          slot.status = matchedGame.status;
          console.log(`[West] Matched slot ${i}: ${slot.team1.abbr}(${slot.team1.seed}) vs ${slot.team2.abbr}(${slot.team2.seed})`);
        } else if (slot) {
          // Fallback: zbuduj parę z mapy drużyn po seedzie
          const t1 = westTeamBySeed.get(expectedSeed1);
          const t2 = westTeamBySeed.get(expectedSeed2);
          if (t1 && t2) {
            slot.team1 = { ...t1, seed: expectedSeed1 };
            slot.team2 = { ...t2, seed: expectedSeed2 };
            slot.status = "scheduled";
            console.log(`[West] Fallback slot ${i}: ${slot.team1.abbr}(${expectedSeed1}) vs ${slot.team2.abbr}(${expectedSeed2})`);
          } else {
            console.log(`[West] No game for slot ${i} (seeds ${expectedSeed1}-${expectedSeed2}), t1=${t1?.abbr}, t2=${t2?.abbr}`);
          }
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
