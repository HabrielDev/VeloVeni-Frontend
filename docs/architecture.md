# Architektur

## Ordnerstruktur

```
src/
├── api/            # Alle HTTP-Aufrufe zum Backend
├── components/     # Wiederverwendbare UI-Teile (Navbar, ThemeSwitch …)
├── features/
│   ├── auth/       # Strava-Context: Token, Aktivitäten, State
│   └── theme/      # Hell/Dunkel-Theme Context
├── pages/          # Eine Datei pro Route (maps, rides, profile, leaderboard)
├── utils/          # Reine Hilfsfunktionen (Geo-Berechnungen, Formatierung)
├── App.tsx         # Routing + Provider-Stack
└── main.tsx        # React-Einstiegspunkt
```

## Schichtenmodell

```
┌─────────────────────────────────┐
│           Pages / UI            │  maps.tsx, rides.tsx, …
├─────────────────────────────────┤
│         Context / State         │  StravaProvider, ThemeProvider
├─────────────────────────────────┤
│           API Layer             │  src/api/backend.ts
├─────────────────────────────────┤
│         Utilities               │  src/utils/geo.ts
└─────────────────────────────────┘
         ↕  HTTP / JWT
┌─────────────────────────────────┐
│           Backend               │  NestJS REST API
└─────────────────────────────────┘
```

## Designprinzipien

**1. Pages konsumieren Context — nicht die API direkt**

Pages rufen niemals `fetch()` selbst auf. Sie nutzen den `useStrava()`-Hook:

```tsx
// ✅ So
function RidesPage() {
  const { activities, syncActivities } = useStrava();
  return <Button onPress={syncActivities}>Sync</Button>;
}

// ❌ Nicht so
function RidesPage() {
  const [data, setData] = useState([]);
  useEffect(() => { fetch("/activities").then(…) }, []);
}
```

**2. API-Calls nur in `src/api/`**

Alle `fetch`-Aufrufe stehen in `backend.ts` hinter benannten Funktionen:

```ts
// src/api/backend.ts
export async function syncActivities(jwt: string) {
  return apiFetch<{ synced: number }>("/activities/sync", jwt, { method: "POST" });
}
```

**3. Geo-Logik gehört in `utils/`**

Berechnungen wie Polyline-Dekodierung oder Kachel-Erzeugung stehen in `src/utils/geo.ts`, nicht in Komponenten.

**4. Leaflet-Instanzen nie im React-State**

Leaflet-Objekte werden über `useRef` gehalten, nie über `useState`:

```tsx
const popupRef = useRef<L.Popup | null>(null);
// popupRef.current = L.popup(…)  ✅
// useState(L.popup(…))           ❌
```
