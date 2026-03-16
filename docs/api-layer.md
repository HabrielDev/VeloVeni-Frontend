# API Layer

## Struktur

Alle HTTP-Aufrufe zum Backend stehen in `src/api/backend.ts` — nirgendwo sonst.

**Generischer Fetch-Wrapper:**
```ts
async function apiFetch<T>(path: string, jwt: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed (${res.status})`);
  return res.json();
}
```

Jeder Endpunkt ist eine benannte Funktion davor:

```ts
export const syncActivities = (jwt: string) =>
  apiFetch<{ synced: number }>("/activities/sync", jwt, { method: "POST" });

export const getActivities = (jwt: string) =>
  apiFetch<BackendActivity[]>("/activities", jwt);

export const getLeaderboard = (jwt: string) =>
  apiFetch<LeaderboardEntry[]>("/leaderboard", jwt);
```

## Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | `/auth/strava/callback` | OAuth-Code → JWT + Strava-Token |
| GET | `/auth/me` | Eigenes Profil |
| POST | `/activities/sync` | Aktivitäten von Strava laden |
| GET | `/activities` | Alle eigenen Aktivitäten |
| GET | `/activities/{id}/route` | GPS-Koordinaten einer Aktivität |
| GET | `/territories/me` | Eigene Kacheln |
| GET | `/territories/all` | Alle Territorien (global) |
| GET | `/territories/friends` | Freunde-Territorien |
| GET | `/leaderboard` | Globale Rangliste |
| GET | `/leaderboard/friends` | Freunde-Rangliste |
| PATCH | `/user/me/privacy` | Datenschutz-Einstellungen ändern |
| DELETE | `/auth/account` | Account löschen |

## Wichtige Datentypen

```ts
// Aktivität (erweitert mit Qualifying-Info)
interface BackendActivity {
  id: number;
  name: string;
  distance: number;           // Meter
  moving_time: number;        // Sekunden
  sport_type: string;
  map: { summary_polyline: string };
  qualifying: boolean;
  qualifying_reason?: string;
}

// Leaderboard-Eintrag
interface LeaderboardEntry {
  rank: number;
  userId: number;
  firstname: string;
  lastname: string;
  profilePicture: string;
  tileCount: number;
  areaKm2: number;
}

// Territorium
interface TerritoryData {
  userId: number;
  firstname?: string;
  color: string;
  tileCount: number;
  areaKm2: number;
  tiles: string[];            // ["51.23,10.45", …]
}
```

## Umgebungsvariablen

```
VITE_API_URL              # Backend-URL (default: http://localhost:3000)
VITE_STRAVA_CLIENT_ID     # Strava OAuth Client-ID (öffentlich)
```

> Das Strava Client **Secret** bleibt ausschließlich im Backend — nie im Frontend!
