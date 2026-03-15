import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/features/theme/theme-context';
import { StravaProvider } from '@/features/auth/strava-context';
import NavigationBar from '@/components/navigationbar';
import MapsPage from './pages/maps';
import RidesPage from './pages/rides';
import StravaCallback from './pages/strava-callback';

function App() {
  return (
    <ThemeProvider>
      <StravaProvider>
        <NavigationBar />
        <main>
          <Routes>
            <Route element={<MapsPage />} path="/maps" />
            <Route element={<RidesPage />} path="/rides" />
            <Route element={<StravaCallback />} path="/strava/callback" />
          </Routes>
        </main>
      </StravaProvider>
    </ThemeProvider>
  );
}

export default App;
