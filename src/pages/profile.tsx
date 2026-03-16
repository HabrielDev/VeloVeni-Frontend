import type { PrivacySettings } from "@/api/backend";

import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Card, CardBody, Chip, Divider, Spinner, Switch } from "@heroui/react";
import {
  Bike,
  Ruler,
  Clock,
  TrendingUp,
  Trophy,
  Map,
  RefreshCw,
  LogOut,
  Download,
  Trash2,
  ShieldCheck,
  ExternalLink,
  Shield,
  X,
} from "lucide-react";

import { getAuthUrl } from "@/api/strava";
import { useStrava } from "@/features/auth/strava-context";
import { useTour } from "@/features/tour/tour-context";
import {
  deleteAccount,
  exportMyData,
  getPrivacySettings,
  updatePrivacySettings,
} from "@/api/backend";
import { checkQualifying, getConqueredTiles, decodePolyline, TILE_AREA_KM2 } from "@/utils/geo";

function fmtDistance(m: number) {
  return `${(m / 1000).toFixed(1)} km`;
}
function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);

  return h > 0 ? `${h}h ${min}min` : `${min}min`;
}

export default function ProfilePage() {
  const { jwtToken, token, activities, activitiesLoading, syncActivities, disconnect } =
    useStrava();
  const { tourEnabled, setTourEnabled } = useTour();

  const [privacyHintVisible, setPrivacyHintVisible] = useState(() => {
    try { return localStorage.getItem("vv-profile-hint-v1") !== "seen"; } catch { return false; }
  });
  const dismissPrivacyHint = () => {
    setPrivacyHintVisible(false);
    try { localStorage.setItem("vv-profile-hint-v1", "seen"); } catch { /* ignore */ }
  };

  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [privacy, setPrivacy] = useState<PrivacySettings>({ shareZones: true, shareRides: false });
  const [privacyLoading, setPrivacyLoading] = useState(false);

  const qualifying = useMemo(
    () => activities.filter((a) => a.qualifying ?? checkQualifying(a).qualifying),
    [activities],
  );

  const uniqueTiles = useMemo(() => {
    const tiles = new Set<string>();

    for (const a of qualifying) {
      if (!a.map?.summary_polyline) continue;
      const positions = decodePolyline(a.map.summary_polyline);

      for (const t of getConqueredTiles(positions)) tiles.add(t);
    }

    return tiles.size;
  }, [qualifying]);

  useEffect(() => {
    if (!jwtToken) return;
    getPrivacySettings(jwtToken)
      .then(setPrivacy)
      .catch(() => {});
  }, [jwtToken]);

  const stats = useMemo(
    () => ({
      totalActivities: activities.length,
      qualifyingCount: qualifying.length,
      totalDistanceKm: activities.reduce((s, a) => s + a.distance, 0) / 1000,
      totalElevation: activities.reduce((s, a) => s + a.total_elevation_gain, 0),
      totalTime: activities.reduce((s, a) => s + a.moving_time, 0),
      cyclingCount: activities.filter((a) => {
        const t = a.sport_type ?? a.type;

        return ["Ride", "EBikeRide", "GravelRide", "MountainBikeRide", "VirtualRide"].includes(t);
      }).length,
      uniqueTiles,
      areaKm2: uniqueTiles * TILE_AREA_KM2,
    }),
    [activities, qualifying, uniqueTiles],
  );

  const handlePrivacyChange = async (key: keyof PrivacySettings, value: boolean) => {
    if (!jwtToken) return;
    const updated = { ...privacy, [key]: value };

    setPrivacy(updated);
    setPrivacyLoading(true);
    try {
      await updatePrivacySettings(jwtToken, { [key]: value });
    } catch {
      setPrivacy(privacy); // revert on error
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handleExport = async () => {
    if (!jwtToken) return;
    setExporting(true);
    try {
      const data = await exportMyData(jwtToken);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "veloveni-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!jwtToken) return;
    if (
      !confirm(
        "Account und alle Daten unwiderruflich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteAccount(jwtToken);
      disconnect();
    } catch {
      console.error("Delete failed");
      setDeleting(false);
    }
  };

  if (!jwtToken) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 bg-[#FC4C02] rounded-full flex items-center justify-center shadow-xl">
          <span className="text-white font-extrabold text-3xl">S</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Profil</h1>
          <p className="text-default-400 text-sm leading-relaxed">
            Verbinde deinen Strava-Account, um dein Profil und deine Statistiken zu sehen.
          </p>
        </div>
        <Button
          as="a"
          className="bg-[#FC4C02] text-white font-semibold px-8"
          href={getAuthUrl()}
          size="lg"
        >
          Mit Strava verbinden
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* ── Profile header ────────────────────────────────────────────── */}
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center gap-5">
            <Avatar
              className="w-20 h-20 text-2xl shrink-0"
              name={token?.athlete.firstname}
              src={token?.athlete.profile}
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {token?.athlete.firstname} {token?.athlete.lastname}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Chip
                  color="warning"
                  size="sm"
                  startContent={<span className="text-[10px] font-bold pl-1">S</span>}
                  variant="flat"
                >
                  Strava verbunden
                </Chip>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                isLoading={activitiesLoading}
                size="sm"
                startContent={!activitiesLoading && <RefreshCw size={13} />}
                variant="flat"
                onPress={syncActivities}
              >
                Sync
              </Button>
              <Button
                color="default"
                size="sm"
                startContent={<LogOut size={13} />}
                variant="light"
                onPress={disconnect}
              >
                Trennen
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Game stats ────────────────────────────────────────────────── */}
      {activitiesLoading && activities.length === 0 ? (
        <div className="flex justify-center py-8">
          <Spinner label="Lade Statistiken..." size="lg" />
        </div>
      ) : (
        activities.length > 0 && (
          <>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-default-400 mb-3 flex items-center gap-2">
                <Trophy size={14} /> Spielstatistiken
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    value: stats.qualifyingCount,
                    label: "Qualif. Routen",
                    color: "text-[#FC4C02]",
                    bg: "bg-[#FC4C02]/10",
                  },
                  {
                    value: stats.uniqueTiles,
                    label: "Felder",
                    color: "text-success",
                    bg: "bg-success/10",
                  },
                  {
                    value: `${stats.areaKm2.toFixed(0)} km²`,
                    label: "Fläche",
                    color: "text-secondary",
                    bg: "bg-secondary/10",
                  },
                  {
                    value: `${stats.totalDistanceKm.toFixed(0)} km`,
                    label: "Gesamtstrecke",
                    color: "text-primary",
                    bg: "bg-primary/10",
                  },
                ].map(({ value, label, color, bg }) => (
                  <Card key={label}>
                    <CardBody className={`p-4 text-center ${bg}`}>
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-default-400 mt-0.5">{label}</p>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-default-400 mb-3 flex items-center gap-2">
                <Bike size={14} /> Aktivitätsübersicht
              </h2>
              <Card>
                <CardBody className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      icon: <Bike size={18} />,
                      value: stats.cyclingCount,
                      label: "Radtouren",
                      color: "text-[#FC4C02]",
                    },
                    {
                      icon: <Ruler size={18} />,
                      value: fmtDistance(stats.totalDistanceKm * 1000),
                      label: "Gesamtstrecke",
                      color: "text-primary",
                    },
                    {
                      icon: <TrendingUp size={18} />,
                      value: `${Math.round(stats.totalElevation / 1000)} km`,
                      label: "Höhenmeter",
                      color: "text-success",
                    },
                    {
                      icon: <Clock size={18} />,
                      value: fmtDuration(stats.totalTime),
                      label: "Gesamtzeit",
                      color: "text-secondary",
                    },
                  ].map(({ icon, value, label, color }) => (
                    <div key={label} className="flex flex-col items-center text-center gap-1">
                      <span className={color}>{icon}</span>
                      <p className="font-bold text-base leading-tight">{value}</p>
                      <p className="text-xs text-default-400">{label}</p>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </div>
          </>
        )
      )}

      {/* ── Qualifying criteria ───────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-default-400 mb-3 flex items-center gap-2">
          <Map size={14} /> Qualifying-Kriterien
        </h2>
        <Card>
          <CardBody className="p-4 flex flex-col gap-2">
            {[
              "🚴  Rad-Aktivität (Ride, GravelRide, MountainBikeRide …)",
              "📍  GPS-Track vorhanden",
              "🇩🇪  Startpunkt innerhalb Deutschlands",
              "📏  Mindestens 1 km Streckenlänge",
            ].map((c) => (
              <p key={c} className="text-sm text-default-600">
                {c}
              </p>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* ── Privacy settings ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-default-400 mb-3 flex items-center gap-2">
          <Shield size={14} /> Sichtbarkeit & Teilen
        </h2>

        {privacyHintVisible && (
          <Card className="mb-3 border border-primary shadow-md">
            <CardBody className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-sm leading-tight">Sichtbarkeit & Teilen</p>
                <button
                  aria-label="Hinweis schließen"
                  className="text-default-400 hover:text-default-600 shrink-0 mt-0.5"
                  onClick={dismissPrivacyHint}
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-default-500 leading-relaxed">
                Hier stellst du ein, ob andere Spieler deine Strecken und Felder auf der Karte sehen können.
              </p>
              <div className="flex justify-end">
                <Button color="primary" size="sm" onPress={dismissPrivacyHint}>
                  Verstanden
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody className="p-4 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">Zonen teilen</p>
                <p className="text-xs text-default-400 mt-0.5 leading-relaxed">
                  Andere Spieler können deine eroberten Gebiete auf der Karte sehen.
                </p>
              </div>
              <Switch
                color="warning"
                isDisabled={privacyLoading}
                isSelected={privacy.shareZones}
                size="sm"
                onValueChange={(v) => handlePrivacyChange("shareZones", v)}
              />
            </div>
            <Divider />
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">Fahrten teilen</p>
                <p className="text-xs text-default-400 mt-0.5 leading-relaxed">
                  Strava-Freunde können deine Fahrrouten auf der Karte im Freunde-Modus sehen.
                </p>
              </div>
              <Switch
                color="primary"
                isDisabled={privacyLoading}
                isSelected={privacy.shareRides}
                size="sm"
                onValueChange={(v) => handlePrivacyChange("shareRides", v)}
              />
            </div>
            <Divider />
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">Einführungstour</p>
                <p className="text-xs text-default-400 mt-0.5 leading-relaxed">
                  Zeige beim nächsten Besuch der Karte eine Einführungstour an.
                </p>
              </div>
              <Switch
                color="secondary"
                isSelected={tourEnabled}
                size="sm"
                onValueChange={setTourEnabled}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── DSGVO / Account ───────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-default-400 mb-3 flex items-center gap-2">
          <ShieldCheck size={14} /> Datenschutz & Account
        </h2>
        <Card>
          <CardBody className="p-4 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Download className="text-default-400 mt-0.5 shrink-0" size={16} />
              <div className="flex-1">
                <p className="text-sm font-medium">Daten exportieren</p>
                <p className="text-xs text-default-400 mt-0.5 leading-relaxed">
                  Lade alle deine gespeicherten Daten als JSON herunter (DSGVO Art. 20).
                </p>
              </div>
              <Button
                isLoading={exporting}
                size="sm"
                startContent={!exporting && <ExternalLink size={13} />}
                variant="flat"
                onPress={handleExport}
              >
                Exportieren
              </Button>
            </div>

            <Divider />

            <div className="flex items-start gap-3">
              <Trash2 className="text-danger mt-0.5 shrink-0" size={16} />
              <div className="flex-1">
                <p className="text-sm font-medium">Account löschen</p>
                <p className="text-xs text-default-400 mt-0.5 leading-relaxed">
                  Löscht deinen Account und alle zugehörigen Daten unwiderruflich (DSGVO Art. 17).
                </p>
              </div>
              <Button
                color="danger"
                isLoading={deleting}
                size="sm"
                startContent={!deleting && <Trash2 size={13} />}
                variant="flat"
                onPress={handleDelete}
              >
                Löschen
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
