// netlify/functions/get-bracket.js
// Pobiera aktualną drabinkę playoffów NBA z ESPN API
// (agreguje mecze → serie), z cache w Netlify Blobs (5 min)
// i fallback na dane hardkodowane gdy API jest niedostępne.

import { getStore } from "@netlify/blobs";
import { CONFIG } from "../../src/config.js";

// Mapowanie abbr ESPN → konferencja. Zgodne z podziałem NBA.
const EAST_TEAMS = new Set([
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DET", "IND",
  "MIA", "MIL", "NY", "NYK", "ORL", "PHI", "TOR", "WSH", "WAS"
]);
const WEST_TEAMS = new Set([
  "DAL", "DEN", "GS", "GSW", "HOU", "LAC", "LAL", "MEM",
  "MIN", "NO", "NOP", "OKC", "PHX", "PHO", "POR", "SAC", "SA", "SAS", "UTAH", "UTA"
]);

// Normalizuj skróty ESPN do naszego słownika (używanego w logos/config)
const ABBR_ALIAS = {
  "NY": "NYK",
  "GS": "GSW",
  "NO": "NOP",
  "PHO": "PHX",
  "WSH": "WAS",
  "SA": "SAS",
  "UTAH": "UTA",
};
function normalizeAbbr(a) {
  const up = String(a || "").toUpperCase();
  return ABBR_ALIAS[up] ?? up;
}

// Mapowanie ID typu rundy ESPN → numer rundy w naszym UI
// 14=Round 1, 15=Conf Semis, 16=Conf Finals, 17=NBA Finals
const ROUND_TYPE_MAP = { "14": 1, "15": 2, "16": 3, "17": 4 };

// Fallback – hardkodowane dane playoffów NBA gdy ESPN API jest niedostępne
const FALLBACK_BRACKET = {
  season: CONFIG.season,
  lastUpdated: new Date().toISOString(),
  source: "fallback",
  rounds: {
    1: {
      east: [
        {
          id: "e1s1", round: 1, conference: "east", seriesNumber: 1,
          team1: { abbr: "CLE", name: "Cleveland Cavaliers", seed: 1, teamId: 1610612739 },
          team2: { abbr: "ATL", name: "Atlanta Hawks", seed: 8, teamId: 1610612737 },
          wins1: 0, wins2: 0, status: "scheduled", startDate: "2026-04-18"
        },
        {
          id: "e1s2", round: 1, conference: "east", seriesNumber: 2,
          team1: { abbr: "BOS", name: "Boston Celtics", seed: 2, teamId: 1610612738 },
          team2: { abbr: "DET", name: "Detroit Pistons", seed: 7, teamId: 1610612765 },
          wins1: 0, wins2: 0, status: "scheduled", startDate: "2026-04-19"
        },
        {
          id: "e1s3", round: 1, conference: "east", seriesNumber: 3,
          team1: { abbr: "NYK", name: "New York Knicks", seed: 3, teamId: 1610612752 },
          team2: { abbr: "MIA", name: "Miami Heat", seed: 6, teamId: 1610612748 },
          wins1: 0, wins2: 0, status: "scheduled", startDate: "2026-04-19"
        },
        {
          id: "e1s4", round: 1, conference: "east", seriesNumber: 4,
          team1: { abbr: "IND", name: "Indiana Pacers", seed: 4, teamId: 1610612754 },
          team2: { abbr: "MIL", name: "Milwaukee Bucks", seed: 5, teamId: 1610612749 },
          wins1: 0, wins2: 0, status: "scheduled", startDate: "2026-04-20"
        }
      ],
      west: [
        {
          id: "w1s1", round: 1, conference: "west", seriesNumber: 1,
          team1: { abbr: "OKC", name: "Oklahoma City Thunder", seed: 1, teamId: 1610612760 },
          team2: { abbr: "POR", name: "Portland Trail Blazers", seed: 8, teamId: 1610612757 },
          wins1: 0, wins2: 0, status: "scheduled", startDate: "2026-04-18"
        },
        {
          id: "w1s2", round: 1, conference: "west", seriesNumber: 2,
          team1: { abbr: "HOU", name: "Houston Rockets", seed: 2, teamId: 1610612745 },
          team2: { abbr: "SAS", name: "San Antonio Spurs", seed: 7, teamId: 1610612759 },
          wins1: 0, wins2: 0, status: "scheduled", startDate: "2026-04-19"
        },
        {
          id: "w1s3", round: 1, conference: "west", seriesNumber: 3,
          team1: { abbr: "DEN", name: "Denver Nuggets", seed: 3, teamId: 1610612743 },
          team2: { abbr: "GSW", name: "Golden State Warriors", seed: 6, teamId: 1610612744 },
          wins1: 0, wins2: 0, status: "scheduled", startDate: "2026-04-20"
        },
        {
          id: "w1s4", round: 1, conference: "west", seriesNumber: 4,
          team1: { abbr: "LAL", name: "Los Angeles Lakers", seed: 4, teamId: 1610612747 },
          team2: { abbr: "MEM", name: "Memphis Grizzlies", seed: 5, teamId: 1610612763 },
          wins1: 0, wins2: 0, status: "scheduled", startDate: "2026-04-20"
        }
      ]
    },
    // Szkielet kolejnych rund – zostają puste dopóki ESPN API nie zwróci meczów
    2: { east: [], west: [] },
    3: { east: [], west: [] },
    4: { finals: [] }
  }
};

