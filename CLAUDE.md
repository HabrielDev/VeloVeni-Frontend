# VeloVeni | Frontend

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just build
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Manager

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain changes**: High-Level summary at each step
5. **Document Results**: Add review selection to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after correction

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what´s necessary. Avoid introducing bug.

## Git Workflow

- **Feature Branches**: Für jedes neue Feature IMMER einen neuen Branch erstellen — niemals direkt auf `main` arbeiten.
- **Namenskonvention**: `feature/<kurzer-name>` (z.B. `feature/leaderboard-friends`)
- **Gilt für Frontend UND Backend**: Beide Repos bekommen parallele Feature-Branches.
- **Merge nach Abschluss**: Wenn das Feature fertig und getestet ist, in `main` mergen.

```bash
# Neues Feature starten
git checkout -b feature/mein-feature

# ... entwickeln, committen ...

# Feature abschließen
git checkout main
git merge feature/mein-feature
```

## Deploy-Workflow

- **Nur Gitea** wird für Entwicklung und eigene Tests verwendet.
- **GitHub** ist ausschließlich für Production-Deploys (Railway ist mit GitHub verbunden).
- **IMMER fragen** bevor nach GitHub gepusht wird: "Soll ich die Änderungen jetzt deployen?"
- Deploy-Befehl (Frontend): `git push github main`
- Deploy-Befehl (Backend): `cd ../VeloVeni-Backend && git push github main`

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
