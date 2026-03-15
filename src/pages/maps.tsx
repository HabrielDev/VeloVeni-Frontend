import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Button, Spinner, ScrollShadow, Avatar, Switch } from '@heroui/react';
import {
  Bike, Activity, Clock, TrendingUp, RefreshCw,
  ChevronLeft, ChevronRight, LogOut, Layers, Ruler, Map, Trophy,
  Eye, EyeOff, Route, Rows3, Download, Trash2,
} from 'lucide-react';
import { getAuthUrl } from '@/api/strava';
import { useStrava } from '@/features/auth/strava-context';
import { deleteAccount, exportMyData } from '@/api/backend';
import type { StravaActivity } from '@/api/strava';
import {
  GERMANY_CENTER, GERMANY_BOUNDS, GERMANY_MAP_BOUNDS,
  decodePolyline, getConqueredTiles, tilesToGeoJson,
  TILE_AREA_KM2, checkQualifying,
} from '@/utils/geo';

// ─── Leaflet icon fix ─────────────────────────────────────────────────────────
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ─── Map tile options ─────────────────────────────────────────────────────────
const TILE_LAYERS = {
  street: {
    label: 'Straße',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    label: 'Satellit',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
  topo: {
    label: 'Topographie',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
} as const;
type TileKey = keyof typeof TILE_LAYERS;
type ViewMode = 'all' | 'single' | 'none';

const CYCLING_TYPES = ['Ride', 'EBikeRide', 'GravelRide', 'MountainBikeRide', 'Handcycle', 'Velomobile'];

// ─── Fit map to Germany on first load ────────────────────────────────────────
function FitGermany() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLngBounds(GERMANY_BOUNDS), { padding: [10, 10] });
  }, [map]);
  return null;
}

