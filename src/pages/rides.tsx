import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Button, Card, CardBody, Chip, Spinner } from "@heroui/react";
import {
  Bike,
  Activity,
  Clock,
  TrendingUp,
  Ruler,
  RefreshCw,
  BarChart2,
  X,
  Zap,
  SortAsc,
  SortDesc,
  Calendar,
  ChevronDown,
  ChevronUp,
  Wind,
  Mountain,
} from "lucide-react";

import { getAuthUrl } from "@/api/strava";
import { useStrava } from "@/features/auth/strava-context";

import type { StravaActivity } from "@/api/strava";

import { checkQualifying, decodePolyline } from "@/utils/geo";

// ─── Leaflet icon fix ──────────────────────────────────────────────────────────
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// ─── Constants ────────────────────────────────────────────────────────────────
const CYCLING_TYPES = [
  "Ride",
  "EBikeRide",
  "VirtualRide",
  "GravelRide",
  "MountainBikeRide",
  "Handcycle",
  "Velomobile",
];
const RUN_TYPES = ["Run", "VirtualRun", "TrailRun"];

// ─── Types ────────────────────────────────────────────────────────────────────
type ActivityFilter = "all" | "qualifying" | "cycling" | "running" | "other";
type DatePreset = "all" | "7d" | "30d" | "3m" | "1y" | "custom";
type SortField = "date" | "distance" | "duration" | "elevation";
type SortDir = "desc" | "asc";

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmtDist = (m: number) => `${(m / 1000).toFixed(1)} km`;
const fmtTime = (s: number) => {
  const h = Math.floor(s / 3600),
    min = Math.floor((s % 3600) / 60);

  return h > 0 ? `${h}h ${min}min` : `${min}min`;
};
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
const fmtDateFull = (d: string) =>
  new Date(d).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
const fmtSpeed = (distM: number, timeS: number) => `${((distM / timeS) * 3.6).toFixed(1)} km/h`;
const fmtPace = (distM: number, timeS: number) => {
  const secPerKm = timeS / (distM / 1000);
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);

  return `${min}:${sec.toString().padStart(2, "0")} min/km`;
};

function getActivityCategory(a: StravaActivity): Exclude<ActivityFilter, "all" | "qualifying"> {
  const t = a.sport_type ?? a.type;

  if (CYCLING_TYPES.includes(t)) return "cycling";
  if (RUN_TYPES.includes(t)) return "running";

  return "other";
}

function presetToRange(preset: DatePreset): { from: Date; to: Date } | null {
  if (preset === "all" || preset === "custom") return null;
  const to = new Date();
  const from = new Date();

  if (preset === "7d") from.setDate(from.getDate() - 7);
  else if (preset === "30d") from.setDate(from.getDate() - 30);
  else if (preset === "3m") from.setMonth(from.getMonth() - 3);
  else if (preset === "1y") from.setFullYear(from.getFullYear() - 1);

  return { from, to };
}

// ─── Map component: fit bounds to route ───────────────────────────────────────
function FitRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    }
  }, [positions, map]);

  return null;
}

