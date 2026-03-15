import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Chip, Spinner } from '@heroui/react';
import {
  Bike,
  Activity,
  Clock,
  TrendingUp,
  Ruler,
  MapPin,
  RefreshCw,
  BarChart2,
} from 'lucide-react';
import { getAuthUrl } from '@/api/strava';
import { useStrava } from '@/features/auth/strava-context';
import type { StravaActivity } from '@/api/strava';
import { checkQualifying } from '@/utils/geo';

const CYCLING_TYPES = ['Ride', 'EBikeRide', 'VirtualRide', 'GravelRide', 'MountainBikeRide'];
const RUN_TYPES = ['Run', 'VirtualRun', 'TrailRun'];

function fmtDistance(m: number) {
  return `${(m / 1000).toFixed(1)} km`;
}
function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${min}min` : `${min}min`;
}
function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type Filter = 'all' | 'qualifying' | 'cycling' | 'running' | 'other';

function getFilter(activity: StravaActivity): Exclude<Filter, 'all' | 'qualifying'> {
  const t = activity.sport_type ?? activity.type;
  if (CYCLING_TYPES.includes(t)) return 'cycling';
  if (RUN_TYPES.includes(t)) return 'running';
  return 'other';
}

function ActivityCard({
  activity,
  onShowOnMap,
}: {
  activity: StravaActivity;
  onShowOnMap: () => void;
}) {
  const filter = getFilter(activity);
  const hasGps = Array.isArray(activity.start_latlng) && activity.start_latlng.length > 0;
  const qualifying = activity.qualifying ?? checkQualifying(activity).qualifying;
  const qualifyingReason = activity.qualifying_reason ?? checkQualifying(activity).reason;

  return (
    <Card className="hover:shadow-large transition-all duration-200 hover:-translate-y-0.5">
      <CardBody className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`shrink-0 p-1.5 rounded-lg ${
                filter === 'cycling'
                  ? 'bg-[#FC4C02]/10 text-[#FC4C02]'
                  : 'bg-default-100 text-default-500'
              }`}
            >
              {filter === 'cycling' ? <Bike size={16} /> : <Activity size={16} />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{activity.name}</p>
              <p className="text-xs text-default-400">{fmtDate(activity.start_date_local)}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Chip
              size="sm"
              variant="flat"
              color={filter === 'cycling' ? 'warning' : 'default'}
            >
              {activity.sport_type ?? activity.type}
            </Chip>
            <Chip
              size="sm"
              variant="dot"
              color={qualifying ? 'success' : 'default'}
              title={qualifying ? 'Qualifiziert für das Spiel' : (qualifyingReason ?? 'Nicht qualifiziert')}
            >
              {qualifying ? 'Qualifiziert' : 'Kein Spiel'}
            </Chip>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="flex flex-col items-center p-2 rounded-lg bg-content2">
            <Ruler size={14} className="text-default-400 mb-0.5" />
            <span className="text-xs font-semibold">{fmtDistance(activity.distance)}</span>
            <span className="text-xs text-default-400">Distanz</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-content2">
            <Clock size={14} className="text-default-400 mb-0.5" />
            <span className="text-xs font-semibold">{fmtDuration(activity.moving_time)}</span>
            <span className="text-xs text-default-400">Zeit</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-content2">
            <TrendingUp size={14} className="text-default-400 mb-0.5" />
            <span className="text-xs font-semibold">
              {Math.round(activity.total_elevation_gain)}m
            </span>
            <span className="text-xs text-default-400">Höhenmeter</span>
          </div>
        </div>

        {/* Action */}
        {hasGps && (
          <Button
            size="sm"
            variant="flat"
            color="primary"
            fullWidth
            startContent={<MapPin size={14} />}
            onPress={onShowOnMap}
          >
            Auf Karte anzeigen
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

export default function RidesPage() {
  const { jwtToken, activities, activitiesLoading, syncActivities, selectActivity } = useStrava();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = activities.filter((a) => {
    if (filter === 'qualifying') return a.qualifying ?? checkQualifying(a).qualifying;
    if (filter === 'all') return true;
    return getFilter(a) === filter;
  });

  const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
  const totalElevation = activities.reduce((sum, a) => sum + a.total_elevation_gain, 0);
  const totalTime = activities.reduce((sum, a) => sum + a.moving_time, 0);
  const cyclingCount = activities.filter((a) => getFilter(a) === 'cycling').length;

  const handleShowOnMap = async (activity: StravaActivity) => {
    await selectActivity(activity.id);
    navigate('/maps');
  };

  const qualifyingCount = activities.filter(
    (a) => a.qualifying ?? checkQualifying(a).qualifying,
  ).length;

  const FILTERS: { key: Filter; label: string; count?: number; highlight?: boolean }[] = [
    { key: 'all', label: 'Alle' },
    { key: 'qualifying', label: 'Spielwürdig', count: qualifyingCount, highlight: true },
    { key: 'cycling', label: 'Rad' },
    { key: 'running', label: 'Lauf' },
    { key: 'other', label: 'Sonstige' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Meine <span className="text-primary">Aktivitäten</span>
          </h1>
          <p className="text-sm text-default-400 mt-0.5">Übersicht aller Strava-Aktivitäten</p>
        </div>
        {jwtToken && (
          <Button
            size="sm"
            variant="flat"
            onPress={syncActivities}
            isLoading={activitiesLoading}
            startContent={!activitiesLoading && <RefreshCw size={14} />}
          >
            Synchronisieren
          </Button>
        )}
      </div>

      {/* Not connected */}
      {!jwtToken && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="w-16 h-16 bg-[#FC4C02] rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white font-extrabold text-2xl">S</span>
          </div>
          <div>
            <p className="font-semibold">Mit Strava verbinden</p>
            <p className="text-sm text-default-400 mt-1">
              Verbinde deinen Strava-Account, um deine Aktivitäten zu sehen.
            </p>
          </div>
          <Button as="a" href={getAuthUrl()} className="bg-[#FC4C02] text-white font-semibold">
            Mit Strava verbinden
          </Button>
        </div>
      )}

      {/* Connected, no activities loaded */}
      {jwtToken && activities.length === 0 && !activitiesLoading && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <BarChart2 size={40} className="text-default-300" />
          <div>
            <p className="font-semibold">Keine Aktivitäten geladen</p>
            <p className="text-sm text-default-400 mt-1">
              Lade deine Aktivitäten, um sie hier zu sehen.
            </p>
          </div>
          <Button
            variant="flat"
            color="primary"
            onPress={syncActivities}
            startContent={<RefreshCw size={16} />}
          >
            Aktivitäten synchronisieren
          </Button>
        </div>
      )}

      {/* Loading */}
      {activitiesLoading && activities.length === 0 && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" label="Aktivitäten werden geladen..." />
        </div>
      )}

      {/* Stats + grid */}
      {activities.length > 0 && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              {
                icon: <Bike size={20} />,
                value: cyclingCount,
                label: 'Radtouren',
                color: 'text-[#FC4C02]',
                bg: 'bg-[#FC4C02]/10',
              },
              {
                icon: <Ruler size={20} />,
                value: fmtDistance(totalDistance),
                label: 'Gesamtstrecke',
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                icon: <TrendingUp size={20} />,
                value: `${Math.round(totalElevation / 1000).toLocaleString('de-DE')}km`,
                label: 'Höhenmeter',
                color: 'text-success',
                bg: 'bg-success/10',
              },
              {
                icon: <Clock size={20} />,
                value: fmtDuration(totalTime),
                label: 'Gesamtzeit',
                color: 'text-secondary',
                bg: 'bg-secondary/10',
              },
            ].map(({ icon, value, label, color, bg }) => (
              <Card key={label}>
                <CardBody className="flex flex-row items-center gap-3 p-4">
                  <div className={`p-2.5 rounded-xl ${bg} ${color}`}>{icon}</div>
                  <div>
                    <p className="font-bold text-lg leading-tight">{value}</p>
                    <p className="text-xs text-default-400">{label}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Filter */}
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            {FILTERS.map(({ key, label, count, highlight }) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? 'solid' : 'flat'}
                color={filter === key ? (highlight ? 'success' : 'primary') : 'default'}
                onPress={() => setFilter(key)}
                className={filter !== key && highlight ? 'border border-success/40 text-success' : ''}
              >
                {label}
                {count !== undefined && (
                  <span className="ml-1 opacity-70">({count})</span>
                )}
                {count === undefined && key !== 'all' && (
                  <span className="ml-1 opacity-60">
                    ({activities.filter((a) => getFilter(a) === key).length})
                  </span>
                )}
              </Button>
            ))}
            <span className="ml-auto text-xs text-default-400 self-center">
              {filtered.length} Aktivitäten
            </span>
          </div>

          {/* Activity grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-default-400">
              <Activity size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Keine Aktivitäten in dieser Kategorie</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((a) => (
                <ActivityCard key={a.id} activity={a} onShowOnMap={() => handleShowOnMap(a)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
