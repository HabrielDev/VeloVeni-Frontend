# VeloVeni — Frontend

VeloVeni ist ein Strava-basiertes Geolocation-Spiel, bei dem Radfahrer durch das Erkunden von Kacheln (0,01°×0,01°-Raster) Territorium in Deutschland erobern und mit Freunden vergleichen können.

## Tech Stack

- [React 18](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev) — Build-Tool
- [HeroUI v2](https://heroui.com) — Komponentenbibliothek
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [React Leaflet](https://react-leaflet.js.org) — Kartenrendering
- [React Router v6](https://reactrouter.com) — Routing
- [Lucide React](https://lucide.dev) — Icons

## Features

- **Strava OAuth** — Login via Strava, Aktivitäten werden automatisch synchronisiert
- **Territoriumskarte** — Eigene Felder in Strava-Orange, globale Felder anderer User in Rot, Freunde farblich individuell zugeordnet
- **Zonenmodus** — Umschalten zwischen _Deutschlandweit_ (alle User) und _Freunde_ (nur Strava-Kontakte)
- **Routen-Sidebar** — Aktivitätsliste mit Suche, Filter (Spielwürdig / Rad / Lauf / Alle) und Sortierung
- **Leaderboard** — Global und Freunde-basiert mit Tile-Crossing-Rangliste
- **Privatsphäre** — Nutzer können im Profil steuern, ob Zonen und/oder Fahrten mit Freunden geteilt werden
- **DSGVO** — Consent-Banner, Datenexport und Account-Löschung
- **Light/Dark Mode** — Glassmorphism-Design mit Theme-Switcher
- **Responsive** — Desktop-Sidebar + Mobile Bottom Navigation

## Projektstruktur

```
src/
├── api/            # Backend- und Strava-API-Aufrufe
├── components/     # Wiederverwendbare UI-Komponenten (Navbar, ThemeSwitch, …)
├── features/
│   ├── auth/       # StravaContext — globaler Auth-State inkl. backendUserId
│   └── theme/      # ThemeContext
├── pages/          # Seitenkomponenten (Maps, Rides, Leaderboard, Profile)
├── styles/         # Globale CSS inkl. Bike-Animation
└── utils/          # Geo-Hilfsfunktionen (Polyline-Decoder, Tile-Berechnung, …)
```
