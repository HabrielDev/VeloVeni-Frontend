# VeloVeni | Frontend

## Project Overview

VeloVeni ist eine kompetitive Webanwendung, bei der Radfahrer durch ihre GPS-Tracks reale Gebiete auf einer Deutschlandkarte "erobern". Dieses Repository enthält ausschließlich das **Frontend**: UI, Kartenlogik und Visualisierung der Eroberungs-Mechanik.

## Tech Stack

- **Framework:** React (Vite)
- **UI Library:** HeroUI
- **Maps:** Leaflet (react-leaflet)
- **Auth/Integration:** Strava OAuth2
- **Sprache:** TypeScript

## Architecture & Folder Structure

```
src/
├── components/      # Wiederverwendbare UI-Komponenten (HeroUI-basiert)
├── pages/           # Seitenkomponenten (Dashboard, Map, Leaderboard, etc.)
├── features/        # Feature-Module (map/, activities/, leaderboard/, auth/)
├── hooks/           # Custom React Hooks
├── store/           # State Management
├── api/             # API-Calls zum Backend
├── types/           # TypeScript-Typen & Interfaces
└── utils/           # Hilfsfunktionen (GPS-Berechnungen, Polygon-Logik, etc.)
```

## Core Features

- **Interaktive Map:** GPS-Tracks und eroberte Polygone via Leaflet
- **Aktivitäts-Dashboard:** Strava-Fahrten, Flächenbesitz, persönliche Statistiken
- **Eroberungs-Visualisierung:** Gebietsüberschneidungen und umkämpfte Sektoren
- **Leaderboards:** Globale und soziale Ranglisten (Freunde)
- **Strava OAuth2:** Login & Aktivitätssync

## How to Work on This Project

### Dev-Server starten

```bash
npm run dev
```

### Build & Type-Check

```bash
npm run build      # Produktions-Build
npm run typecheck  # TypeScript prüfen
npm run lint       # Linting
```

### Tests

```bash
npm run test
```

> Vor jedem Commit: `npm run typecheck && npm run lint`

## Coding Rules

- **Functional Components** – keine Class-Components
- **TypeScript Strict Mode** – keine `any`-Typen ohne Begründung
- **HeroUI-Komponenten** bevorzugen vor eigenen UI-Primitives
- **Leaflet-Layer** immer in eigene Feature-Komponenten kapseln
- GPS/Geo-Logik gehört in `utils/` oder `features/map/`, nicht in Components
- API-Calls nur über `src/api/`, niemals direkt in Komponenten

## Map-spezifische Hinweise

- Leaflet-Instanz **nicht** im React-State speichern – Ref verwenden
- Polygon-Rendering bei vielen Features: GeoJSON-Layer bevorzugen (Performance)
- Für Deutschland-Karte: Koordinaten in WGS84 (EPSG:4326)
- Strava-GPS-Tracks kommen als GeoJSON LineString vom Backend

## Weitere Dokumentation

Für aufgabenspezifische Details (falls vorhanden):

- `agent_docs/api-schema.md` – Backend API & Datenstrukturen
- `agent_docs/map-logic.md` – Polygon- & Eroberungs-Algorithmen
- `agent_docs/strava-integration.md` – OAuth2-Flow Details

## What Claude Gets Wrong (Lessons Learned)

<!-- Hier dokumentieren, wenn Claude wiederholt Fehler macht -->

- Leaflet direkt im JSX ohne `react-leaflet` Wrapper verwenden
- HeroUI-Komponenten mit falschen Props ansprechen (immer Docs prüfen)
