import { Route, Routes } from "react-router-dom";
import MapsPage from "./pages/maps";
import RidesPage from "./pages/rides";
import StravaCallback from "./pages/strava-callback";
import NavigationBar from "@/components/navigationbar";
import { StravaProvider } from "@/features/auth/strava-context";

function App() {
  return (
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
  );
}

export default App;
