import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import { stravaCallback } from '@/api/backend';
import { useStrava } from '@/features/auth/strava-context';
import type { StravaToken } from '@/api/strava';

export default function StravaCallback() {
  const { setBothTokens } = useStrava();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error || !code) {
      navigate('/maps');
      return;
    }

    stravaCallback(code)
      .then((data) => {
        const stravaToken: StravaToken = {
          access_token: data.strava_access_token,
          refresh_token: data.strava_refresh_token,
          expires_at: data.strava_expires_at,
          athlete: data.athlete,
        };
        setBothTokens(data.access_token, stravaToken);
        navigate('/maps');
      })
      .catch(() => navigate('/maps'));
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] items-center justify-center">
      <Spinner size="lg" label="Verbinde mit Strava..." />
    </div>
  );
}
