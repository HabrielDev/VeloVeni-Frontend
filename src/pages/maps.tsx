import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Button, Spinner, ScrollShadow, Avatar, Switch } from "@heroui/react";
import {
  Bike,
  Activity,
  Clock,
  TrendingUp,
  RefreshCw,
  LogOut,
  Layers,
  Ruler,
  Map,
  Trophy,
  Eye,
  EyeOff,
  Route,
  Rows3,
  Search,
  SortDesc,
  SortAsc,
  Menu,
  X,
} from "lucide-react";

import { getAuthUrl } from "@/api/strava";
import { useStrava } from "@/features/auth/strava-context";
import { useTour } from "@/features/tour/tour-context";
import {
  getAllTerritories,
  getTileCrossings,
  recalculateTerritories,
  getFriendsTerritories,
  getFriendsActivities,
  getMyTerritories,
} from "@/api/backend";

import type { TerritoryData, TileCrossingEntry, FriendActivity } from "@/api/backend";
import type { StravaActivity } from "@/api/strava";

import {
  GERMANY_CENTER,
  GERMANY_BOUNDS,
  GERMANY_MAP_BOUNDS,
  decodePolyline,
  getConqueredTiles,
  tilesToGeoJson,
  TILE_AREA_KM2,
  checkQualifying,
} from "@/utils/geo";

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
    label: "Straße",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    label: "Satellit",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
  },
  topo: {
    label: "Topographie",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
} as const;

type TileKey = keyof typeof TILE_LAYERS;
type ViewMode = "all" | "single" | "none";

const CYCLING_TYPES = [
  "Ride",
  "EBikeRide",
  "VirtualRide",
  "GravelRide",
  "MountainBikeRide",
  "Handcycle",
  "Velomobile",
];

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
  const h = Math.floor(s / 3600),
    min = Math.floor((s % 3600) / 60);

  return h > 0 ? `${h}h ${min}min` : `${min}min`;
};
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });

