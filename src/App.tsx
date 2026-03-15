import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/features/theme/theme-context';
import { StravaProvider } from '@/features/auth/strava-context';
import NavigationBar from '@/components/navigationbar';
import ConsentBanner from '@/components/consent-banner';
import MapsPage from './pages/maps';
import RidesPage from './pages/rides';
import ProfilePage from './pages/profile';
import LeaderboardPage from './pages/leaderboard';
import StravaCallback from './pages/strava-callback';

function App() {
  return (
    <ThemeProvider>
      <StravaProvider>
        <NavigationBar />
        <ConsentBanner />
        <main className="pb-14 md:pb-0">
          <Routes>
            <Route element={<MapsPage />} path="/maps" />
            <Route element={<RidesPage />} path="/rides" />
            <Route element={<ProfilePage />} path="/profile" />
            <Route element={<LeaderboardPage />} path="/leaderboard" />
            <Route element={<StravaCallback />} path="/strava/callback" />
          </Routes>
        </main>
      </StravaProvider>
    </ThemeProvider>
  );
}

export default App;