// Ustal konferencję serii na podstawie skrótów drużyn
function seriesConference(team1Abbr, team2Abbr) {
  if (EAST_TEAMS.has(team1Abbr) || EAST_TEAMS.has(team2Abbr)) return "east";
  if (WEST_TEAMS.has(team1Abbr) || WEST_TEAMS.has(team2Abbr)) return "west";
  return "east"; // fallback
}

// Unikalny klucz serii niezależny od kolejności drużyn
function seriesKey(a, b) {
  return [a, b].sort().join("-");
}

function teamFromCompetitor(c, abbr) {
  const team = c.team ?? {};
  return {
    abbr,
    name: team.displayName ?? team.shortDisplayName ?? abbr,
    // ESPN nie zwraca seeda w scoreboard – zostawiamy null, UI pokaże "#?"
    seed: parseInt(c.curatedRank?.current) || parseInt(team.seed) || null,
    // teamId z CDN NBA (dla logotypów) – TeamLogo i tak dobiera z NBA_TEAM_IDS po abbr
    teamId: null,
  };
}

// Buduje strukturę drabinki z listy meczów ESPN.
// Każdy mecz ma: roundType (14/15/16/17), competitors (2), status (final?)
function buildBracketFromEvents(events) {
  // Mapa seriesKey → zagregowana seria
  const byKey = new Map();

  for (const ev of events) {
    const comp = ev?.competitions?.[0];
    if (!comp) continue;

    const roundTypeId = String(comp.type?.id ?? "");
    const round = ROUND_TYPE_MAP[roundTypeId];
    if (!round) continue;

    const competitors = comp.competitors ?? [];
    if (competitors.length !== 2) continue;

    const [c1, c2] = competitors;
    const abbr1 = normalizeAbbr(c1.team?.abbreviation);
    const abbr2 = normalizeAbbr(c2.team?.abbreviation);
    if (!abbr1 || !abbr2) continue;

    const isFinal =
      comp.status?.type?.state === "post" || comp.status?.type?.completed === true;
    const winner1 = isFinal && c1.winner === true;
    const winner2 = isFinal && c2.winner === true;

    const key = seriesKey(abbr1, abbr2);

    if (!byKey.has(key)) {
      const conf = round === 4 ? "finals" : seriesConference(abbr1, abbr2);
      byKey.set(key, {
        round,
        conference: conf,
        team1: teamFromCompetitor(c1, abbr1),
        team2: teamFromCompetitor(c2, abbr2),
        wins1: 0,
        wins2: 0,
        gamesPlayed: 0,
        firstGameDate: ev.date,
        lastGameDate: ev.date,
        hasLiveGame: false,
      });
    }

    const series = byKey.get(key);
    const a1 = series.team1.abbr;

    if (isFinal) {
      if ((winner1 && abbr1 === a1) || (winner2 && abbr2 === a1)) {
        series.wins1 += 1;
      } else if (winner1 || winner2) {
        series.wins2 += 1;
      }
      series.gamesPlayed += 1;
    }

    if (ev.date && (!series.firstGameDate || ev.date < series.firstGameDate)) {
      series.firstGameDate = ev.date;
    }
    if (ev.date && (!series.lastGameDate || ev.date > series.lastGameDate)) {
      series.lastGameDate = ev.date;
    }
    if (comp.status?.type?.state === "in") {
      series.hasLiveGame = true;
    }
  }

  // Konwersja na nasz schemat rund
  const rounds = {
    1: { east: [], west: [] },
    2: { east: [], west: [] },
    3: { east: [], west: [] },
    4: { finals: [] },
  };

  // Sortuj serie po dacie pierwszego meczu → stabilny porządek w UI
  const all = Array.from(byKey.values()).sort((a, b) =>
    (a.firstGameDate || "").localeCompare(b.firstGameDate || "")
  );

  const seqs = { e: { 1: 0, 2: 0, 3: 0 }, w: { 1: 0, 2: 0, 3: 0 }, f: 0 };

  for (const s of all) {
    const { wins1, wins2 } = s;
    const isComplete = wins1 === 4 || wins2 === 4;
    const hasAnyGame = s.gamesPlayed > 0 || s.hasLiveGame;
    const status = isComplete ? "completed" : hasAnyGame ? "inProgress" : "scheduled";

    const seriesObj = {
      id: null,
      round: s.round,
      conference: s.conference,
      team1: s.team1,
      team2: s.team2,
      wins1,
      wins2,
      status,
      startDate: s.firstGameDate,
    };

    if (s.round === 4) {
      seqs.f += 1;
      seriesObj.id = seqs.f === 1 ? "finals" : `finals-${seqs.f}`;
      rounds[4].finals.push(seriesObj);
    } else if (s.conference === "east") {
      seqs.e[s.round] += 1;
      seriesObj.seriesNumber = seqs.e[s.round];
      seriesObj.id = `e${s.round}s${seqs.e[s.round]}`;
      rounds[s.round].east.push(seriesObj);
    } else {
      seqs.w[s.round] += 1;
      seriesObj.seriesNumber = seqs.w[s.round];
      seriesObj.id = `w${s.round}s${seqs.w[s.round]}`;
      rounds[s.round].west.push(seriesObj);
    }
  }

  return rounds;
}

