# VeloVeni Frontend — Dokumentation

Übersicht der technischen Dokumentation für das VeloVeni Frontend.

## Inhaltsverzeichnis

| Dokument | Beschreibung |
|----------|-------------|
| [tech-stack.md](tech-stack.md) | Alle eingesetzten Technologien & Bibliotheken |
| [architecture.md](architecture.md) | Projektstruktur & Zusammenspiel der Schichten |
| [auth-flow.md](auth-flow.md) | Strava OAuth2 + JWT Authentifizierung |
| [map-system.md](map-system.md) | Leaflet-Integration & Kachel-System |
| [api-layer.md](api-layer.md) | API-Aufrufe & Datenstrukturen |

## Kurzübersicht

VeloVeni ist eine kompetitive Webanwendung, bei der Radfahrer durch GPS-Tracks reale Gebiete auf einer Deutschlandkarte "erobern".

```
Strava OAuth2 → Backend JWT → React Frontend → Leaflet Map
                                     ↓
                              HeroUI Components
                              Context API State
```