// ─── Fit map to route ─────────────────────────────────────────────────────────
function FitRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions), { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
}

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmtDist = (m: number) => `${(m / 1000).toFixed(1)} km`;
const fmtTime = (s: number) => {
  const h = Math.floor(s / 3600), min = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${min}min` : `${min}min`;
};
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Hoverable Polyline with popup ────────────────────────────────────────────
function HoverablePolyline({
  activity, positions, isActive,
}: {
  activity: StravaActivity; positions: [number, number][]; isActive: boolean;
}) {
  const map = useMap();
  const popupRef = useRef<L.Popup | null>(null);

  const isCycling = CYCLING_TYPES.includes(activity.sport_type ?? activity.type);
  const isDark = document.documentElement.closest('.dark') !== null ||
    document.body.classList.contains('dark') ||
    document.querySelector('.dark') !== null;
  const bg    = isDark ? '#1E2430' : '#F4F3F0';
  const text  = isDark ? '#ECECEC' : '#18181B';
  const muted = isDark ? '#8B9CB6' : '#888888';

  const handleMouseOver = (e: L.LeafletMouseEvent) => {
    const content = `
      <div style="min-width:180px;font-family:system-ui,sans-serif;color:${text}">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <span style="font-size:14px">${isCycling ? '🚴' : '🏃'}</span>
          <strong style="font-size:13px;line-height:1.2">${activity.name}</strong>
        </div>
        <div style="font-size:11px;color:${muted};margin-bottom:8px">${fmtDate(activity.start_date_local)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
          <div style="text-align:center;background:${bg};border-radius:8px;padding:6px 4px">
            <div style="font-weight:700;font-size:12px;color:${text}">${fmtDist(activity.distance)}</div>
            <div style="font-size:10px;color:${muted}">Distanz</div>
          </div>
          <div style="text-align:center;background:${bg};border-radius:8px;padding:6px 4px">
            <div style="font-weight:700;font-size:12px;color:${text}">${fmtTime(activity.moving_time)}</div>
            <div style="font-size:10px;color:${muted}">Dauer</div>
          </div>
          <div style="text-align:center;background:${bg};border-radius:8px;padding:6px 4px">
            <div style="font-weight:700;font-size:12px;color:${text}">${Math.round(activity.total_elevation_gain)}m</div>
            <div style="font-size:10px;color:${muted}">Höhe</div>
          </div>
        </div>
        ${activity.qualifying ? '<div style="margin-top:8px;font-size:10px;color:#17c964;font-weight:600">✓ Qualifiziert</div>' : ''}
      </div>
    `;
    if (!popupRef.current) {
      popupRef.current = L.popup({
        closeButton: false,
        offset: [0, -4],
        className: 'route-hover-popup',
      });
    }
    popupRef.current.setLatLng(e.latlng).setContent(content).openOn(map);
  };

  const handleMouseMove = (e: L.LeafletMouseEvent) => {
    popupRef.current?.setLatLng(e.latlng);
  };

  const handleMouseOut = () => {
    if (popupRef.current) map.closePopup(popupRef.current);
  };

  return (
    <Polyline
      positions={positions}
      color="#FC4C02"
      weight={isActive ? 5 : 2}
      opacity={isActive ? 1 : 0.45}
      eventHandlers={{
        mouseover: handleMouseOver,
        mousemove: handleMouseMove,
        mouseout: handleMouseOut,
      }}
    />
  );
}

// ─── Activity list item ───────────────────────────────────────────────────────
function ActivityItem({
  activity, isActive, isLoading, onClick,
}: {
  activity: StravaActivity; isActive: boolean; isLoading: boolean; onClick: () => void;
}) {
  const hasGps = Array.isArray(activity.start_latlng) && activity.start_latlng.length > 0;
  const isCycling = CYCLING_TYPES.includes(activity.sport_type ?? activity.type);
  const qualifying = activity.qualifying ?? checkQualifying(activity).qualifying;

  return (
    <button
      onClick={onClick}
      disabled={!hasGps}
      className={`w-full text-left p-3 rounded-xl border transition-colors ${
        isActive
          ? 'border-[#FC4C02] bg-[#FC4C02]/10'
          : hasGps
            ? 'border-transparent hover:bg-content2 cursor-pointer'
            : 'border-transparent opacity-40 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${qualifying ? 'bg-success' : 'bg-default-300'}`} />
        <div className={`shrink-0 ${isActive ? 'text-[#FC4C02]' : 'text-default-400'}`}>
          {isLoading && isActive
            ? <Spinner size="sm" color="warning" />
            : isCycling ? <Bike size={15} /> : <Activity size={15} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{activity.name}</p>
          <p className="text-xs text-default-400 mb-1">{fmtDate(activity.start_date_local)}</p>
          {qualifying ? (
            <div className="flex items-center gap-2 text-xs text-default-500 flex-wrap">
              <span className="flex items-center gap-0.5"><Ruler size={10} />{fmtDist(activity.distance)}</span>
              <span className="flex items-center gap-0.5"><Clock size={10} />{fmtTime(activity.moving_time)}</span>
              <span className="flex items-center gap-0.5"><TrendingUp size={10} />{Math.round(activity.total_elevation_gain)}m</span>
            </div>
          ) : (
            <p className="text-xs text-warning-500">{activity.qualifying_reason ?? 'Nicht qualifiziert'}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MapsPage() {
  const {
    jwtToken, token, activities, activeRoute, activeActivityId,
    activitiesLoading, routeLoading, syncActivities, selectActivity, disconnect,
  } = useStrava();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<'routes' | 'map' | 'game'>('routes');
  const [tileKey, setTileKey] = useState<TileKey>('street');
  const [showTerritories, setShowTerritories] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showRoutePicker, setShowRoutePicker] = useState(false);
  const tile = TILE_LAYERS[tileKey];

  // Close picker when switching away from single mode
  useEffect(() => {
    if (viewMode !== 'single') setShowRoutePicker(false);
  }, [viewMode]);

  const qualifyingActivities = useMemo(
    () => activities.filter((a) => (a.qualifying ?? checkQualifying(a).qualifying) && a.map?.summary_polyline),
    [activities],
  );

  const allRoutes = useMemo(
    () => qualifyingActivities.map((a) => ({ id: a.id, activity: a, positions: decodePolyline(a.map.summary_polyline) })),
    [qualifyingActivities],
  );

  const allTiles = useMemo(() => {
    const tiles = new Set<string>();
    for (const r of allRoutes) for (const t of getConqueredTiles(r.positions)) tiles.add(t);
    return Array.from(tiles);
  }, [allRoutes]);

  const territoriesGeoJson = useMemo(
    () => (showTerritories && allTiles.length > 0 ? tilesToGeoJson(allTiles) : null),
    [allTiles, showTerritories],
  );

  const gameStats = useMemo(() => ({
    routeCount: qualifyingActivities.length,
    totalDistanceKm: qualifyingActivities.reduce((s, a) => s + a.distance, 0) / 1000,
    uniqueTiles: allTiles.length,
    areaKm2: allTiles.length * TILE_AREA_KM2,
  }), [qualifyingActivities, allTiles]);

  // Which routes to render based on view mode
  const visibleRoutes = useMemo(() => {
    if (viewMode === 'none') return [];
    if (viewMode === 'single') return activeActivityId ? allRoutes.filter((r) => r.id === activeActivityId) : [];
    return allRoutes;
  }, [viewMode, allRoutes, activeActivityId]);

  const VIEW_MODES: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Alle', icon: <Rows3 size={13} /> },
    { key: 'single', label: 'Einzeln', icon: <Route size={13} /> },
    { key: 'none', label: 'Keine', icon: <EyeOff size={13} /> },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 min-w-0">
        <div className="relative h-full w-full rounded-2xl overflow-hidden border-2 border-divider shadow-lg">

          {/* ── Top-right control panel ───────────────────────────────────── */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 items-end">

            {/* Main control card */}
            <div className="glass rounded-2xl overflow-hidden min-w-[200px]">

              {/* Fahrten anzeigen */}
              <div className="px-3 pt-2.5 pb-1.5 border-b border-divider">
                <p className="text-[10px] font-bold uppercase tracking-wider text-default-400 mb-2">
                  Fahrten anzeigen
                </p>
                <div className="flex gap-1">
                  {VIEW_MODES.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setViewMode(key);
                        if (key === 'single') setShowRoutePicker(true);
                      }}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] font-semibold transition-colors ${
                        viewMode === key
                          ? 'bg-[#FC4C02] text-white'
                          : 'bg-content2 text-default-500 hover:bg-content3'
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>

                {/* Single mode: selected route badge */}
                {viewMode === 'single' && (
                  <button
                    onClick={() => setShowRoutePicker(!showRoutePicker)}
                    className="w-full mt-2 flex items-center justify-between px-2 py-1.5 rounded-lg bg-content2 hover:bg-content3 transition-colors text-left"
                  >
                    <span className="text-xs text-default-600 truncate">
                      {activeActivityId
                        ? qualifyingActivities.find((a) => a.id === activeActivityId)?.name ?? 'Fahrt gewählt'
                        : 'Fahrt auswählen...'}
                    </span>
                    <ChevronRight size={12} className={`shrink-0 text-default-400 transition-transform ${showRoutePicker ? 'rotate-90' : ''}`} />
                  </button>
                )}
              </div>

              {/* Zonen toggle */}
              <div className="px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-default-600">
                  {showTerritories ? <Eye size={13} className="text-[#FC4C02]" /> : <EyeOff size={13} />}
                  Zonen
                </div>
                <Switch
                  isSelected={showTerritories}
                  onValueChange={setShowTerritories}
                  size="sm"
                  color="warning"
                />
              </div>
            </div>

            {/* Route picker dropdown */}
            {viewMode === 'single' && showRoutePicker && qualifyingActivities.length > 0 && (
              <div className="glass rounded-2xl w-64 max-h-72 flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-divider shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-default-400">
                    {qualifyingActivities.length} qualifizierte Routen
                  </p>
                </div>
                <div className="overflow-y-auto">
                  {qualifyingActivities.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { selectActivity(a.id); setShowRoutePicker(false); }}
                      className={`w-full text-left px-3 py-2.5 transition-colors border-b border-divider/40 last:border-0 ${
                        activeActivityId === a.id
                          ? 'bg-[#FC4C02]/10 text-[#FC4C02]'
                          : 'hover:bg-content2 text-default-700'
                      }`}
                    >
                      <p className="text-xs font-semibold truncate">{a.name}</p>
                      <p className="text-[10px] text-default-400 mt-0.5">
                        {fmtDist(a.distance)} · {fmtDate(a.start_date_local)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <MapContainer
            center={GERMANY_CENTER}
            zoom={6}
            minZoom={5}
            maxZoom={18}
            maxBounds={GERMANY_MAP_BOUNDS}
            maxBoundsViscosity={0.8}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url={tile.url} attribution={tile.attribution} />

            <FitGermany />

            {/* Territory layer */}
            {territoriesGeoJson && (
              <GeoJSON
                key={`t-${allTiles.length}`}
                data={territoriesGeoJson}
                style={() => ({
                  fillColor: '#FC4C02',
                  fillOpacity: 0.22,
                  color: '#FC4C02',
                  weight: 0.3,
                  opacity: 0.4,
                })}
              />
            )}

            {/* Routes with hover popup */}
            {visibleRoutes.map((r) => (
              <HoverablePolyline
                key={r.id}
                activity={r.activity}
                positions={r.positions}
                isActive={activeActivityId === r.id}
              />
            ))}

            {/* Fit map when a route is selected via GPS stream */}
            {activeRoute.length > 0 && <FitRoute positions={activeRoute} />}

            {/* Default marker */}
            {allRoutes.length === 0 && (
              <Marker position={GERMANY_CENTER}>
                <Popup>VeloVeni — Fahr los und erobere Deutschland! 🚴</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <div className={`flex flex-col border-l border-divider bg-content1/95 backdrop-blur-sm transition-all duration-200 shrink-0 ${sidebarOpen ? 'w-80' : 'w-12'}`}>
        <div className="flex items-center justify-between p-3 border-b border-divider shrink-0 h-14">
          {sidebarOpen && (
            <span className="font-bold text-sm tracking-tight">
              Velo<span className="text-primary">Veni</span>
            </span>
          )}
          <Button isIconOnly size="sm" variant="light" onPress={() => setSidebarOpen(!sidebarOpen)} className={sidebarOpen ? '' : 'mx-auto'}>
            {sidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>

        {sidebarOpen && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Tab buttons */}
            <div className="flex shrink-0 border-b border-divider">
              {(['routes', 'map', 'game'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                    tab === t ? 'text-primary border-b-2 border-primary' : 'text-default-400 hover:text-default-600'
                  }`}
                >
                  {t === 'routes' && <><Map size={12} />Routen</>}
                  {t === 'map' && <><Layers size={12} />Karte</>}
                  {t === 'game' && <><Trophy size={12} />Spiel</>}
                </button>
              ))}
            </div>

            {/* ── Tab: Routen ────────────────────────────────────────────── */}
            {tab === 'routes' && (
              <div className="flex flex-col flex-1 min-h-0 p-3 gap-3">
                {!jwtToken ? (
                  <div className="flex flex-col items-center gap-4 py-10 text-center">
                    <div className="w-14 h-14 bg-[#FC4C02] rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-extrabold text-xl">S</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Mit Strava verbinden</p>
                      <p className="text-xs text-default-400 mt-1 leading-relaxed">
                        Synchronisiere deine Aktivitäten und starte das Spiel.
                      </p>
                    </div>
                    <Button as="a" href={getAuthUrl()} size="sm" className="bg-[#FC4C02] text-white font-semibold">
                      Mit Strava verbinden
                    </Button>
                  </div>
                ) : (
                  <>
                    {token && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-content2">
                          <Avatar src={token.athlete.profile} name={token.athlete.firstname} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{token.athlete.firstname} {token.athlete.lastname}</p>
                            <p className="text-xs font-medium" style={{ color: '#FC4C02' }}>Strava verbunden</p>
                          </div>
                          <Button isIconOnly size="sm" variant="light" onPress={disconnect} title="Trennen">
                            <LogOut size={14} />
                          </Button>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm" variant="flat" fullWidth
                            startContent={<Download size={12} />}
                            onPress={async () => {
                              if (!jwtToken) return;
                              try {
                                const data = await exportMyData(jwtToken);
                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url; a.download = 'veloveni-export.json'; a.click();
                                URL.revokeObjectURL(url);
                              } catch (e) { console.error(e); }
                            }}
                            className="text-xs"
                          >
                            Export
                          </Button>
                          <Button
                            size="sm" variant="flat" color="danger" fullWidth
                            startContent={<Trash2 size={12} />}
                            onPress={async () => {
                              if (!jwtToken) return;
                              if (!confirm('Account und alle Daten unwiderruflich löschen?')) return;
                              try {
                                await deleteAccount(jwtToken);
                                disconnect();
                              } catch (e) { console.error(e); }
                            }}
                            className="text-xs"
                          >
                            Löschen
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between shrink-0">
                      {activities.length === 0 ? (
                        <Button size="sm" variant="flat" onPress={syncActivities} isLoading={activitiesLoading}
                          startContent={!activitiesLoading && <RefreshCw size={14} />} fullWidth>
                          Aktivitäten synchronisieren
                        </Button>
                      ) : (
                        <>
                          <span className="text-xs text-default-400">
                            {activities.length} Aktivitäten · <span className="text-success">{qualifyingActivities.length} qualifiziert</span>
                          </span>
                          <Button isIconOnly size="sm" variant="light" onPress={syncActivities} isLoading={activitiesLoading}>
                            {!activitiesLoading && <RefreshCw size={14} />}
                          </Button>
                        </>
                      )}
                    </div>

                    <ScrollShadow className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                      <div className="flex flex-col gap-1 pb-4">
                        {activitiesLoading && activities.length === 0 ? (
                          <div className="flex justify-center py-10"><Spinner size="sm" /></div>
                        ) : (
                          qualifyingActivities.map((a) => (
                            <ActivityItem
                              key={a.id} activity={a}
                              isActive={activeActivityId === a.id}
                              isLoading={routeLoading}
                              onClick={() => selectActivity(a.id)}
                            />
                          ))
                        )}
                      </div>
                    </ScrollShadow>
                  </>
                )}
              </div>
            )}

            {/* ── Tab: Karte ─────────────────────────────────────────────── */}
            {tab === 'map' && (
              <div className="p-3 flex flex-col gap-3">
                <p className="text-xs text-default-400 font-semibold uppercase tracking-wide">Kartentyp</p>
                {(Object.keys(TILE_LAYERS) as TileKey[]).map((key) => (
                  <button key={key} onClick={() => setTileKey(key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                      tileKey === key ? 'border-primary bg-primary/10 text-primary' : 'border-divider hover:bg-content2'
                    }`}>
                    <Layers size={16} />
                    <span className="text-sm font-medium flex-1">{TILE_LAYERS[key].label}</span>
                    {tileKey === key && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Aktiv</span>}
                  </button>
                ))}
              </div>
            )}

            {/* ── Tab: Spiel ─────────────────────────────────────────────── */}
            {tab === 'game' && (
              <div className="p-3 flex flex-col gap-3">
                <p className="text-xs text-default-400 font-semibold uppercase tracking-wide">Dein Gebiet</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: gameStats.routeCount, label: 'Routen', color: 'text-[#FC4C02]', bg: 'bg-[#FC4C02]/10' },
                    { value: `${gameStats.totalDistanceKm.toFixed(0)} km`, label: 'Strecke', color: 'text-primary', bg: 'bg-primary/10' },
                    { value: gameStats.uniqueTiles, label: 'Felder', color: 'text-success', bg: 'bg-success/10' },
                    { value: `${gameStats.areaKm2.toFixed(0)} km²`, label: 'Fläche', color: 'text-secondary', bg: 'bg-secondary/10' },
                  ].map(({ value, label, color, bg }) => (
                    <div key={label} className={`p-3 rounded-xl ${bg} text-center`}>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-default-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-content2">
                  <div>
                    <p className="text-sm font-medium">Gebiete anzeigen</p>
                    <p className="text-xs text-default-400">Orangeflächen auf der Karte</p>
                  </div>
                  <Switch isSelected={showTerritories} onValueChange={setShowTerritories} size="sm" color="warning" />
                </div>

                <div className="p-3 rounded-xl bg-content2">
                  <p className="text-xs font-semibold mb-2">Qualifying-Kriterien</p>
                  {[
                    '🚴 Rad-Aktivität (kein Lauf/Swim)',
                    '📍 GPS-Track vorhanden',
                    '🇩🇪 Startpunkt in Deutschland',
                    '📏 Mindestens 1 km Strecke',
                  ].map((c) => (
                    <p key={c} className="text-xs text-default-500 mt-1">{c}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