// Pobiera wszystkie mecze playoffów z ESPN w zadanym zakresie dat
async function fetchEspnPlayoffEvents(startDate, endDate) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${startDate}-${endDate}&limit=500`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`ESPN API HTTP ${res.status}`);
  const data = await res.json();
  return (data?.events ?? []).filter(
    (e) =>
      e?.season?.type === 3 ||
      ROUND_TYPE_MAP[String(e?.competitions?.[0]?.type?.id ?? "")]
  );
}

export default async function handler(req, context) {
  // Obsługa preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // Pozwól wymusić świeże dane przez ?refresh=1 (pomija cache)
  const url = new URL(req.url);
  const skipCache = url.searchParams.get("refresh") === "1";

  let store = null;
  try {
    store = getStore("bracket-cache");
  } catch (blobErr) {
    console.warn("Blobs store niedostępny:", blobErr.message);
  }

  // 1) Sprawdź cache
  if (store && !skipCache) {
    try {
      const cached = await store.get("bracket", { type: "json" });
      if (cached) {
        const age = Date.now() - new Date(cached.cachedAt).getTime();
        if (age < 5 * 60 * 1000) {
          return new Response(JSON.stringify(cached.data), { status: 200, headers });
        }
      }
    } catch (blobErr) {
      console.warn("Błąd odczytu cache Blobs:", blobErr.message);
    }
  }

  // 2) Pobierz z ESPN API
  let bracketData = null;

  try {
    const events = await fetchEspnPlayoffEvents(
      CONFIG.playoffsStart ?? "20260418",
      CONFIG.playoffsEnd ?? "20260630"
    );

    if (events.length === 0) {
      throw new Error("ESPN zwrócił 0 meczów playoff – sezon jeszcze się nie rozpoczął?");
    }

    const rounds = buildBracketFromEvents(events);

    // Jeśli ESPN nie ma jeszcze serii R1, użyj szkieletu fallback dla R1,
    // żeby gracze mogli typować zanim ruszy pierwszy mecz.
    if (rounds[1].east.length === 0 && rounds[1].west.length === 0) {
      rounds[1] = FALLBACK_BRACKET.rounds[1];
    }

    bracketData = {
      season: CONFIG.season,
      lastUpdated: new Date().toISOString(),
      source: "espn-api",
      rounds,
    };
  } catch (err) {
    console.error("Błąd pobierania ESPN API:", err.message);
    bracketData = {
      ...FALLBACK_BRACKET,
      lastUpdated: new Date().toISOString(),
      source: "fallback",
      apiError: err.message,
    };
  }

  // 3) Zapisz do cache (nawet fallback – ograniczy "burst" requestów przy awarii)
  if (store) {
    try {
      await store.setJSON("bracket", {
        data: bracketData,
        cachedAt: new Date().toISOString(),
      });
    } catch (blobErr) {
      console.warn("Błąd zapisu cache:", blobErr.message);
    }
  }

  return new Response(JSON.stringify(bracketData), { status: 200, headers });
}

export const config = { path: "/api/get-bracket" };
