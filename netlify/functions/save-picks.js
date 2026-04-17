// netlify/functions/save-picks.js
// Zapisuje typy gracza do Netlify Blobs
// Blokuje edycję gdy seria już się rozpoczęła

import { getStore } from "@netlify/blobs";

const VALID_PLAYERS = ["kamil", "kuba"];
const VALID_SCORES = ["4:0", "4:1", "4:2", "4:3"];

export default async function handler(req, context) {
  // Obsługa preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metoda niedozwolona" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Nieprawidłowy JSON w żądaniu" }), { status: 400, headers });
    }

    const { player, round, picks, season = "2025-26" } = body;

    // Walidacja gracza
    if (!player || !VALID_PLAYERS.includes(player.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: "Nieznany gracz. Dozwolone: " + VALID_PLAYERS.join(", ") }),
        { status: 400, headers }
      );
    }

    // Walidacja rundy
    const roundNum = parseInt(round);
    if (!roundNum || roundNum < 1 || roundNum > 4) {
      return new Response(JSON.stringify({ error: "Nieprawidłowa runda (1-4)" }), { status: 400, headers });
    }

    // Walidacja typów
    if (!picks || !Array.isArray(picks) || picks.length === 0) {
      return new Response(JSON.stringify({ error: "Brak typów do zapisania" }), { status: 400, headers });
    }

    for (const pick of picks) {
      if (!pick.seriesId || !pick.winner || !pick.score) {
        return new Response(
          JSON.stringify({ error: `Niekompletny typ dla serii: ${JSON.stringify(pick)}` }),
          { status: 400, headers }
        );
      }
      if (!VALID_SCORES.includes(pick.score)) {
        return new Response(
          JSON.stringify({ error: `Nieprawidłowy wynik: ${pick.score}. Dozwolone: ${VALID_SCORES.join(", ")}` }),
          { status: 400, headers }
        );
      }
    }

    // Sprawdź czy serie nie są już w toku lub zakończone
    try {
      const bracketRes = await fetch(
        `${process.env.URL || "http://localhost:8888"}/.netlify/functions/get-bracket`
      );
      if (bracketRes.ok) {
        const bracket = await bracketRes.json();
        const roundData = bracket.rounds?.[roundNum];

        const allSeriesInRound = [
          ...(roundData?.east ?? []),
          ...(roundData?.west ?? []),
          ...(roundData?.finals ?? [])
        ];

        for (const pick of picks) {
          const series = allSeriesInRound.find(s => s.id === pick.seriesId);
          if (series && (series.status === "inProgress" || series.status === "completed")) {
            return new Response(
              JSON.stringify({
                error: `Seria ${pick.seriesId} już trwa lub się zakończyła. Edycja typów jest zablokowana.`,
                locked: true
              }),
              { status: 403, headers }
            );
          }
        }
      }
    } catch (bracketErr) {
      // Jeśli nie możemy sprawdzić, kontynuuj (nie blokuj)
      console.warn("Nie udało się sprawdzić statusu serii:", bracketErr.message);
    }

    // Pobierz istniejące typy gracza
    const store = getStore("player-picks");
    const key = `picks_${player.toLowerCase()}`;

    let existingPicks = {
      season,
      rounds: {},
      lastUpdated: null
    };

    try {
      const existing = await store.get(key, { type: "json" });
      if (existing) existingPicks = existing;
    } catch {
      // Brak wcześniejszych typów – OK
    }

    // Zaktualizuj typy dla danej rundy
    const picksMap = {};
    picks.forEach(pick => {
      picksMap[pick.seriesId] = {
        winner: pick.winner,
        score: pick.score,
        savedAt: new Date().toISOString()
      };
    });

    existingPicks.rounds[roundNum] = picksMap;
    existingPicks.lastUpdated = new Date().toISOString();
    existingPicks.season = season;

    // Zapisz do Netlify Blobs
    await store.setJSON(key, existingPicks);

    return new Response(
      JSON.stringify({
        success: true,
        player,
        round: roundNum,
        savedAt: existingPicks.lastUpdated,
        message: `Typy gracza ${player} dla rundy ${roundNum} zostały zapisane.`
      }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error("Błąd save-picks:", err);
    return new Response(
      JSON.stringify({ error: "Wewnętrzny błąd serwera: " + err.message }),
      { status: 500, headers }
    );
  }
}

export const config = { path: "/api/save-picks" };
