# Karten-System

## Überblick

Die Karte basiert auf **Leaflet** via **react-leaflet**. Sie zeigt:
- Deutschland-Karte (OSM / Satellite / Topo)
- Eroberte Territorien als GeoJSON-Polygone
- GPS-Routen als Polylinien

## Kachel-System (Tile Grid)

Jede Aktivität "erobert" Kacheln auf einem 0,01°-Raster (~1 km × 0,7 km):

```
GPS-Punkt (lat/lng)
        │
        ▼
latLngToTileKey()  →  "51.23,10.45"  (Kachel-Key)
        │
        ▼
tilesToGeoJson()   →  GeoJSON Polygon (4 Ecken der Kachel)
        │
        ▼
<GeoJSON data={...} />  →  Leaflet rendert das Polygon
```

**Kachel-Größe:**
```ts
const TILE_STEP = 0.01;           // 0,01° Grad
const TILE_AREA_KM2 = 0.81;       // ≈ 0,81 km²
```

**Aus GPS-Punkten Kacheln berechnen:**
```ts
// Alle Punkte einer Route → Set von Kachel-Keys
const tiles = getConqueredTiles(decodedPolyline);
// → Set { "51.23,10.45", "51.24,10.45", … }
```

## Polyline-Dekodierung

Strava liefert GPS-Tracks im Google Polyline Format (komprimiert). Die Funktion `decodePolyline()` wandelt sie in Koordinaten um:

```ts
import { decodePolyline } from "@/utils/geo";

const points = decodePolyline(activity.map.summary_polyline);
// → [[51.23, 10.45], [51.24, 10.46], …]
```

## react-leaflet Grundstruktur

```tsx
import { MapContainer, TileLayer, GeoJSON, Polyline } from "react-leaflet";

<MapContainer
  center={[51.1657, 10.4515]}   // Deutschland-Mitte
  zoom={6}
  minZoom={5}
  maxZoom={18}
>
  {/* Hintergrundkarte */}
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

  {/* Territorien (GeoJSON-Polygone) */}
  <GeoJSON
    data={geoJsonData}
    style={(feature) => ({
      fillColor: feature?.properties.color,
      fillOpacity: 0.35,
      weight: 1,
    })}
  />

  {/* GPS-Route */}
  <Polyline positions={routePoints} color="#FC4C02" weight={3} />
</MapContainer>
```

## Qualifying-Prüfung

Nicht jede Strava-Aktivität zählt für Territorien. Geprüft wird:

| Kriterium | Regel |
|-----------|-------|
| Sportart | Nur Rad-Typen (Ride, EBikeRide, GravelRide …) |
| Distanz | Mindestens 1 km |
| GPS | `start_latlng` muss vorhanden sein |
| Region | Startpunkt muss in Deutschland liegen |
| Polyline | GPS-Track muss mitgeliefert werden |

```ts
const result = checkQualifying(activity);
if (!result.qualifying) {
  console.log(result.reason); // z.B. "Außerhalb Deutschlands"
}
```

## Deutschland-Grenzen

```ts
const GERMANY_CENTER = [51.1657, 10.4515];
const GERMANY_BOUNDS = [[47.27, 5.87], [55.06, 15.04]];
```

Die Karte wird beim ersten Laden automatisch auf Deutschland gezoomt (`FitGermany`-Komponente). Wählt der Nutzer eine Route, springt die Karte automatisch zu ihr (`FitRoute`).
