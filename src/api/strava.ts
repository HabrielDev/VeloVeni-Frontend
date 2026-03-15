const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID as string;

export interface StravaToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: StravaAthlete;
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  sport_type: string;
  type: string;
  start_date_local: string;
  start_latlng: [number, number] | null;
  map: { summary_polyline: string };
  qualifying?: boolean;
  qualifying_reason?: string | null;
}

/** OAuth URL — redirects user to Strava (CLIENT_ID is public, no secret needed) */
export function getAuthUrl(): string {
  const redirectUri = `${window.location.origin}/strava/callback`;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'activity:read_all',
    approval_prompt: 'auto',
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}
