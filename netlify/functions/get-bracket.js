// netlify/functions/get-bracket.js
// Pobiera aktualną drabinkę playoffów NBA z ESPN API
// z cache 5-minutowym i fallback na dane hardkodowane

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

// Fallback – pełna struktura z placeholderami dla przyszłych rund
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

// Agreguje mecze w serie playoffowe
function aggregateSeries(events) {
  const seriesMap = new Map();
  
  for (const event of events) {
    if (!event?.competitions?.[0]) continue;
    
    const comp = event.competitions[0];
    const teams = comp.competitors || [];
    if (teams.length < 2) continue;

    const teamIds = teams.map(t => t.team?.id).filter(Boolean).sort().join("-");
    if (!seriesMap.has(teamIds)) {
      seriesMap.set(teamIds, { events: [], teams, seriesId: null });
    }
    seriesMap.get(teamIds).events.push(event);
  }

  const result = [];
  for (const [key, data] of seriesMap) {
    const events = data.events.sort((a, b) => new Date(a.date) - new Date(b.date));
    const wins = {};
    
    for (const event of events) {
      const comp = event.competitions[0];
      for (const team of comp.competitors) {
        if (event.status?.type?.completed && team.winner) {
          const abbr = ESPN_TEAM_MAP[team.team?.id] || team.team?.abbreviation;
          wins[abbr] = (wins[abbr] || 0) + 1;
        }
      }
    }

    const teams = data.teams;
    const t1Abbr = ESPN_TEAM_MAP[teams[0].team?.id] || teams[0].team?.abbreviation || "TBD";
    const t2Abbr = ESPN_TEAM_MAP[teams[1].team?.id] || teams[1].team?.abbreviation || "TBD";
    
    const wins1 = wins[t1Abbr] || 0;
    const wins2 = wins[t2Abbr] || 0;
    const isComplete = wins1 >= 4 || wins2 >= 4;
    const isInProgress = (wins1 > 0 || wins2 > 0) && !isComplete;

    result.push({
      wins1,
      wins2,
      status: isComplete ? "completed" : isInProgress ? "inProgress" : "scheduled",
      team1: {
        abbr: t1Abbr,
        name: TEAM_NAMES[t1Abbr] || teams[0].team?.displayName || "TBD",
        seed: teams[0].seed || 0
      },
      team2: {
        abbr: t2Abbr,
        name: TEAM_NAMES[t2Abbr] || teams[1].team?.displayName || "TBD",
        seed: teams[1].seed || 0
      }
    });
  }

  return result;
}

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

    let bracketData = null;
    let apiError = null;

    try {
      console.log("Pobieram dane z ESPN API...");
      const espnRes = await fetch(
        "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20250401-20250630",
        { signal: AbortSignal.timeout(10000) }
      );

      if (!espnRes.ok) {
        throw new Error(`ESPN API: ${espnRes.status}`);
      }

      const espnData = await espnRes.json();
      const playoffEvents = (espnData.events || []).filter(e => 
        e.season?.type === 3 || (e.name && e.name.includes("at"))
      );

      if (playoffEvents.length > 0) {
        const series = aggregateSeries(playoffEvents);
        const eastTeams = ["ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DET", "IND", "MIA", "MIL", "NYK", "ORL", "PHI", "TOR", "WAS"];
        const westTeams = ["DAL", "DEN", "GSW", "HOU", "LAC", "LAL", "MEM", "MIN", "NOP", "OKC", "PHX", "POR", "SAC", "SAS", "UTA"];
        
        bracketData = {
          season: "2025-26",
          lastUpdated: new Date().toISOString(),
          source: "espn-api",
          rounds: JSON.parse(JSON.stringify(FALLBACK_BRACKET.rounds))
        };

        const eastSeries = series.filter(s => eastTeams.includes(s.team1.abbr) || eastTeams.includes(s.team2.abbr));
        const westSeries = series.filter(s => westTeams.includes(s.team1.abbr) || westTeams.includes(s.team2.abbr));

        eastSeries.slice(0, 4).forEach((s, i) => {
          if (bracketData.rounds[1].east[i]) {
            Object.assign(bracketData.rounds[1].east[i], s);
            bracketData.rounds[1].east[i].id = `e1-${i + 1}`;
          }
        });
        westSeries.slice(0, 4).forEach((s, i) => {
          if (bracketData.rounds[1].west[i]) {
            Object.assign(bracketData.rounds[1].west[i], s);
            bracketData.rounds[1].west[i].id = `w1-${i + 1}`;
          }
        });

        console.log(`ESPN: znaleziono ${series.length} serii`);
      }
    } catch (err) {
      apiError = err.message;
      console.error("Błąd ESPN API:", err.message);
    }

    if (!bracketData) {
      bracketData = { 
        ...FALLBACK_BRACKET, 
        source: "fallback", 
        apiError: apiError || "Brak danych z API" 
      };
    }

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
      JSON.stringify({ ...FALLBACK_BRACKET, source: "fallback", error: err.message }),
      { status: 200, headers }
    );
  }
}

export const config = { path: "/api/get-bracket" };
