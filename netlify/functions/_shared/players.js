// netlify/functions/_shared/players.js
// Wspólna lista ID graczy dla wszystkich funkcji Netlify.
// Jedno źródło prawdy: src/config.js (frontend). Dzięki temu zmiana
// graczy w config.js automatycznie propaguje się do backendu i nie
// trzeba dublować listy w wielu miejscach.

import { CONFIG } from "../../../src/config.js";

export const VALID_PLAYERS = CONFIG.players.map(p => p.id.toLowerCase());

export function isValidPlayer(id) {
  if (!id) return false;
  return VALID_PLAYERS.includes(String(id).toLowerCase());
}
