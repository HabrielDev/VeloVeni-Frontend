import { useEffect, useState } from 'react';
import { Avatar, Card, CardBody, Chip, Spinner } from '@heroui/react';
import { Trophy, Map, Route, Ruler } from 'lucide-react';
import { useStrava } from '@/features/auth/strava-context';
import { getLeaderboard } from '@/api/backend';
import type { LeaderboardEntry } from '@/api/backend';
import { getAuthUrl } from '@/api/strava';
import { Button } from '@heroui/react';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardPage() {
  const { jwtToken, token } = useStrava();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jwtToken) return;
    setLoading(true);
    setError(null);
    getLeaderboard(jwtToken)
      .then(setEntries)
      .catch(() => setError('Leaderboard konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [jwtToken]);

  if (!jwtToken) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 bg-[#FC4C02] rounded-full flex items-center justify-center shadow-xl">
          <Trophy className="text-white w-9 h-9" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Leaderboard</h1>
          <p className="text-default-400 text-sm leading-relaxed">
            Verbinde deinen Strava-Account, um das Leaderboard zu sehen.
          </p>
        </div>
        <Button as="a" href={getAuthUrl()} size="lg" className="bg-[#FC4C02] text-white font-semibold px-8">
          Mit Strava verbinden
        </Button>
      </div>
    );
  }

  const myStravaId = token?.athlete.id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Leader<span className="text-primary">board</span>
        </h1>
        <p className="text-sm text-default-400 mt-0.5">Rangliste nach eroberten Feldern</p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Lade Rangliste..." />
        </div>
      )}

      {error && (
        <Card>
          <CardBody className="p-6 text-center text-danger text-sm">{error}</CardBody>
        </Card>
      )}

      {!loading && !error && entries.length === 0 && (
        <Card>
          <CardBody className="p-10 text-center flex flex-col items-center gap-3">
            <Trophy size={36} className="text-default-300" />
            <p className="text-sm text-default-400">Noch keine Einträge vorhanden.</p>
          </CardBody>
        </Card>
      )}

      {!loading && entries.length > 0 && (
        <>
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <div className="grid grid-cols-3 gap-3">
              {[entries[1], entries[0], entries[2]].map((e, i) => {
                const order = [2, 1, 3][i];
                const isMe = e.userId === myStravaId;
                return (
                  <Card key={e.userId} className={`${isMe ? 'ring-2 ring-primary' : ''}`}>
                    <CardBody className={`p-4 flex flex-col items-center gap-2 text-center ${order === 1 ? 'pt-6' : 'pt-4'}`}>
                      <span className="text-2xl">{MEDAL[order]}</span>
                      <Avatar src={e.profilePicture} name={e.firstname} className="w-12 h-12" />
                      <div>
                        <p className="text-sm font-semibold truncate max-w-[100px]">
                          {e.firstname} {e.lastname.charAt(0)}.
                        </p>
                        <p className="text-xs text-default-400 mt-0.5">{e.tileCount} Felder</p>
                      </div>
                      {isMe && <Chip size="sm" color="primary" variant="flat">Du</Chip>}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Full ranked list */}
          <Card>
            <CardBody className="p-0">
              {entries.map((e, idx) => {
                const isMe = e.userId === myStravaId;
                return (
                  <div
                    key={e.userId}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-divider last:border-0 transition-colors ${
                      isMe ? 'bg-primary/5' : idx % 2 === 0 ? '' : 'bg-content2/40'
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center shrink-0">
                      {MEDAL[e.rank] ? (
                        <span className="text-lg">{MEDAL[e.rank]}</span>
                      ) : (
                        <span className="text-sm font-bold text-default-400">#{e.rank}</span>
                      )}
                    </div>

                    {/* Avatar + name */}
                    <Avatar src={e.profilePicture} name={e.firstname} size="sm" className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isMe ? 'text-primary' : ''}`}>
                        {e.firstname} {e.lastname}
                        {isMe && <span className="ml-1.5 text-xs font-normal text-primary/70">(Du)</span>}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4 text-xs text-default-500 shrink-0">
                      <span className="flex items-center gap-1">
                        <Map size={12} />{e.tileCount} Felder
                      </span>
                      <span className="flex items-center gap-1">
                        <Ruler size={12} />{e.areaKm2.toFixed(0)} km²
                      </span>
                      <span className="flex items-center gap-1">
                        <Route size={12} />{e.routeCount} Routen
                      </span>
                    </div>
                    <div className="sm:hidden text-right shrink-0">
                      <p className="text-sm font-bold text-[#FC4C02]">{e.tileCount}</p>
                      <p className="text-xs text-default-400">Felder</p>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