// ─── Hoverable Polyline with popup ────────────────────────────────────────────
function HoverablePolyline({
  activity,
  positions,
  isActive,
  hidePopup,
}: {
  activity: StravaActivity;
  positions: [number, number][];
  isActive: boolean;
  hidePopup?: boolean;
}) {
  const map = useMap();
  const popupRef = useRef<L.Popup | null>(null);

  const isCycling = CYCLING_TYPES.includes(activity.sport_type ?? activity.type);
  const isDark =
    document.documentElement.closest(".dark") !== null ||
    document.body.classList.contains("dark") ||
    document.querySelector(".dark") !== null;
  const bg = isDark ? "#1E2430" : "#F4F3F0";
  const text = isDark ? "#ECECEC" : "#18181B";
  const muted = isDark ? "#8B9CB6" : "#888888";

  const handleMouseOver = (e: L.LeafletMouseEvent) => {
    if (hidePopup) return;
    const content = `
      <div style="min-width:180px;font-family:system-ui,sans-serif;color:${text}">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <span style="font-size:14px">${isCycling ? "🚴" : "🏃"}</span>
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
        ${activity.qualifying ? '<div style="margin-top:8px;font-size:10px;color:#17c964;font-weight:600">✓ Qualifiziert</div>' : ""}
      </div>
    `;

    if (!popupRef.current) {
      popupRef.current = L.popup({
        closeButton: false,
        offset: [0, -4],
        className: "route-hover-popup",
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
      color="#FC4C02"
      eventHandlers={{
        mouseover: handleMouseOver,
        mousemove: handleMouseMove,
        mouseout: handleMouseOut,
      }}
      opacity={isActive ? 1 : 0.45}
      positions={positions}
      weight={isActive ? 5 : 2}
    />
  );
}

// ─── Activity list item ───────────────────────────────────────────────────────
function ActivityItem({
  activity,
  isActive,
  isLoading,
  onClick,
}: {
  activity: StravaActivity;
  isActive: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  const hasGps = Array.isArray(activity.start_latlng) && activity.start_latlng.length > 0;
  const isCycling = CYCLING_TYPES.includes(activity.sport_type ?? activity.type);
  const qualifying = activity.qualifying ?? checkQualifying(activity).qualifying;

  return (
    <button
      className={`w-full text-left p-3 rounded-xl border transition-colors ${
        isActive
          ? "border-[#FC4C02] bg-[#FC4C02]/10"
          : hasGps
            ? "border-transparent hover:bg-content2 cursor-pointer"
            : "border-transparent opacity-40 cursor-not-allowed"
      }`}
      disabled={!hasGps}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div
          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${qualifying ? "bg-success" : "bg-default-300"}`}
        />
        <div className={`shrink-0 ${isActive ? "text-[#FC4C02]" : "text-default-400"}`}>
          {isLoading && isActive ? (
            <Spinner color="warning" size="sm" />
          ) : isCycling ? (
            <Bike size={15} />
          ) : (
            <Activity size={15} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{activity.name}</p>
          <p className="text-xs text-default-400 mb-1">{fmtDate(activity.start_date_local)}</p>
          {qualifying ? (
            <div className="flex items-center gap-2 text-xs text-default-500 flex-wrap">
              <span className="flex items-center gap-0.5">
                <Ruler size={10} />
                {fmtDist(activity.distance)}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock size={10} />
                {fmtTime(activity.moving_time)}
              </span>
              <span className="flex items-center gap-0.5">
                <TrendingUp size={10} />
                {Math.round(activity.total_elevation_gain)}m
              </span>
            </div>
          ) : (
            <p className="text-xs text-warning-500">
              {activity.qualifying_reason ?? "Nicht qualifiziert"}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MapsPage() {
  const {
    jwtToken,
    token,
    backendUserId,
    activities,
    activeRoute,
    activeActivityId,
    activitiesLoading,
    routeLoading,
    syncActivities,
    selectActivity,
    disconnect,
  } = useStrava();

  const [tab, setTab] = useState<"routes" | "map" | "game">("routes");
  const [tileKey, setTileKey] = useState<TileKey>("street");
  const [showTerritories, setShowTerritories] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  // Sidebar route filters
  const [routeSearch, setRouteSearch] = useState("");
  const [routeTypeFilter, setRouteTypeFilter] = useState<"qualifying" | "cycling" | "all">(
    "qualifying",
  );
  const [routeSortField, setRouteSortField] = useState<"date" | "distance" | "elevation">("date");
  const [routeSortDir, setRouteSortDir] = useState<"desc" | "asc">("desc");
  const [allTerritories, setAllTerritories] = useState<TerritoryData[]>([]);
  const [tileCrossings, setTileCrossings] = useState<Record<string, TileCrossingEntry[]>>({});
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [zoneMode, setZoneMode] = useState<"global" | "friends">("global");

  const { shouldAutoStart, startTour } = useTour();

  useEffect(() => {
    if (!shouldAutoStart) return;
    const timer = setTimeout(startTour, 600);

    return () => clearTimeout(timer);
  }, [shouldAutoStart, startTour]);
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([]);
  const tile = TILE_LAYERS[tileKey];

  const reloadMapData = (jwt: string, mode: "global" | "friends") => {
    setAllTerritories([]);
    if (mode === "friends") {
      // Always include own territory so self-owned tiles are never misattributed
      Promise.all([getFriendsTerritories(jwt), getMyTerritories(jwt)])
        .then(([friendTerritories, ownTerritory]) => {
          const merged = friendTerritories.filter((t) => t.userId !== ownTerritory.userId);

          merged.push(ownTerritory);
          setAllTerritories(merged);
        })
        .catch(() => setAllTerritories([]));
      getFriendsActivities(jwt)
        .then(setFriendActivities)
        .catch(() => setFriendActivities([]));
    } else {
      getAllTerritories(jwt)
        .then(setAllTerritories)
        .catch(() => setAllTerritories([]));
      setFriendActivities([]);
    }
    getTileCrossings(jwt)
      .then(setTileCrossings)
      .catch(() => {});
  };

  // Load all users' territories and crossing counts for the map
  useEffect(() => {
    if (!jwtToken) return;
    reloadMapData(jwtToken, zoneMode);
  }, [jwtToken, zoneMode]);

  const handleRecalculate = async () => {
    if (!jwtToken) return;
    setRecalcLoading(true);
    try {
      await recalculateTerritories(jwtToken);
      reloadMapData(jwtToken, zoneMode);
    } finally {
      setRecalcLoading(false);
    }
  };

  const qualifyingActivities = useMemo(
    () =>
      activities.filter(
        (a) => (a.qualifying ?? checkQualifying(a).qualifying) && a.map?.summary_polyline,
      ),
    [activities],
  );

  const allRoutes = useMemo(
    () =>
      qualifyingActivities.map((a) => ({
        id: a.id,
        activity: a,
        positions: decodePolyline(a.map.summary_polyline),
      })),
    [qualifyingActivities],
  );

  const allTiles = useMemo(() => {
    const tiles = new Set<string>();

    for (const r of allRoutes) for (const t of getConqueredTiles(r.positions)) tiles.add(t);

    return Array.from(tiles);
  }, [allRoutes]);

  // In friends mode, filter tile crossings to only include friends (+ self)
  const effectiveTileCrossings = useMemo(() => {
    if (zoneMode === "global") return tileCrossings;
    const friendIds = new Set(allTerritories.map((t) => t.userId));

    if (backendUserId != null) friendIds.add(backendUserId);
    const filtered: Record<string, TileCrossingEntry[]> = {};

    for (const [key, entries] of Object.entries(tileCrossings)) {
      const f = entries.filter((e) => friendIds.has(e.userId));

      if (f.length > 0) filtered[key] = f;
    }

    return filtered;
  }, [tileCrossings, allTerritories, zoneMode, backendUserId]);

  // Build a lookup of user metadata (name + color) from allTerritories + tileCrossings
  const userMetaMap = useMemo(() => {
    const map: Record<number, { firstname: string; lastname: string; color: string }> = {};

    for (const t of allTerritories) {
      if (t.firstname)
        map[t.userId] = { firstname: t.firstname, lastname: t.lastname ?? "", color: t.color };
    }
    // Fill in any gaps from crossing data
    for (const entries of Object.values(tileCrossings)) {
      for (const e of entries) {
        if (!map[e.userId])
          map[e.userId] = { firstname: e.firstname, lastname: e.lastname, color: e.color };
      }
    }

    return map;
  }, [allTerritories, tileCrossings]);

  // Pre-compute GeoJSON per user territory — enrich features with owner name + top3 for tooltip
  const territoriesGeoJsonMap = useMemo(() => {
    if (!showTerritories) return [];

    const getOwnerName = (userId: number) => {
      if (userId === backendUserId && token?.athlete)
        return `${token.athlete.firstname} ${token.athlete.lastname}`;
      const meta = userMetaMap[userId];

      return meta?.firstname ? `${meta.firstname} ${meta.lastname}` : `User ${userId}`;
    };

    if (zoneMode === "friends") {
      // Start: every tile the user has personally ridden (from local GPS data) belongs to them
      const tilesByWinner: Record<number, string[]> = {};

      if (backendUserId != null) {
        tilesByWinner[backendUserId] = [...allTiles];
      }

      // Override: for tiles where a friend has more crossings, the friend wins
      const ownTileSet = new Set(allTiles);

      for (const friend of allTerritories.filter((t) => t.userId !== backendUserId)) {
        for (const tileKey of friend.tiles ?? []) {
          // Only contest tiles that the user has also ridden
          if (!ownTileSet.has(tileKey)) continue;
          const ownCrossings =
            effectiveTileCrossings[tileKey]?.find((e) => e.userId === backendUserId)
              ?.crossingCount ?? 0;
          const friendCrossings =
            effectiveTileCrossings[tileKey]?.find((e) => e.userId === friend.userId)
              ?.crossingCount ?? 0;

          if (friendCrossings > ownCrossings) {
            // Friend wins this tile
            tilesByWinner[backendUserId!] = tilesByWinner[backendUserId!].filter(
              (k) => k !== tileKey,
            );
            if (!tilesByWinner[friend.userId]) tilesByWinner[friend.userId] = [];
            tilesByWinner[friend.userId].push(tileKey);
          }
        }
        // Friend tiles the user hasn't ridden → friend owns them uncontested
        for (const tileKey of friend.tiles ?? []) {
          if (!ownTileSet.has(tileKey)) {
            if (!tilesByWinner[friend.userId]) tilesByWinner[friend.userId] = [];
            tilesByWinner[friend.userId].push(tileKey);
          }
        }
      }

      return Object.entries(tilesByWinner).map(([userIdStr, tiles]) => {
        const userId = Number(userIdStr);
        const isOwn = userId === backendUserId;
        const displayColor = isOwn ? "#3B82F6" : (userMetaMap[userId]?.color ?? "#EF4444");
        const ownerName = getOwnerName(userId);
        const base = tilesToGeoJson(tiles);
        const geoJson = {
          ...base,
          features: base.features.map((f) => ({
            ...f,
            properties: {
              ...f.properties,
              ownerName,
              color: displayColor,
              top3: effectiveTileCrossings[f.properties.key] ?? [],
            },
          })),
        };

        return { userId, color: displayColor, geoJson };
      });
    }

    // Global mode: use backend territory data
    const byUser: Record<number, TerritoryData> = {};

    for (const t of allTerritories) {
      if (!t.tiles?.length) continue;
      const existing = byUser[t.userId];

      if (!existing || t.tiles.length > existing.tiles.length) byUser[t.userId] = t;
    }

    return Object.values(byUser).map((t) => {
      const isOwn = t.userId === backendUserId;
      const displayColor = isOwn ? "#3B82F6" : "#EF4444";
      const ownerName = getOwnerName(t.userId);
      const base = tilesToGeoJson(t.tiles);
      const geoJson = {
        ...base,
        features: base.features.map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            ownerName,
            color: displayColor,
            top3: effectiveTileCrossings[f.properties.key] ?? [],
          },
        })),
      };

      return { userId: t.userId, color: displayColor, geoJson };
    });
  }, [
    allTerritories,
    showTerritories,
    effectiveTileCrossings,
    backendUserId,
    zoneMode,
    token,
    userMetaMap,
  ]);

  const gameStats = useMemo(
    () => ({
      routeCount: qualifyingActivities.length,
      totalDistanceKm: qualifyingActivities.reduce((s, a) => s + a.distance, 0) / 1000,
      uniqueTiles: allTiles.length,
      areaKm2: allTiles.length * TILE_AREA_KM2,
    }),
    [qualifyingActivities, allTiles],
  );

  // Sidebar-filtered activity list (applies search + type + sort)
  const sidebarFilteredActivities = useMemo(() => {
    let list = activities.filter((a) => a.map?.summary_polyline);

    if (routeTypeFilter === "qualifying")
      list = list.filter((a) => a.qualifying ?? checkQualifying(a).qualifying);
    else if (routeTypeFilter === "cycling")
      list = list.filter((a) => CYCLING_TYPES.includes(a.sport_type ?? a.type));
    if (routeSearch.trim()) {
      const q = routeSearch.toLowerCase();

      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      let va = 0,
        vb = 0;

      if (routeSortField === "date") {
        va = new Date(a.start_date_local).getTime();
        vb = new Date(b.start_date_local).getTime();
      } else if (routeSortField === "distance") {
        va = a.distance;
        vb = b.distance;
      } else if (routeSortField === "elevation") {
        va = a.total_elevation_gain;
        vb = b.total_elevation_gain;
      }

      return routeSortDir === "desc" ? vb - va : va - vb;
    });
  }, [activities, routeTypeFilter, routeSearch, routeSortField, routeSortDir]);

  const sidebarFilteredRoutes = useMemo(
    () =>
      sidebarFilteredActivities.map((a) => ({
        id: a.id,
        activity: a,
        positions: decodePolyline(a.map.summary_polyline),
      })),
    [sidebarFilteredActivities],
  );

  // Which routes to render on map based on view mode + sidebar filter
  const visibleRoutes = useMemo(() => {
    if (viewMode === "none") return [];
    if (viewMode === "single")
      return activeActivityId ? sidebarFilteredRoutes.filter((r) => r.id === activeActivityId) : [];

    return sidebarFilteredRoutes;
  }, [viewMode, sidebarFilteredRoutes, activeActivityId]);

  const VIEW_MODES: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "Alle", icon: <Rows3 size={13} /> },
    { key: "single", label: "Einzeln", icon: <Route size={13} /> },
    { key: "none", label: "Keine", icon: <EyeOff size={13} /> },
  ];

  return (
    <div className="flex h-[calc(100dvh-64px-56px)] md:h-[calc(100dvh-64px)] relative">
      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-2 md:p-4 min-w-0 relative">
        {/* Mobile: floating sidebar toggle button */}
        <button
          className="absolute top-4 right-4 z-[600] md:hidden bg-primary text-primary-foreground rounded-full p-3 shadow-lg"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>
        <div
          className="relative h-full w-full rounded-2xl overflow-hidden border-2 border-divider shadow-lg"
          data-tour="map-container"
        >
          <MapContainer
            scrollWheelZoom
            center={GERMANY_CENTER}
            maxBounds={GERMANY_MAP_BOUNDS}
            maxBoundsViscosity={0.8}
            maxZoom={18}
            minZoom={5}
            style={{ height: "100%", width: "100%" }}
            zoom={6}
          >
            <TileLayer attribution={tile.attribution} url={tile.url} />

            <FitGermany />

            {/* Territory layers — one per user, each in their own color + owner tooltip */}
            {territoriesGeoJsonMap.map(({ userId, color, geoJson }) => (
              <GeoJSON
                key={`t-${userId}-${geoJson.features.length}-${Object.keys(tileCrossings).length}`}
                data={geoJson}
                style={() => ({
                  fillColor: color,
                  fillOpacity: 0.28,
                  color,
                  weight: 0.4,
                  opacity: 0.5,
                })}
                onEachFeature={(feature, layer) => {
                  const name = feature.properties?.ownerName ?? "Unbekannt";
                  const c = feature.properties?.color ?? color;
                  const top3: TileCrossingEntry[] = feature.properties?.top3 ?? [];
                  const medals = ["🥇", "🥈", "🥉"];
                  const rows = top3
                    .map(
                      (e, i) =>
                        `<div style="display:flex;align-items:center;gap:5px;padding:2px 0">
                      <span style="font-size:12px;width:16px;text-align:center">${medals[i]}</span>
                      <span style="width:8px;height:8px;border-radius:50%;background:${e.color};display:inline-block;flex-shrink:0"></span>
                      <span style="font-size:11px;flex:1;white-space:nowrap">${e.firstname} ${e.lastname.charAt(0)}.</span>
                      <span style="font-size:11px;font-weight:700;color:${e.color}">${e.crossingCount}×</span>
                    </div>`,
                    )
                    .join("");

                  layer.bindTooltip(
                    `<div style="min-width:170px;font-family:system-ui,sans-serif">
                      <div style="display:flex;align-items:center;gap:6px;margin-bottom:7px;padding-bottom:6px;border-bottom:1px solid rgba(128,128,128,0.2)">
                        <span style="width:10px;height:10px;border-radius:2px;background:${c};flex-shrink:0;display:inline-block"></span>
                        <span style="font-size:12px;font-weight:700">${name}</span>
                        <span style="font-size:9px;margin-left:auto;background:${c}33;color:${c};padding:1px 5px;border-radius:4px;font-weight:600">Besitzer</span>
                      </div>
                      <div style="font-size:9px;font-weight:700;color:#888;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px">Überfahrten</div>
                      ${rows || '<div style="font-size:11px;color:#999">Keine Daten</div>'}
                    </div>`,
                    {
                      sticky: false,
                      className: "route-hover-popup",
                      direction: "top",
                      offset: [0, -10],
                    },
                  );
                }}
              />
            ))}

            {/* Friend activity routes — shown when in friends mode */}
            {zoneMode === "friends" &&
              friendActivities.map((fa) => {
                const positions = fa.map?.summary_polyline
                  ? decodePolyline(fa.map.summary_polyline)
                  : [];

                if (positions.length === 0) return null;

                return (
                  <Polyline
                    key={`friend-${fa.id}`}
                    color="#2563EB"
                    opacity={0.5}
                    positions={positions}
                    weight={2}
                  />
                );
              })}

            {/* Routes with hover popup — only when territories are hidden */}
            {visibleRoutes.map((r) => (
              <HoverablePolyline
                key={r.id}
                activity={r.activity}
                hidePopup={showTerritories}
                isActive={activeActivityId === r.id}
                positions={r.positions}
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

      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-[400] bg-black/40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <div
        className={`
        shrink-0 bg-content1/95 backdrop-blur-sm
        md:bg-transparent md:backdrop-blur-none md:p-4 md:pl-0
        md:relative md:w-96 md:translate-x-0 md:top-auto md:bottom-auto
        fixed right-0 top-16 bottom-14 z-[500] w-96 max-w-[90vw]
        transition-transform duration-200 ease-in-out
        ${mobileSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
      `}
      >
        <div className="flex flex-col h-full border-l border-divider bg-content1/95 md:border md:rounded-2xl md:shadow-lg md:overflow-hidden backdrop-blur-sm">
          {/* Mobile close button */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-divider md:hidden shrink-0">
            <span className="font-bold text-sm">Navigation</span>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => setMobileSidebarOpen(false)}
            >
              <X size={16} />
            </Button>
          </div>

          {/* Tab buttons */}
          <div className="flex shrink-0 border-b border-divider" data-tour="sidebar-tabs">
            {(["routes", "map", "game"] as const).map((t) => (
              <button
                key={t}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                  tab === t
                    ? "text-primary border-b-2 border-primary"
                    : "text-default-400 hover:text-default-600"
                }`}
                onClick={() => setTab(t)}
              >
                {t === "routes" && (
                  <>
                    <Map size={12} />
                    Routen
                  </>
                )}
                {t === "map" && (
                  <>
                    <Layers size={12} />
                    Karte
                  </>
                )}
                {t === "game" && (
                  <>
                    <Trophy size={12} />
                    Spiel
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Persistent zones toggle + mode */}
          <div className="flex flex-col border-b border-divider shrink-0" data-tour="map-controls">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-medium text-default-600">
                {showTerritories ? (
                  <Eye className="text-[#FC4C02]" size={13} />
                ) : (
                  <EyeOff size={13} />
                )}
                Zonen anzeigen
              </div>
              <Switch
                color="warning"
                isSelected={showTerritories}
                size="sm"
                onValueChange={setShowTerritories}
              />
            </div>
            {showTerritories && (
              <div className="flex px-3 pb-2 gap-1">
                {(
                  [
                    { key: "global", label: "Deutschlandweit" },
                    { key: "friends", label: "Freunde" },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                      zoneMode === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-content2 text-default-500 hover:bg-content3"
                    }`}
                    onClick={() => setZoneMode(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Freunde-Liste (nur im Freunde-Modus) ─────────────────────────── */}
          {zoneMode === "friends" && showTerritories && (
            <div className="border-b border-divider shrink-0 px-3 py-2 flex flex-col gap-1.5">
              <p className="text-[10px] font-bold text-default-400 uppercase tracking-wide">
                Aktive Freunde
              </p>
              {allTerritories.filter((t) => t.userId !== backendUserId).length === 0 ? (
                <p className="text-xs text-default-400 py-1">
                  Keine Freunde auf VeloVeni gefunden.
                </p>
              ) : (
                allTerritories
                  .filter((t) => t.userId !== backendUserId)
                  .map((t) => (
                    <div key={t.userId} className="flex items-center gap-2 py-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="text-xs font-medium flex-1 truncate">
                        {t.firstname ? `${t.firstname} ${t.lastname}` : `User ${t.userId}`}
                      </span>
                      <span className="text-[10px] text-default-400 shrink-0">
                        {t.tileCount} Felder · {t.areaKm2.toFixed(1)} km²
                      </span>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* ── Tab: Routen ──────────────────────────────────────────────────── */}
          {tab === "routes" && (
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
                  <Button
                    as="a"
                    className="bg-[#FC4C02] text-white font-semibold"
                    href={getAuthUrl()}
                    size="sm"
                  >
                    Mit Strava verbinden
                  </Button>
                </div>
              ) : (
                <>
                  {token && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-content2 shrink-0">
                      <Avatar
                        name={token.athlete.firstname}
                        size="sm"
                        src={token.athlete.profile}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {token.athlete.firstname} {token.athlete.lastname}
                        </p>
                        <p className="text-xs font-medium" style={{ color: "#FC4C02" }}>
                          Strava verbunden
                        </p>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        title="Trennen"
                        variant="light"
                        onPress={disconnect}
                      >
                        <LogOut size={14} />
                      </Button>
                    </div>
                  )}

                  {/* ViewMode quick selector */}
                  {activities.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {VIEW_MODES.map(({ key, label, icon }) => (
                        <button
                          key={key}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                            viewMode === key
                              ? "bg-[#FC4C02] text-white"
                              : "bg-content2 text-default-500 hover:bg-content3"
                          }`}
                          onClick={() => setViewMode(key)}
                        >
                          {icon}
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ── Filter controls ─────────────────────────────────── */}
                  {activities.length > 0 && (
                    <div className="flex flex-col gap-2 shrink-0 p-2 rounded-xl bg-content2/60 border border-divider">
                      {/* Search */}
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-content1 border border-divider">
                        <Search className="text-default-400 shrink-0" size={12} />
                        <input
                          className="flex-1 text-xs bg-transparent outline-none placeholder:text-default-400 min-w-0"
                          placeholder="Fahrt suchen…"
                          value={routeSearch}
                          onChange={(e) => setRouteSearch(e.target.value)}
                        />
                        {routeSearch && (
                          <button
                            className="text-default-400 hover:text-default-600 shrink-0"
                            onClick={() => setRouteSearch("")}
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Type filter */}
                      <div className="flex gap-1">
                        {(
                          [
                            { key: "qualifying", label: "Spielwürdig" },
                            { key: "cycling", label: "Rad" },
                            { key: "all", label: "Alle" },
                          ] as const
                        ).map(({ key, label }) => (
                          <button
                            key={key}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                              routeTypeFilter === key
                                ? "bg-primary text-primary-foreground"
                                : "bg-content1 text-default-500 hover:bg-content3"
                            }`}
                            onClick={() => setRouteTypeFilter(key)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Sort */}
                      <div className="flex gap-1 items-center">
                        {(
                          [
                            { key: "date", label: "Datum" },
                            { key: "distance", label: "Distanz" },
                            { key: "elevation", label: "Höhe" },
                          ] as const
                        ).map(({ key, label }) => (
                          <button
                            key={key}
                            className={`flex-1 flex items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                              routeSortField === key
                                ? "bg-primary text-primary-foreground"
                                : "bg-content1 text-default-500 hover:bg-content3"
                            }`}
                            onClick={() => {
                              if (routeSortField === key)
                                setRouteSortDir((d) => (d === "desc" ? "asc" : "desc"));
                              else {
                                setRouteSortField(key);
                                setRouteSortDir("desc");
                              }
                            }}
                          >
                            {label}
                            {routeSortField === key &&
                              (routeSortDir === "desc" ? (
                                <SortDesc size={10} />
                              ) : (
                                <SortAsc size={10} />
                              ))}
                          </button>
                        ))}
                      </div>

                      {/* Reset */}
                      <button
                        className={`w-full py-1 rounded-lg text-[10px] font-semibold transition-colors ${routeTypeFilter !== "qualifying" || routeSearch || routeSortField !== "date" || routeSortDir !== "desc" ? "bg-danger/10 text-danger hover:bg-danger/20" : "bg-content1 text-default-300 cursor-default"}`}
                        disabled={routeTypeFilter === "qualifying" && !routeSearch && routeSortField === "date" && routeSortDir === "desc"}
                        onClick={() => {
                          setRouteTypeFilter("qualifying");
                          setRouteSearch("");
                          setRouteSortField("date");
                          setRouteSortDir("desc");
                        }}
                      >
                        Filter zurücksetzen
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between shrink-0">
                    {activities.length === 0 ? (
                      <Button
                        fullWidth
                        isLoading={activitiesLoading}
                        size="sm"
                        startContent={!activitiesLoading && <RefreshCw size={14} />}
                        variant="flat"
                        onPress={syncActivities}
                      >
                        Aktivitäten synchronisieren
                      </Button>
                    ) : (
                      <>
                        <span className="text-xs text-default-400">
                          {sidebarFilteredActivities.length} von {activities.length}
                        </span>
                        <Button
                          isIconOnly
                          isLoading={activitiesLoading}
                          size="sm"
                          variant="light"
                          onPress={syncActivities}
                        >
                          {!activitiesLoading && <RefreshCw size={14} />}
                        </Button>
                      </>
                    )}
                  </div>

                  <ScrollShadow className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                    <div className="flex flex-col gap-1 pb-4">
                      {activitiesLoading && activities.length === 0 ? (
                        <div className="flex justify-center py-10">
                          <Spinner size="sm" />
                        </div>
                      ) : (
                        sidebarFilteredActivities.map((a) => (
                          <ActivityItem
                            key={a.id}
                            activity={a}
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

          {/* ── Tab: Karte ───────────────────────────────────────────────────── */}
          {tab === "map" && (
            <div className="p-3 flex flex-col gap-3">
              <p className="text-xs text-default-400 font-semibold uppercase tracking-wide">
                Kartentyp
              </p>
              {(Object.keys(TILE_LAYERS) as TileKey[]).map((key) => (
                <button
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                    tileKey === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-divider hover:bg-content2"
                  }`}
                  onClick={() => setTileKey(key)}
                >
                  <Layers size={16} />
                  <span className="text-sm font-medium flex-1">{TILE_LAYERS[key].label}</span>
                  {tileKey === key && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Aktiv
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Tab: Spiel ───────────────────────────────────────────────────── */}
          {tab === "game" && (
            <div className="p-3 flex flex-col gap-3">
              <p className="text-xs text-default-400 font-semibold uppercase tracking-wide">
                Dein Gebiet
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: gameStats.routeCount,
                    label: "Routen",
                    color: "text-[#FC4C02]",
                    bg: "bg-[#FC4C02]/10",
                  },
                  {
                    value: `${gameStats.totalDistanceKm.toFixed(0)} km`,
                    label: "Strecke",
                    color: "text-primary",
                    bg: "bg-primary/10",
                  },
                  {
                    value: gameStats.uniqueTiles,
                    label: "Felder",
                    color: "text-success",
                    bg: "bg-success/10",
                  },
                  {
                    value: `${gameStats.areaKm2.toFixed(0)} km²`,
                    label: "Fläche",
                    color: "text-secondary",
                    bg: "bg-secondary/10",
                  },
                ].map(({ value, label, color, bg }) => (
                  <div key={label} className={`p-3 rounded-xl ${bg} text-center`}>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-default-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <Button
                fullWidth
                isLoading={recalcLoading}
                size="sm"
                startContent={!recalcLoading && <RefreshCw size={14} />}
                variant="flat"
                onPress={handleRecalculate}
              >
                Felder neu berechnen
              </Button>

              <div className="p-3 rounded-xl bg-content2">
                <p className="text-xs font-semibold mb-2">Qualifying-Kriterien</p>
                {[
                  "🚴 Rad-Aktivität (kein Lauf/Swim)",
                  "📍 GPS-Track vorhanden",
                  "🇩🇪 Startpunkt in Deutschland",
                  "📏 Mindestens 1 km Strecke",
                ].map((c) => (
                  <p key={c} className="text-xs text-default-500 mt-1">
                    {c}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
