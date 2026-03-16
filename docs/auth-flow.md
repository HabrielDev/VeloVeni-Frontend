# Authentifizierung — Strava OAuth2 + JWT

## Ablauf

```
Browser                    Backend                    Strava
  │                           │                          │
  │── Klick "Mit Strava" ─────────────────────────────>│
  │<── redirect mit code ─────────────────────────────│
  │                           │                          │
  │── POST /auth/strava/callback { code } ──────────>│
  │                           │── code exchange ──────>│
  │                           │<── access_token ───────│
  │                           │── User in DB speichern  │
  │                           │── JWT generieren        │
  │<── { jwt, stravaToken } ──│                          │
  │                           │                          │
  │── alle weiteren Requests mit Bearer JWT ──────────>│
```

## State (StravaContext)

Der gesamte Auth-State lebt in `StravaProvider` (`src/features/auth/strava-context.tsx`):

```ts
interface StravaContextType {
  jwtToken: string | null;          // Backend JWT für API-Requests
  token: StravaToken | null;        // Strava-Token + Athlete-Info
  backendUserId: number | null;     // User-ID aus /auth/me
  activities: StravaActivity[];     // Geladene Aktivitäten
  activeRoute: [number, number][];  // GPS-Punkte der gewählten Route
}
```

## Token-Persistenz

Tokens werden in `localStorage` gespeichert und beim App-Start wiederhergestellt:

```ts
// Speichern
localStorage.setItem("jwt_token", jwt);
localStorage.setItem("strava_token", JSON.stringify(stravaToken));

// Lesen (beim Mount)
const saved = localStorage.getItem("jwt_token");
if (saved) setJwtToken(saved);
```

## Hook-Verwendung in Komponenten

```tsx
import { useStrava } from "@/features/auth/strava-context";

function ProfilePage() {
  const { token, jwtToken, disconnect } = useStrava();

  if (!jwtToken) return <p>Nicht eingeloggt</p>;

  return (
    <div>
      <p>Hallo, {token?.athlete.firstname}!</p>
      <Button onPress={disconnect}>Abmelden</Button>
    </div>
  );
}
```

## OAuth-Redirect URL

Die Strava-OAuth-URL wird in `src/api/strava.ts` aufgebaut:

```ts
export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
    response_type: "code",
    redirect_uri: `${window.location.origin}/strava/callback`,
    scope: "read,activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}
```
