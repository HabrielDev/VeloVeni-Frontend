export interface TourStep {
  target: string; // data-tour value, or '' for centered placement
  title: string;
  content: string;
  placement: "bottom" | "left" | "center";
  mobileSkip?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: "",
    title: "Willkommen bei VeloVeni!",
    content:
      "Entdecke Deutschland auf dem Fahrrad und erobere Gebiete mit deinen GPS-Routen. Diese kurze Tour zeigt dir die wichtigsten Funktionen.",
    placement: "center",
  },
  {
    target: "nav-bar",
    title: "Navigation",
    content:
      "Hier erreichst du alle Bereiche: Karte, Fahrten, Rangliste und dein Profil.",
    placement: "bottom",
  },
  {
    target: "sidebar-tabs",
    title: "Seitenleiste",
    content:
      "Wechsle zwischen Routen (deine Fahrten), Karte (Kartentyp wählen) und Spiel (deine Gebietsstatistiken).",
    placement: "left",
    mobileSkip: true,
  },
  {
    target: "map-controls",
    title: "Gebietssteuerung",
    content:
      "Schalte Gebietsfärbungen ein oder aus und wechsle zwischen der deutschlandweiten Ansicht und dem Freunde-Modus.",
    placement: "left",
    mobileSkip: true,
  },
];
