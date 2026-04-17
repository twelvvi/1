# 🏀 NBA Playoffs 2026 – Instrukcja wdrożenia

## Wymagania
- Node.js 18+
- Konto GitHub
- Konto Netlify (bezpłatne)

---

## 1. Klonowanie repozytorium i instalacja zależności

```bash
# Sklonuj repozytorium (lub pobierz ZIP i wrzuć na GitHub)
git clone https://github.com/TWOJ-LOGIN/nba-playoffs-2026.git
cd nba-playoffs-2026

# Zainstaluj zależności
npm install
```

---

## 2. Instalacja Netlify CLI

```bash
npm install -g netlify-cli

# Zaloguj się do Netlify
netlify login
```

---

## 3. Uruchomienie lokalne z Netlify Blobs

```bash
# Połącz projekt z Netlify (pierwsze uruchomienie)
netlify init
# lub jeśli masz już projekt na Netlify:
netlify link

# Uruchom lokalny serwer deweloperski
# (automatycznie startuje funkcje serverless i Netlify Blobs)
netlify dev
```

Aplikacja będzie dostępna pod: `http://localhost:8888`

Adresy graczy:
- `http://localhost:8888/gracz/kamil`
- `http://localhost:8888/gracz/kuba`

---

## 4. Zmiana nazw graczy

Otwórz plik `src/config.js` i edytuj sekcję `players`:

```javascript
export const CONFIG = {
  players: [
    { id: "kamil", name: "Kamil", avatar: "🏀" },  // ← zmień "kamil" i "Kamil"
    { id: "kuba",  name: "Kuba",  avatar: "🔥" }   // ← zmień "kuba" i "Kuba"
  ],
  // ...
};
```

> ⚠️ **Ważne:** `id` jest używane w URL (`/gracz/kamil`) oraz jako klucz w Netlify Blobs.
> Zmień go **przed pierwszym deploymentem**, bo późniejsza zmiana wymaże zapisane typy.

Możesz też zmienić emoji `avatar` na dowolne inne.

---

## 5. Deployment na Netlify przez GitHub

### Krok 1 – Wrzuć kod na GitHub

```bash
git add .
git commit -m "Pierwsza wersja aplikacji"
git push origin main
```

### Krok 2 – Podłącz GitHub do Netlify

1. Wejdź na [app.netlify.com](https://app.netlify.com)
2. Kliknij **"Add new site"** → **"Import an existing project"**
3. Wybierz **GitHub** i autoryzuj dostęp
4. Wybierz repozytorium `nba-playoffs-2026`
5. Netlify automatycznie wykryje ustawienia z `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Kliknij **"Deploy site"**

### Krok 3 – Włącz Netlify Blobs

Netlify Blobs jest **automatycznie dostępny** dla każdego projektu na Netlify – nie wymaga osobnej konfiguracji. Dane są przechowywane i zarządzane przez Netlify.

### Krok 4 – Opcjonalnie: własna domena

W panelu Netlify → **Domain settings** → możesz ustawić własną domenę lub użyć darmowej subdomeny np. `nba-picks-2026.netlify.app`.

---

## 6. Udostępnianie linków znajomemu

Po deploymencie aplikacja będzie dostępna pod adresem np.:
```
https://nba-picks-2026.netlify.app
```

Wyślij znajomemu **dwa linki**:

| Gracz | Link |
|-------|------|
| Kamil | `https://nba-picks-2026.netlify.app/gracz/kamil` |
| Kuba  | `https://nba-picks-2026.netlify.app/gracz/kuba` |

> Każdy gracz wchodzi tylko na swój link, żeby wprowadzać i edytować typy.
> Strona główna (`/`) pokazuje drabinkę i ranking dla obu graczy.

---

## Struktura projektu

```
/
├── netlify/
│   └── functions/
│       ├── get-bracket.js   # Pobiera drabinkę z NBA API + cache 5 min
│       ├── get-picks.js     # Pobiera typy graczy z Netlify Blobs
│       ├── save-picks.js    # Zapisuje typy do Netlify Blobs
│       └── get-scores.js    # Oblicza punkty
├── src/
│   ├── components/
│   │   ├── BracketView.jsx  # Wizualna drabinka playoffs
│   │   ├── PicksForm.jsx    # Formularz typowania
│   │   ├── Leaderboard.jsx  # Tabela wyników
│   │   ├── SeriesCard.jsx   # Karta pojedynczej serii
│   │   └── TeamLogo.jsx     # Logo drużyny NBA
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   └── config.js            # ← TUTAJ zmieniasz nazwy graczy
├── public/
├── netlify.toml
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## System punktacji

| Sytuacja | Punkty |
|----------|--------|
| Trafiona drużyna (zły wynik) | +1 pkt |
| Ideał: drużyna + wynik serii | +2 pkt |
| Pudło | 0 pkt |

Możliwe wyniki serii: **4:0, 4:1, 4:2, 4:3**

---

## Rozwiązywanie problemów

### Funkcje serverless nie działają lokalnie
```bash
# Upewnij się że używasz `netlify dev`, nie `npm run vite`
netlify dev
```

### Netlify Blobs nie zapisuje danych
- Lokalnie: musisz być zalogowany (`netlify login`) i mieć połączony projekt (`netlify link`)
- Na produkcji: Blobs działa automatycznie

### NBA API nie odpowiada
Aplikacja automatycznie przełącza się na dane zastępcze (hardkodowane). Dane zastępcze zawierają prognozowane drabinki NBA Playoffs 2026 i pozwalają przetestować wszystkie funkcje.

### Jak zaktualizować dane ręcznie
Po zakończeniu serii edytuj dane fallback w `netlify/functions/get-bracket.js` w sekcji `FALLBACK_BRACKET`, ustawiając odpowiednie `wins1`, `wins2` i `status: "completed"`.

---

## Kontakt i wsparcie

Aplikacja stworzona na potrzeby prywatnej rywalizacji znajomych podczas NBA Playoffs 2026.
