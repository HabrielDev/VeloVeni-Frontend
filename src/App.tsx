import { Navigate, Route, Routes } from "react-router-dom";

import MapsPage from "./pages/maps";
import RidesPage from "./pages/rides";
import ProfilePage from "./pages/profile";
import LeaderboardPage from "./pages/leaderboard";
import StravaCallback from "./pages/strava-callback";

import { ThemeProvider } from "@/features/theme/theme-context";
import { StravaProvider } from "@/features/auth/strava-context";
import { TourProvider } from "@/features/tour/tour-context";
import TourOverlay from "@/features/tour/TourOverlay";
import NavigationBar from "@/components/navigationbar";
import ConsentBanner from "@/components/consent-banner";

function App() {
  return (
    <ThemeProvider>
      <StravaProvider>
        <TourProvider>
          <TourOverlay />
          <NavigationBar />
          <ConsentBanner />
          <main className="pb-14 md:pb-0">
            <Routes>
              <Route element={<Navigate replace to="/maps" />} path="/" />
              <Route element={<MapsPage />} path="/maps" />
              <Route element={<RidesPage />} path="/rides" />
              <Route element={<ProfilePage />} path="/profile" />
              <Route element={<LeaderboardPage />} path="/leaderboard" />
              <Route element={<StravaCallback />} path="/strava/callback" />
            </Routes>
          </main>
        </TourProvider>
      </StravaProvider>
    </ThemeProvider>
  );
}

export default App;
