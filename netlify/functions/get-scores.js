// netlify/functions/get-scores.js
// Oblicza punkty graczy na podstawie wyników serii i typów
// System: 1 pkt za drużynę, 2 pkt za dokładny wynik + drużyna

import { getStore } from "@netlify/blobs";
import { VALID_PLAYERS } from "./_shared/players.js";

// Oblicza punkty za pojedynczą serię
function calculateSeriesPoints(pick, series) {
  if (!pick || !series || series.status !== "completed") {
    return { points: 0, status: "pending" };
  }

  // Ustal kto wygrał serię w rzeczywistości
  const actualWinner = series.wins1 === 4 ? series.team1.abbr : series.team2.abbr;
  const actualScore = series.wins1 === 4
    ? `4:${series.wins2}`
    : `4:${series.wins1}`;

  const guessedCorrectTeam = pick.winner === actualWinner;
  const guessedCorrectScore = pick.score === actualScore;

  if (guessedCorrectTeam && guessedCorrectScore) {
    return { points: 2, status: "perfect", actualWinner, actualScore };
  } else if (guessedCorrectTeam) {
    return { points: 1, status: "correct_team", actualWinner, actualScore };
  } else {
    return { points: 0, status: "wrong", actualWinner, actualScore };
  }
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
    // Pobierz drabinkę
    const bracketRes = await fetch(
      `${process.env.URL || "http://localhost:8888"}/.netlify/functions/get-bracket`
    );
    if (!bracketRes.ok) throw new Error("Nie udało się pobrać drabinki");
    const bracket = await bracketRes.json();

    // Pobierz typy wszystkich graczy
    const store = getStore("player-picks");
    const playerPicks = {};
    for (const p of VALID_PLAYERS) {
      try {
        playerPicks[p] = await store.get(`picks_${p}`, { type: "json" }) ?? null;
      } catch {
        playerPicks[p] = null;
      }
    }

    // Zbierz wszystkie serie ze wszystkich rund
    const allSeries = {};
    for (let round = 1; round <= 4; round++) {
      const roundData = bracket.rounds?.[round];
      if (!roundData) continue;

      const series = [
        ...(roundData.east ?? []),
        ...(roundData.west ?? []),
        ...(roundData.finals ?? [])
      ];

      series.forEach(s => {
        if (s.id) allSeries[s.id] = { ...s, round };
      });
    }

    // Oblicz punkty dla każdego gracza
    const scores = {};

    for (const player of VALID_PLAYERS) {
      const picks = playerPicks[player];
      const roundScores = { 1: 0, 2: 0, 3: 0, 4: 0 };
      const seriesResults = {};

      if (picks?.rounds) {
        for (const [roundNum, roundPicks] of Object.entries(picks.rounds)) {
          for (const [seriesId, pick] of Object.entries(roundPicks)) {
            const series = allSeries[seriesId];
            if (!series) continue;

            const result = calculateSeriesPoints(pick, series);
            roundScores[parseInt(roundNum)] = (roundScores[parseInt(roundNum)] || 0) + result.points;
            seriesResults[seriesId] = {
              ...result,
              pick,
              seriesId
            };
          }
        }
      }

      const totalPoints = Object.values(roundScores).reduce((a, b) => a + b, 0);
      scores[player] = {
        player,
        totalPoints,
        roundScores,
        seriesResults,
        hasPicks: picks !== null
      };
    }

    // Posortuj ranking
    const leaderboard = VALID_PLAYERS
      .map(p => scores[p])
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    return new Response(
      JSON.stringify({
        leaderboard,
        scores,
        calculatedAt: new Date().toISOString()
      }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error("Błąd get-scores:", err);
    return new Response(
      JSON.stringify({ error: "Wewnętrzny błąd serwera: " + err.message }),
      { status: 500, headers }
    );
  }
}

export const config = { path: "/api/get-scores" };