// ─── Activity detail modal ─────────────────────────────────────────────────────
function ActivityModal({ activity, onClose }: { activity: StravaActivity; onClose: () => void }) {
  const category = getActivityCategory(activity);
  const qualifying = activity.qualifying ?? checkQualifying(activity).qualifying;
  const hasPolyline = !!activity.map?.summary_polyline;
  const positions = useMemo(
    () => (hasPolyline ? decodePolyline(activity.map.summary_polyline) : []),
    [activity],
  );
  const isCycling = category === "cycling";

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const stats = [
    { icon: <Ruler size={15} />, label: "Distanz", value: fmtDist(activity.distance) },
    { icon: <Clock size={15} />, label: "Bewegungszeit", value: fmtTime(activity.moving_time) },
    {
      icon: <Mountain size={15} />,
      label: "Höhenmeter",
      value: `${Math.round(activity.total_elevation_gain)} m`,
    },
    isCycling
      ? {
          icon: <Zap size={15} />,
          label: "Ø Geschwindigkeit",
          value: fmtSpeed(activity.distance, activity.moving_time),
        }
      : {
          icon: <Wind size={15} />,
          label: "Ø Pace",
          value: fmtPace(activity.distance, activity.moving_time),
        },
  ];

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-content1 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-6xl h-[95dvh] sm:max-h-[94vh] sm:h-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-divider shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2 rounded-xl shrink-0 ${isCycling ? "bg-[#FC4C02]/10 text-[#FC4C02]" : "bg-default-100 text-default-500"}`}
            >
              {isCycling ? <Bike size={20} /> : <Activity size={20} />}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base truncate">{activity.name}</h2>
              <p className="text-xs text-default-400">{fmtDateFull(activity.start_date_local)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Chip
              className="hidden sm:flex"
              color={isCycling ? "warning" : "default"}
              size="sm"
              variant="flat"
            >
              {activity.sport_type ?? activity.type}
            </Chip>
            <Chip color={qualifying ? "success" : "default"} size="sm" variant="dot">
              {qualifying ? "Spielwürdig" : "Kein Spiel"}
            </Chip>
            <Button isIconOnly size="sm" variant="light" onPress={onClose}>
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Body: map + stats */}
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {/* Map */}
          <div className="flex-1 min-h-[40dvh] md:min-h-0 bg-content2">
            {hasPolyline ? (
              <MapContainer
                scrollWheelZoom
                zoomControl
                center={[51.1657, 10.4515]}
                style={{ height: "100%", width: "100%", minHeight: "40dvh" }}
                zoom={10}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polyline color="#FC4C02" opacity={0.9} positions={positions} weight={4} />
                <FitRoute positions={positions} />
              </MapContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-default-400 gap-2">
                <Activity className="opacity-30" size={36} />
                <p className="text-sm">Kein GPS-Track verfügbar</p>
              </div>
            )}
          </div>

          {/* Stats panel */}
          <div className="w-full md:w-80 shrink-0 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto border-t md:border-t-0 md:border-l border-divider">
            {/* Key stats */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-default-400 mb-3">
                Statistiken
              </p>
              <div className="grid grid-cols-2 gap-2">
                {stats.map(({ icon, label, value }) => (
                  <div key={label} className="p-3 rounded-xl bg-content2 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-default-400">
                      {icon}
                      <span className="text-[10px] uppercase tracking-wide font-semibold">
                        {label}
                      </span>
                    </div>
                    <p className="font-bold text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional info */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-default-400 mb-3">
                Details
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Aktivitätstyp", value: activity.sport_type ?? activity.type },
                  { label: "Datum", value: fmtDate(activity.start_date_local) },
                  ...(activity.start_latlng
                    ? [
                        {
                          label: "Startpunkt",
                          value: `${activity.start_latlng[0].toFixed(4)}°, ${activity.start_latlng[1].toFixed(4)}°`,
                        },
                      ]
                    : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-default-400 shrink-0">{label}</span>
                    <span className="text-xs font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Qualifying info */}
            {!qualifying && (
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-xs font-semibold text-warning mb-1">Nicht spielwürdig</p>
                <p className="text-xs text-default-500">
                  {activity.qualifying_reason ??
                    checkQualifying(activity).reason ??
                    "Kriterien nicht erfüllt"}
                </p>
              </div>
            )}
            {qualifying && (
              <div className="p-3 rounded-xl bg-success/10 border border-success/20">
                <p className="text-xs font-semibold text-success">Spielwürdig ✓</p>
                <p className="text-xs text-default-500 mt-0.5">
                  Diese Aktivität zählt für die Gebietskarte.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Activity card ─────────────────────────────────────────────────────────────
function ActivityCard({ activity, onClick }: { activity: StravaActivity; onClick: () => void }) {
  const category = getActivityCategory(activity);
  const qualifying = activity.qualifying ?? checkQualifying(activity).qualifying;
  const isCycling = category === "cycling";

  return (
    <Card
      isPressable
      className="hover:shadow-large transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      onPress={onClick}
    >
      <CardBody className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`shrink-0 p-1.5 rounded-lg ${isCycling ? "bg-[#FC4C02]/10 text-[#FC4C02]" : "bg-default-100 text-default-500"}`}
            >
              {isCycling ? <Bike size={15} /> : <Activity size={15} />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{activity.name}</p>
              <p className="text-xs text-default-400">{fmtDate(activity.start_date_local)}</p>
            </div>
          </div>
          <div
            className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${qualifying ? "bg-success" : "bg-default-300"}`}
            title={qualifying ? "Spielwürdig" : "Nicht spielwürdig"}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 rounded-lg bg-content2">
            <Ruler className="text-default-400 mb-0.5" size={12} />
            <span className="text-xs font-semibold">{fmtDist(activity.distance)}</span>
            <span className="text-[10px] text-default-400">Distanz</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-content2">
            <Clock className="text-default-400 mb-0.5" size={12} />
            <span className="text-xs font-semibold">{fmtTime(activity.moving_time)}</span>
            <span className="text-[10px] text-default-400">Zeit</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-content2">
            <TrendingUp className="text-default-400 mb-0.5" size={12} />
            <span className="text-xs font-semibold">
              {Math.round(activity.total_elevation_gain)}m
            </span>
            <span className="text-[10px] text-default-400">Höhe</span>
          </div>
        </div>

        {/* Speed/pace hint */}
        <div className="mt-2 text-[10px] text-default-400 text-right">
          {isCycling
            ? fmtSpeed(activity.distance, activity.moving_time)
            : fmtPace(activity.distance, activity.moving_time)}
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Sort button ───────────────────────────────────────────────────────────────
function SortButton({
  field,
  label,
  current,
  dir,
  onClick,
}: {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onClick: () => void;
}) {
  const active = current === field;

  return (
    <button
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-content2 text-default-500 hover:bg-content3"
      }`}
      onClick={onClick}
    >
      {label}
      {active ? dir === "desc" ? <SortDesc size={11} /> : <SortAsc size={11} /> : null}
    </button>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function RidesPage() {
  const { jwtToken, activities, activitiesLoading, syncActivities } = useStrava();

  // Filters
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDateCustom, setShowDateCustom] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Detail modal
  const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...activities];

    // Activity type filter
    if (activityFilter === "qualifying")
      list = list.filter((a) => a.qualifying ?? checkQualifying(a).qualifying);
    else if (activityFilter !== "all")
      list = list.filter((a) => getActivityCategory(a) === activityFilter);

    // Date filter
    let range = presetToRange(datePreset);

    if (datePreset === "custom" && customFrom && customTo) {
      range = { from: new Date(customFrom), to: new Date(customTo + "T23:59:59") };
    }
    if (range) {
      list = list.filter((a) => {
        const d = new Date(a.start_date_local);

        return d >= range!.from && d <= range!.to;
      });
    }

    // Sort
    list.sort((a, b) => {
      let va = 0,
        vb = 0;

      if (sortField === "date") {
        va = new Date(a.start_date_local).getTime();
        vb = new Date(b.start_date_local).getTime();
      } else if (sortField === "distance") {
        va = a.distance;
        vb = b.distance;
      } else if (sortField === "duration") {
        va = a.moving_time;
        vb = b.moving_time;
      } else if (sortField === "elevation") {
        va = a.total_elevation_gain;
        vb = b.total_elevation_gain;
      }

      return sortDir === "desc" ? vb - va : va - vb;
    });

    return list;
  }, [activities, activityFilter, datePreset, customFrom, customTo, sortField, sortDir]);

  // Summary stats (across all activities, not filtered)
  const stats = useMemo(
    () => ({
      cycling: activities.filter((a) => getActivityCategory(a) === "cycling").length,
      totalDist: activities.reduce((s, a) => s + a.distance, 0),
      totalElev: activities.reduce((s, a) => s + a.total_elevation_gain, 0),
      totalTime: activities.reduce((s, a) => s + a.moving_time, 0),
      qualifying: activities.filter((a) => a.qualifying ?? checkQualifying(a).qualifying).length,
    }),
    [activities],
  );

  const DATE_PRESETS: { key: DatePreset; label: string }[] = [
    { key: "all", label: "Alle Zeit" },
    { key: "7d", label: "7 Tage" },
    { key: "30d", label: "30 Tage" },
    { key: "3m", label: "3 Monate" },
    { key: "1y", label: "1 Jahr" },
    { key: "custom", label: "Eigener Zeitraum" },
  ];

  const ACTIVITY_FILTERS: { key: ActivityFilter; label: string }[] = [
    { key: "all", label: "Alle" },
    { key: "qualifying", label: `Spielwürdig (${stats.qualifying})` },
    { key: "cycling", label: "Radfahren" },
    { key: "running", label: "Laufen" },
    { key: "other", label: "Sonstiges" },
  ];

  const SORT_OPTIONS: { field: SortField; label: string }[] = [
    { field: "date", label: "Datum" },
    { field: "distance", label: "Distanz" },
    { field: "duration", label: "Dauer" },
    { field: "elevation", label: "Höhenmeter" },
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
            isLoading={activitiesLoading}
            size="sm"
            startContent={!activitiesLoading && <RefreshCw size={14} />}
            variant="flat"
            onPress={syncActivities}
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
          <Button as="a" className="bg-[#FC4C02] text-white font-semibold" href={getAuthUrl()}>
            Mit Strava verbinden
          </Button>
        </div>
      )}

      {/* Loading */}
      {activitiesLoading && activities.length === 0 && (
        <div className="flex justify-center py-20">
          <Spinner label="Aktivitäten werden geladen..." size="lg" />
        </div>
      )}

      {/* No activities */}
      {jwtToken && !activitiesLoading && activities.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <BarChart2 className="text-default-300" size={40} />
          <div>
            <p className="font-semibold">Keine Aktivitäten geladen</p>
            <p className="text-sm text-default-400 mt-1">
              Synchronisiere deine Aktivitäten von Strava.
            </p>
          </div>
          <Button
            color="primary"
            startContent={<RefreshCw size={16} />}
            variant="flat"
            onPress={syncActivities}
          >
            Aktivitäten synchronisieren
          </Button>
        </div>
      )}

      {activities.length > 0 && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              {
                icon: <Bike size={18} />,
                value: stats.cycling,
                label: "Radtouren",
                color: "text-[#FC4C02]",
                bg: "bg-[#FC4C02]/10",
              },
              {
                icon: <Ruler size={18} />,
                value: fmtDist(stats.totalDist),
                label: "Gesamtstrecke",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: <TrendingUp size={18} />,
                value: `${Math.round(stats.totalElev / 1000).toLocaleString("de-DE")} km`,
                label: "Höhenmeter",
                color: "text-success",
                bg: "bg-success/10",
              },
              {
                icon: <Clock size={18} />,
                value: fmtTime(stats.totalTime),
                label: "Gesamtzeit",
                color: "text-secondary",
                bg: "bg-secondary/10",
              },
              {
                icon: <Activity size={18} />,
                value: activities.length,
                label: "Aktivitäten",
                color: "text-default-600",
                bg: "bg-default-100",
              },
            ].map(({ icon, value, label, color, bg }) => (
              <Card key={label}>
                <CardBody className="flex flex-row items-center gap-3 p-3">
                  <div className={`p-2 rounded-xl ${bg} ${color} shrink-0`}>{icon}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-base leading-tight truncate">{value}</p>
                    <p className="text-xs text-default-400">{label}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* ── Filter bar ──────────────────────────────────────────────────── */}
          <div className="bg-content1 border border-divider rounded-2xl p-4 mb-5 flex flex-col gap-4">
            {/* Row 1: Activity type */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-default-400 uppercase tracking-wide w-20 shrink-0">
                Typ
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ACTIVITY_FILTERS.map(({ key, label }) => (
                  <button
                    key={key}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activityFilter === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-content2 text-default-500 hover:bg-content3"
                    }`}
                    onClick={() => setActivityFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Date range */}
            <div className="flex flex-wrap gap-2 items-start">
              <span className="text-xs font-bold text-default-400 uppercase tracking-wide w-20 shrink-0 mt-1.5">
                Zeitraum
              </span>
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {DATE_PRESETS.map(({ key, label }) => (
                    <button
                      key={key}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                        datePreset === key
                          ? "bg-primary text-primary-foreground"
                          : "bg-content2 text-default-500 hover:bg-content3"
                      }`}
                      onClick={() => {
                        setDatePreset(key);
                        setShowDateCustom(key === "custom");
                      }}
                    >
                      {key === "custom" && <Calendar size={11} />}
                      {label}
                      {key === "custom" &&
                        (showDateCustom ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                    </button>
                  ))}
                </div>
                {showDateCustom && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      className="px-3 py-1.5 rounded-lg text-xs border border-divider bg-content2 focus:outline-none focus:border-primary"
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                    />
                    <span className="text-xs text-default-400">bis</span>
                    <input
                      className="px-3 py-1.5 rounded-lg text-xs border border-divider bg-content2 focus:outline-none focus:border-primary"
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Sort */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-default-400 uppercase tracking-wide w-20 shrink-0">
                Sortierung
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SORT_OPTIONS.map(({ field, label }) => (
                  <SortButton
                    key={field}
                    current={sortField}
                    dir={sortDir}
                    field={field}
                    label={label}
                    onClick={() => handleSort(field)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Result count */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-default-400">
              {filtered.length} von {activities.length} Aktivitäten
            </p>
            {(activityFilter !== "all" || datePreset !== "all") && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  setActivityFilter("all");
                  setDatePreset("all");
                  setShowDateCustom(false);
                  setCustomFrom("");
                  setCustomTo("");
                }}
              >
                Filter zurücksetzen
              </button>
            )}
          </div>

          {/* Activity grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-default-400 gap-2">
              <Activity className="opacity-40" size={32} />
              <p className="text-sm">Keine Aktivitäten für diese Filtereinstellungen</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((a) => (
                <ActivityCard key={a.id} activity={a} onClick={() => setSelectedActivity(a)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedActivity && (
        <ActivityModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}
    </div>
  );
}
