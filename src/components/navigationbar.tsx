import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Tabs, Tab, Avatar } from "@heroui/react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { MapPin, Trophy, UserCircle, Route } from "lucide-react";
import ThemeSwitch from "./themeswitch";
import { useStrava } from "@/features/auth/strava-context";

function BikeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28" height="28" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      {/* Frame */}
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
      <path d="M8 6h5" />
      <circle cx="15" cy="5" r="1" />

      {/* Rear wheel */}
      <g className="bike-wheel">
        <circle cx="5.5" cy="17.5" r="3.5" fill="black" stroke="white" strokeWidth="1" />
        <line x1="5.5" y1="14"   x2="5.5" y2="21"   stroke="white" strokeWidth="1" />
        <line x1="2"   y1="17.5" x2="9"   y2="17.5" stroke="white" strokeWidth="1" />
        <line x1="3.03" y1="15.03" x2="7.97" y2="19.97" stroke="white" strokeWidth="1" />
        <line x1="7.97" y1="15.03" x2="3.03" y2="19.97" stroke="white" strokeWidth="1" />
      </g>

      {/* Front wheel */}
      <g className="bike-wheel">
        <circle cx="18.5" cy="17.5" r="3.5" fill="black" stroke="white" strokeWidth="1" />
        <line x1="18.5" y1="14"   x2="18.5" y2="21"   stroke="white" strokeWidth="1" />
        <line x1="15"   y1="17.5" x2="22"   y2="17.5" stroke="white" strokeWidth="1" />
        <line x1="16.03" y1="15.03" x2="20.97" y2="19.97" stroke="white" strokeWidth="1" />
        <line x1="20.97" y1="15.03" x2="16.03" y2="19.97" stroke="white" strokeWidth="1" />
      </g>
    </svg>
  );
}

export default function NavigationBar() {
  const location = useLocation();
  const { token } = useStrava();

  const navItems = [
    { key: "/maps",        label: "Maps",        icon: MapPin,      to: "/maps" },
    { key: "/rides",       label: "Rides",       icon: Route,       to: "/rides" },
    { key: "/leaderboard", label: "Leaderboard", icon: Trophy,      to: "/leaderboard" },
    { key: "/profile",     label: "Profil",      icon: UserCircle,  to: "/profile" },
  ];

  return (
    <>
      {/* ── Desktop navbar ──────────────────────────────────────────────── */}
      <Navbar
        maxWidth="xl"
        className="glass-nav"
        classNames={{
          wrapper: "px-6 h-16",
          item: "data-[active=true]:after:content-[''] data-[active=true]:after:absolute data-[active=true]:after:bottom-0 data-[active=true]:after:left-0 data-[active=true]:after:right-0 data-[active=true]:after:h-[2px] data-[active=true]:after:bg-primary",
        }}
      >
        <NavbarBrand className="gap-2">
          <span className="bike-pedal">
            <BikeIcon className="text-primary" />
          </span>
          <p className="font-extrabold text-inherit text-2xl tracking-tight">
            Velo<span className="text-primary">Veni</span>
          </p>
        </NavbarBrand>

        <NavbarContent className="hidden md:flex" justify="center">
          <Tabs
            aria-label="Navigation"
            variant="light"
            selectedKey={location.pathname}
            color="primary"
            classNames={{
              tabList: "gap-1 bg-content1/50 p-1 rounded-full border border-divider",
              cursor: "w-full bg-primary rounded-full shadow-md",
              tab: "px-6 h-10 rounded-full",
              tabContent: "group-data-[selected=true]:text-primary-foreground font-semibold w-full justify-center",
            }}
          >
            {navItems.map((item) => (
              <Tab
                key={item.key}
                title={
                  <Link
                    as={RouterLink}
                    to={item.to}
                    className="flex items-center gap-2.5 text-inherit w-full justify-center"
                  >
                    {item.key === "/profile" && token ? (
                      <Avatar
                        src={token.athlete.profile}
                        name={token.athlete.firstname}
                        className="w-5 h-5 shrink-0"
                      />
                    ) : (
                      <item.icon className="w-5 h-5 opacity-80 group-data-[selected=true]:opacity-100" />
                    )}
                    <span className="tracking-tight">{item.label}</span>
                  </Link>
                }
              />
            ))}
          </Tabs>
        </NavbarContent>

        <NavbarContent justify="end">
          <NavbarItem className="flex items-center gap-3">
            <ThemeSwitch />
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      {/* ── Mobile bottom navigation ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[1000] flex border-t border-divider bg-content1/95 backdrop-blur-md">
        {navItems.map((item) => {
          const active = location.pathname === item.key;
          return (
            <RouterLink
              key={item.key}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? 'text-primary' : 'text-default-400'
              }`}
            >
              {item.key === "/profile" && token ? (
                <Avatar
                  src={token.athlete.profile}
                  name={token.athlete.firstname}
                  className={`w-5 h-5 transition-transform ${active ? 'scale-110 ring-2 ring-primary' : ''}`}
                />
              ) : (
                <item.icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
              )}
              <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
              {active && <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />}
            </RouterLink>
          );
        })}
      </nav>
    </>
  );
}
