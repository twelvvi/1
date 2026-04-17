// netlify/functions/get-bracket.js
// Pobiera aktualną drabinkę playoffów NBA z zewnętrznego API
// z cache 5-minutowym i fallback na dane hardkodowane

import { getStore } from "@netlify/blobs";

// Fallback – hardkodowane dane playoffów NBA 2026
const FALLBACK_BRACKET = {
  season: "2025-26",
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
    2: { east: [], west: [] },
    3: { east: [], west: [] },
    4: { finals: [] }
  }
};

// Parsuje odpowiedź NBA API do naszej wewnętrznej struktury
function parseNBASeries(apiSeries) {
  if (!apiSeries) return null;
  try {
    const wins1 = parseInt(apiSeries.topRow?.wins ?? 0);
    const wins2 = parseInt(apiSeries.bottomRow?.wins ?? 0);
    const isComplete = wins1 === 4 || wins2 === 4;
    const isInProgress = (wins1 > 0 || wins2 > 0) && !isComplete;

    return {
      wins1,
      wins2,
      status: isComplete ? "completed" : isInProgress ? "inProgress" : "scheduled",
      team1: {
        abbr: apiSeries.topRow?.teamAbbr,
        name: apiSeries.topRow?.teamCity + " " + apiSeries.topRow?.teamName,
        seed: parseInt(apiSeries.topRow?.seed ?? 0),
        teamId: parseInt(apiSeries.topRow?.teamId ?? 0)
      },
      team2: {
        abbr: apiSeries.bottomRow?.teamAbbr,
        name: apiSeries.bottomRow?.teamCity + " " + apiSeries.bottomRow?.teamName,
        seed: parseInt(apiSeries.bottomRow?.seed ?? 0),
        teamId: parseInt(apiSeries.bottomRow?.teamId ?? 0)
      }
    };
  } catch {
    return null;
  }
}

export default async function handler(req, context) {
  // Obsługa preflight CORS
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
    // Sprawdź cache w Netlify Blobs
    let store;
    try {
      store = getStore("bracket-cache");
      const cached = await store.get("bracket", { type: "json" });
      if (cached) {
        const age = Date.now() - new Date(cached.cachedAt).getTime();
        if (age < 5 * 60 * 1000) {
          // Cache jest świeży (< 5 minut)
          return new Response(JSON.stringify(cached.data), { status: 200, headers });
        }
      }
    } catch (blobErr) {
      console.warn("Błąd odczytu cache Blobs:", blobErr.message);
    }

    // Pobierz z NBA API
    let bracketData = null;
    let apiError = null;

    try {
      const nbaRes = await fetch(
        "https://cdn.nba.com/static/json/liveData/playoff/playoffBracket_1026.json",
        {
          headers: {
            "Accept": "application/json",
            "Origin": "https://www.nba.com",
            "Referer": "https://www.nba.com/",
          },
          signal: AbortSignal.timeout(8000)
        }
      );

      if (!nbaRes.ok) throw new Error(`NBA API odpowiedział: ${nbaRes.status}`);
      const nbaData = await nbaRes.json();

      // Mapuj dane NBA na naszą strukturę
      const playoffBracket = nbaData?.bracket?.playoffBracket ?? nbaData?.playoffBracket;
      if (playoffBracket) {
        bracketData = {
          season: "2025-26",
          lastUpdated: new Date().toISOString(),
          source: "nba-api",
          rounds: FALLBACK_BRACKET.rounds
        };

        // Mapuj serie z API
        const series = playoffBracket?.series ?? playoffBracket?.playoffSeries ?? [];
        series.forEach(s => {
          const parsed = parseNBASeries(s);
          if (!parsed) return;

          const round = parseInt(s.roundNum ?? s.roundNumber ?? 1);
          const conference = (s.confName ?? "").toLowerCase().includes("east") ? "east" : "west";
          const idx = parseInt(s.seriesNum ?? 0);

          if (round === 4) {
            if (!bracketData.rounds[4].finals[0]) {
              bracketData.rounds[4].finals = [{
                id: "finals", round: 4, conference: "finals",
                ...parsed
              }];
            }
          } else if (bracketData.rounds[round]?.[conference]?.[idx]) {
            Object.assign(bracketData.rounds[round][conference][idx], parsed);
          }
        });
      }
    } catch (err) {
      apiError = err.message;
      console.error("Błąd pobierania NBA API:", err.message);
    }

    // Użyj fallback jeśli API nie odpowiedziało
    if (!bracketData) {
      bracketData = { ...FALLBACK_BRACKET, source: "fallback", apiError };
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
      JSON.stringify({ ...FALLBACK_BRACKET, source: "fallback", error: err.message }),
      { status: 200, headers }
    );
  }
}

export const config = { path: "/api/get-bracket" };
