import type { LeaderboardEntry } from "@/api/backend";

import { useEffect, useRef, useState } from "react";
import { Avatar, Card, CardBody, Chip, Spinner } from "@heroui/react";
import { Trophy, Map, Route, Ruler, Globe, Users } from "lucide-react";
import { Button } from "@heroui/react";
import { animate, stagger } from "animejs";

import { useStrava } from "@/features/auth/strava-context";
import { getLeaderboard, getFriendsLeaderboard } from "@/api/backend";
import { getAuthUrl } from "@/api/strava";

type LeaderboardMode = "global" | "friends";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function PodiumCard({
  entry,
  isMe,
  order,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  order: number;
}) {
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!countRef.current || !entry.tileCount) return;
    const obj = { v: 0 };

    animate(obj, {
      v: entry.tileCount,
      duration: 1400,
      delay: (order === 1 ? 0 : order === 2 ? 130 : 260),
      easing: "easeOutExpo",
      onUpdate: () => {
        if (countRef.current) countRef.current.textContent = Math.round(obj.v).toString();
      },
    });
  }, [entry.tileCount, order]);

  return (
    <Card className={`podium-card ${isMe ? "ring-2 ring-primary" : ""}`}>
      <CardBody
        className={`p-4 flex flex-col items-center gap-2 text-center ${order === 1 ? "pt-6" : "pt-4"}`}
      >
        <span className="text-2xl">{MEDAL[order]}</span>
        <Avatar className="w-12 h-12" name={entry.firstname} src={entry.profilePicture} />
        <div>
          <p className="text-sm font-semibold truncate max-w-[100px]">
            {entry.firstname} {entry.lastname.charAt(0)}.
          </p>
          <p className="text-xs text-default-400 mt-0.5">
            <span ref={countRef}>{entry.tileCount}</span> Felder
          </p>
        </div>
        {isMe && (
          <Chip color="primary" size="sm" variant="flat">
            Du
          </Chip>
        )}
      </CardBody>
    </Card>
  );
}

export default function LeaderboardPage() {
  const { jwtToken, backendUserId } = useStrava();
  const [mode, setMode] = useState<LeaderboardMode>("global");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const podiumRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jwtToken) return;
    setLoading(true);
    setError(null);
    setEntries([]);
    const fetch = mode === "friends" ? getFriendsLeaderboard : getLeaderboard;

    fetch(jwtToken)
      .then(setEntries)
      .catch(() => setError("Leaderboard konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [jwtToken, mode]);

  // Animate podium + list when entries arrive
  useEffect(() => {
    if (!entries.length) return;

    // Podium cards: staggered spring bounce from below
    if (podiumRef.current) {
      const cards = podiumRef.current.querySelectorAll<HTMLElement>(".podium-card");
      animate(cards, {
        translateY: { from: "50px", to: "0px" },
        opacity: { from: 0, to: 1 },
        scale: { from: 0.88, to: 1 },
        delay: stagger(130),
        duration: 700,
        easing: "spring(1, 80, 10, 0)",
      });
    }

    // Full list: staggered slide in from right
    if (listRef.current) {
      const rows = listRef.current.querySelectorAll<HTMLElement>(".list-row");
      animate(rows, {
        translateX: { from: "30px", to: "0px" },
        opacity: { from: 0, to: 1 },
        delay: stagger(35),
        duration: 420,
        easing: "easeOutCubic",
      });
    }
  }, [entries]);

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Leader<span className="text-primary">board</span>
          </h1>
          <p className="text-sm text-default-400 mt-0.5">Rangliste nach eroberten Feldern</p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-content2 border border-divider">
          {(
            [
              { key: "global", label: "Deutschlandweit", icon: <Globe size={14} /> },
              { key: "friends", label: "Freunde", icon: <Users size={14} /> },
            ] as const
          ).map(({ key, label, icon }) => (
            <button
              key={key}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-default-500 hover:text-default-700"
              }`}
              onClick={() => setMode(key)}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner label="Lade Rangliste..." size="lg" />
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
            {mode === "friends" ? (
              <Users className="text-default-300" size={36} />
            ) : (
              <Trophy className="text-default-300" size={36} />
            )}
            <p className="text-sm font-medium">
              {mode === "friends"
                ? "Keine Strava-Freunde bei VeloVeni"
                : "Noch keine Einträge vorhanden."}
            </p>
            {mode === "friends" && (
              <p className="text-xs text-default-400 max-w-xs">
                Nur Strava-Freunde, die ebenfalls VeloVeni nutzen, erscheinen hier.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {!loading && entries.length > 0 && (
        <>
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <div ref={podiumRef} className="grid grid-cols-3 gap-3">
              {[entries[1], entries[0], entries[2]].map((e, i) => {
                const order = [2, 1, 3][i];
                const isMe = e.userId === backendUserId;

                return (
                  <PodiumCard
                    key={e.userId}
                    entry={e}
                    isMe={isMe}
                    order={order}
                  />
                );
              })}
            </div>
          )}

          {/* Full ranked list */}
          <Card>
            <CardBody className="p-0">
              <div ref={listRef}>
              {entries.map((e, idx) => {
                const isMe = e.userId === backendUserId;

                return (
                  <div
                    key={e.userId}
                    className={`list-row flex items-center gap-3 px-4 py-3 border-b border-divider last:border-0 transition-colors ${
                      isMe ? "bg-primary/5" : idx % 2 === 0 ? "" : "bg-content2/40"
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
                    <Avatar
                      className="shrink-0"
                      name={e.firstname}
                      size="sm"
                      src={e.profilePicture}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : ""}`}>
                        {e.firstname} {e.lastname}
                        {isMe && (
                          <span className="ml-1.5 text-xs font-normal text-primary/70">(Du)</span>
                        )}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4 text-xs text-default-500 shrink-0">
                      <span className="flex items-center gap-1">
                        <Map size={12} />
                        {e.tileCount} Felder
                      </span>
                      <span className="flex items-center gap-1">
                        <Ruler size={12} />
                        {e.areaKm2.toFixed(0)} km²
                      </span>
                      <span className="flex items-center gap-1">
                        <Route size={12} />
                        {e.routeCount} Routen
                      </span>
                    </div>
                    <div className="sm:hidden text-right shrink-0">
                      <p className="text-sm font-bold text-[#FC4C02]">{e.tileCount}</p>
                      <p className="text-xs text-default-400">Felder</p>
                    </div>
                  </div>
                );
              })}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
