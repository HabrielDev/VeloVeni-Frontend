import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Tabs, Tab } from "@heroui/react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { MapPin, Trophy, UserCircle, Bike, Route } from "lucide-react"; // Passende Icons
import ThemeSwitch from "./themeswitch";

export default function HomePage() {
  const location = useLocation();

  // Konfiguration für die Tabs (um Redundanz zu vermeiden)
  const navItems = [
    { key: "/maps", label: "Maps", icon: MapPin, to: "/maps" },
    { key: "/rides", label: "Rides", icon: Route, to: "/rides" },
    { key: "/leaderboard", label: "Leaderboard", icon: Trophy, to: "/leaderboard" },
    { key: "/profile", label: "Profile", icon: UserCircle, to: "/profile" },
  ];

  return (
    <Navbar
      maxWidth="xl"
      className="glass-nav"
      classNames={{
        wrapper: "px-6 h-16",
        item: "data-[active=true]:after:content-[''] data-[active=true]:after:absolute data-[active=true]:after:bottom-0 data-[active=true]:after:left-0 data-[active=true]:after:right-0 data-[active=true]:after:h-[2px] data-[active=true]:after:bg-primary",
      }}
    >
      {/* LINKS: Branding mit Icon */}
      <NavbarBrand className="gap-2 group">
        <Bike className="w-7 h-7 text-primary group-hover:animate-pulse" />
        <p className="font-extrabold text-inherit text-2xl tracking-tight">
          Velo<span className="text-primary">Veni</span>
        </p>
      </NavbarBrand>

      {/* MITTE: Navigation als gleich breite Tabs */}
      <NavbarContent className="hidden md:flex" justify="center">
        <Tabs
          aria-label="Navigation"
          variant="light"
          selectedKey={location.pathname}
          color="primary"
          classNames={{
            tabList: "gap-1 bg-content1/50 p-1 rounded-full border border-divider", // Pille-Look
            cursor: "w-full bg-primary rounded-full shadow-md",
            tab: "px-6 h-10 rounded-full",
            // Dies zwingt alle Tabs auf die gleiche Breite (w-full im Container)
            tabContent: "group-data-[selected=true]:text-primary-foreground font-semibold w-full justify-center"
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
                  <item.icon className="w-5 h-5 opacity-80 group-data-[selected=true]:opacity-100" />
                  <span className="tracking-tight">{item.label}</span>
                </Link>
              }
            />
          ))}
        </Tabs>
      </NavbarContent>

      {/* RECHTS: ThemeSwitcher & evtl. User Avatar */}
      <NavbarContent justify="end">
        <NavbarItem className="flex items-center gap-4">
          <ThemeSwitch />
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}