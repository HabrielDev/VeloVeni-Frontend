// ─── Germany bounds ───────────────────────────────────────────────────────────
export const GERMANY_CENTER: [number, number] = [51.1657, 10.4515];
export const GERMANY_BOUNDS: [[number, number], [number, number]] = [
  [47.27, 5.87],
  [55.06, 15.04],
];
// slightly padded for the map view
export const GERMANY_MAP_BOUNDS: [[number, number], [number, number]] = [
  [46.8, 5.0],
  [55.5, 16.0],
];

export function isPointInGermany(lat: number, lng: number): boolean {
  return lat >= 47.27 && lat <= 55.06 && lng >= 5.87 && lng <= 15.04;
}

// ─── Qualifying criteria ──────────────────────────────────────────────────────
export const QUALIFYING_SPORT_TYPES = [
  'Ride',
  'EBikeRide',
  'GravelRide',
  'MountainBikeRide',
  'Handcycle',
  'Velomobile',
];

export interface QualifyingResult {
  qualifying: boolean;
  reason?: string;
}

export function checkQualifying(activity: {
  sport_type?: string;
  type?: string;
  distance: number;
  start_latlng: [number, number] | null;
  map?: { summary_polyline?: string };
}): QualifyingResult {
  const sportType = activity.sport_type ?? activity.type ?? '';

  if (!QUALIFYING_SPORT_TYPES.includes(sportType)) {
    return { qualifying: false, reason: 'Kein Rad-Sport' };
  }
  if (!Array.isArray(activity.start_latlng) || activity.start_latlng.length < 2) {
    return { qualifying: false, reason: 'Kein GPS' };
  }
  if (activity.distance < 1000) {
    return { qualifying: false, reason: 'Zu kurz (< 1 km)' };
  }
  if (!isPointInGermany(activity.start_latlng[0], activity.start_latlng[1])) {
    return { qualifying: false, reason: 'Außerhalb Deutschlands' };
  }
  if (!activity.map?.summary_polyline) {
    return { qualifying: false, reason: 'Kein GPS-Track' };
  }
  return { qualifying: true };
}

// ─── Google Polyline decoder (Strava format) ───────────────────────────────────
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// ─── Tile / Grid system ────────────────────────────────────────────────────────
// Grid resolution: 0.01° ≈ 1.1 km (lat) × 0.7 km (lng) at Germany's latitude
export const TILE_STEP = 0.01;
// Area per tile: approximately 0.01° × 111 km × 0.01° × 73 km ≈ 0.81 km²
export const TILE_AREA_KM2 = TILE_STEP * 111 * TILE_STEP * 73;

export function latLngToTileKey(lat: number, lng: number): string {
  const tLat = (Math.floor(lat / TILE_STEP) * TILE_STEP).toFixed(2);
  const tLng = (Math.floor(lng / TILE_STEP) * TILE_STEP).toFixed(2);
  return `${tLat},${tLng}`;
}

export function tileKeyToBounds(key: string): [[number, number], [number, number]] {
  const [lat, lng] = key.split(',').map(Number);
  return [
    [lat, lng],
    [lat + TILE_STEP, lng + TILE_STEP],
  ];
}

export function getConqueredTiles(points: [number, number][]): Set<string> {
  const tiles = new Set<string>();
  for (const [lat, lng] of points) {
    if (isPointInGermany(lat, lng)) {
      tiles.add(latLngToTileKey(lat, lng));
    }
  }
  return tiles;
}

// ─── Territory GeoJSON builder ────────────────────────────────────────────────
export function tilesToGeoJson(tiles: string[]) {
  return {
    type: 'FeatureCollection' as const,
    features: tiles.map((key) => {
      const [[lat1, lng1], [lat2, lng2]] = tileKeyToBounds(key);
      return {
        type: 'Feature' as const,
        properties: { key },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [lng1, lat1],
              [lng2, lat1],
              [lng2, lat2],
              [lng1, lat2],
              [lng1, lat1],
            ],
          ],
        },
      };
    }),
  };
}
