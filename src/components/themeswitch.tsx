import { Switch } from "@heroui/react";
import { useTheme } from "@heroui/use-theme";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";


export default function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <Switch
      isSelected={isDark}
      onValueChange={(isSelected) => setTheme(isSelected ? "dark" : "light")}
      color="primary"
      size="md"
      startContent={<Sun size={20} />}
      endContent={<Moon size={20} />}
    />
  );
}