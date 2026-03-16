# Tech Stack

## Kernframework

| Technologie | Version | Zweck |
|-------------|---------|-------|
| **React** | 18.3 | UI-Framework, Komponentenbaum |
| **TypeScript** | 5.6 | Typsicherheit (Strict Mode) |
| **Vite** | 6.4 | Build-Tool & Dev-Server |

## UI & Styling

| Technologie | Version | Zweck |
|-------------|---------|-------|
| **HeroUI** | 2.8 | Fertige UI-Komponenten (Button, Card, Modal …) |
| **Tailwind CSS** | 4.1 | Utility-First CSS |
| **Framer Motion** | 11 | Animationen |
| **Lucide React** | 0.577 | Icon-Bibliothek |

## Karte & Geo

| Technologie | Version | Zweck |
|-------------|---------|-------|
| **Leaflet** | 1.9 | Interaktive Karte |
| **react-leaflet** | 4.2 | React-Wrapper für Leaflet |

## Routing & Auth

| Technologie | Version | Zweck |
|-------------|---------|-------|
| **React Router** | 6.30 | Client-Side Routing |
| **Strava OAuth2** | — | Login via Strava |
| **JWT** | — | Session-Token vom Backend |

---

## Wie die Technologien zusammenspielen

### React + HeroUI + Tailwind

HeroUI-Komponenten werden direkt in JSX verwendet, Tailwind ergänzt feines Layout-Tuning:

```tsx
import { Button, Card, CardBody } from "@heroui/react";

function ActivityCard({ name, distance }: { name: string; distance: number }) {
  return (
    <Card className="mb-2">
      <CardBody className="flex flex-row justify-between items-center">
        <span>{name}</span>
        <Button size="sm" color="primary">
          {(distance / 1000).toFixed(1)} km
        </Button>
      </CardBody>
    </Card>
  );
}
```

### Vite + TypeScript

Vite liefert schnelle Hot Module Replacement (HMR). `import.meta.env` gibt Zugriff auf Umgebungsvariablen:

```ts
// Typsicher über vite-env.d.ts
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
```

### React Router + Context

Routen werden in `App.tsx` definiert. Provider wrappen den gesamten Routenbaum, sodass Auth-State in jeder Seite verfügbar ist:

```tsx
<BrowserRouter>
  <HeroUIProvider>
    <ThemeProvider>
      <StravaProvider>          {/* Auth-State global verfügbar */}
        <Routes>
          <Route path="/maps" element={<MapsPage />} />
          <Route path="/rides" element={<RidesPage />} />
        </Routes>
      </StravaProvider>
    </ThemeProvider>
  </HeroUIProvider>
</BrowserRouter>
```
