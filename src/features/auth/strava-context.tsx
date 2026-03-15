import { createContext, useContext, useState, ReactNode } from 'react';
import { StravaToken, StravaActivity } from '@/api/strava';
import {
  syncActivities as apiSync,
  getActivities,
  getActivityRoute,
} from '@/api/backend';

interface StravaContextType {
  jwtToken: string | null;
  token: StravaToken | null;  // athlete display info
  activities: StravaActivity[];
  activeRoute: [number, number][];
  activeActivityId: number | null;
  activitiesLoading: boolean;
  routeLoading: boolean;
  setBothTokens: (jwt: string, stravaToken: StravaToken) => void;
  loadActivities: () => Promise<void>;
  syncActivities: () => Promise<void>;
  selectActivity: (id: number) => Promise<void>;
  disconnect: () => void;
}

const StravaCtx = createContext<StravaContextType | null>(null);

export function StravaProvider({ children }: { children: ReactNode }) {
  const [jwtToken, setJwtToken] = useState<string | null>(
    () => localStorage.getItem('jwt_token'),
  );
  const [token, setTokenState] = useState<StravaToken | null>(() => {
    try {
      const s = localStorage.getItem('strava_token');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [activeRoute, setActiveRoute] = useState<[number, number][]>([]);
  const [activeActivityId, setActiveActivityId] = useState<number | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  const setBothTokens = (jwt: string, stravaToken: StravaToken) => {
    setJwtToken(jwt);
    setTokenState(stravaToken);
    localStorage.setItem('jwt_token', jwt);
    localStorage.setItem('strava_token', JSON.stringify(stravaToken));
  };

  const loadActivities = async () => {
    if (!jwtToken) return;
    setActivitiesLoading(true);
    try {
      const data = await getActivities(jwtToken);
      setActivities(data as StravaActivity[]);
    } catch (e) {
      console.error('Failed to load activities:', e);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const syncActivities = async () => {
    if (!jwtToken) return;
    setActivitiesLoading(true);
    try {
      await apiSync(jwtToken);
      await loadActivities();
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const selectActivity = async (id: number) => {
    if (!jwtToken) return;
    if (activeActivityId === id) {
      setActiveRoute([]);
      setActiveActivityId(null);
      return;
    }
    setRouteLoading(true);
    setActiveActivityId(id);
    try {
      const positions = await getActivityRoute(jwtToken, id);
      setActiveRoute(positions);
      if (positions.length === 0) setActiveActivityId(null);
    } catch (e) {
      console.error('Failed to load route:', e);
      setActiveRoute([]);
      setActiveActivityId(null);
    } finally {
      setRouteLoading(false);
    }
  };

  const disconnect = () => {
    setJwtToken(null);
    setTokenState(null);
    setActivities([]);
    setActiveRoute([]);
    setActiveActivityId(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('strava_token');
  };

  return (
    <StravaCtx.Provider
      value={{
        jwtToken,
        token,
        activities,
        activeRoute,
        activeActivityId,
        activitiesLoading,
        routeLoading,
        setBothTokens,
        loadActivities,
        syncActivities,
        selectActivity,
        disconnect,
      }}
    >
      {children}
    </StravaCtx.Provider>
  );
}

export function useStrava() {
  const ctx = useContext(StravaCtx);
  if (!ctx) throw new Error('useStrava must be used within StravaProvider');
  return ctx;
}
