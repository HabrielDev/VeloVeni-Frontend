const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface BackendAuthResponse {
  access_token: string; // JWT for backend API
  strava_access_token: string;
  strava_refresh_token: string;
  strava_expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
  };
}

export interface BackendActivity {
  id: number; // Strava activity ID
  name: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  sport_type: string;
  type: string;
  start_date_local: string;
  start_latlng: [number, number] | null;
  map: { summary_polyline: string };
  qualifying: boolean;
  qualifying_reason?: string;
}

export interface TerritoryData {
  userId: number;
  color: string;
  tileCount: number;
  areaKm2: number;
  tiles: string[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  firstname: string;
  lastname: string;
  profilePicture: string;
  tileCount: number;
  areaKm2: number;
  routeCount: number;
}

async function apiFetch<T>(path: string, jwt: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function stravaCallback(code: string): Promise<BackendAuthResponse> {
  const res = await fetch(`${API_URL}/auth/strava/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error('Backend auth failed');
  return res.json();
}

export async function getMe(jwt: string) {
  return apiFetch<{ id: number; firstname: string; lastname: string; profilePicture: string }>(
    '/auth/me',
    jwt,
  );
}

export async function syncActivities(jwt: string): Promise<{ synced: number }> {
  return apiFetch<{ synced: number }>('/activities/sync', jwt, { method: 'POST' });
}

export async function getActivities(jwt: string): Promise<BackendActivity[]> {
  return apiFetch<BackendActivity[]>('/activities', jwt);
}

export async function getActivityRoute(jwt: string, stravaActivityId: number): Promise<[number, number][]> {
  return apiFetch<[number, number][]>(`/activities/${stravaActivityId}/route`, jwt);
}

export async function getMyTerritories(jwt: string): Promise<TerritoryData> {
  return apiFetch<TerritoryData>('/territories/me', jwt);
}

export async function getAllTerritories(jwt: string): Promise<TerritoryData[]> {
  return apiFetch<TerritoryData[]>('/territories/all', jwt);
}

export async function getLeaderboard(jwt: string): Promise<LeaderboardEntry[]> {
  return apiFetch<LeaderboardEntry[]>('/leaderboard', jwt);
}

export async function deleteAccount(jwt: string): Promise<void> {
  await apiFetch<void>('/auth/account', jwt, { method: 'DELETE' });
}

export async function exportMyData(jwt: string): Promise<object> {
  return apiFetch<object>('/auth/export', jwt);
}
