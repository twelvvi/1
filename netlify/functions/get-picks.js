// netlify/functions/get-picks.js
// Pobiera typy graczy z Netlify Blobs
// Ukrywa typy drugiego gracza dopóki obaj nie wpiszą typów lub seria się nie zacznie

import { getStore } from "@netlify/blobs";

const VALID_PLAYERS = ["kamil", "kuba"];

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
    const url = new URL(req.url);
    const player = url.searchParams.get("player")?.toLowerCase();
    const viewAs = url.searchParams.get("viewAs")?.toLowerCase(); // kto jest zalogowany
    const round = url.searchParams.get("round");

    // Jeśli proszono o konkretnego gracza
    if (player) {
      if (!VALID_PLAYERS.includes(player)) {
        return new Response(JSON.stringify({ error: "Nieznany gracz" }), { status: 400, headers });
      }

      const store = getStore("player-picks");
      const key = `picks_${player}`;

      let picks = null;
      try {
        picks = await store.get(key, { type: "json" });
      } catch {
        // Brak typów – zwróć null
      }

      // Logika ukrywania typów drugiego gracza
      if (viewAs && viewAs !== player && picks) {
        // Sprawdź czy oglądający już wprowadził swoje typy lub seria się zaczęła
        const viewerKey = `picks_${viewAs}`;
        let viewerPicks = null;
        try {
          viewerPicks = await store.get(viewerKey, { type: "json" });
        } catch {}

        if (round) {
          const roundNum = parseInt(round);
          const targetHasPicks = picks.rounds?.[roundNum] && Object.keys(picks.rounds[roundNum]).length > 0;
          const viewerHasPicks = viewerPicks?.rounds?.[roundNum] && Object.keys(viewerPicks.rounds[roundNum]).length > 0;

          if (!viewerHasPicks) {
            // Oglądający nie wpisał jeszcze typów – ukryj typy drugiego gracza
            // ale sprawdź czy seria już ruszyła
            let seriesStarted = false;
            try {
              const bracketRes = await fetch(
                `${process.env.URL || "http://localhost:8888"}/.netlify/functions/get-bracket`
              );
              if (bracketRes.ok) {
                const bracket = await bracketRes.json();
                const roundData = bracket.rounds?.[roundNum];
                const allSeries = [
                  ...(roundData?.east ?? []),
                  ...(roundData?.west ?? []),
                  ...(roundData?.finals ?? [])
                ];
                seriesStarted = allSeries.some(s => s.status === "inProgress" || s.status === "completed");
              }
            } catch {}

            if (!seriesStarted) {
              // Ukryj typy – zwróć że gracz wpisał ale nie pokazuj co wpisał
              return new Response(
                JSON.stringify({
                  player,
                  hidden: true,
                  hasPicks: targetHasPicks,
                  message: "Typy są ukryte dopóki nie wpiszesz własnych typów lub seria się nie rozpocznie"
                }),
                { status: 200, headers }
              );
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ player, picks: picks || null }),
        { status: 200, headers }
      );
    }

    // Pobierz typy wszystkich graczy naraz
    const store = getStore("player-picks");
    const result = {};

    for (const p of VALID_PLAYERS) {
      try {
        result[p] = await store.get(`picks_${p}`, { type: "json" }) ?? null;
      } catch {
        result[p] = null;
      }
    }

    return new Response(JSON.stringify({ picks: result }), { status: 200, headers });

  } catch (err) {
    console.error("Błąd get-picks:", err);
    return new Response(
      JSON.stringify({ error: "Wewnętrzny błąd serwera: " + err.message }),
      { status: 500, headers }
    );
  }
}

export const config = { path: "/api/get-picks" };
