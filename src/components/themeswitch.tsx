import { useTheme } from '@/features/theme/theme-context';
import { Sun, Moon } from 'lucide-react';

export default function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Theme wechseln"
      className={`
        relative flex items-center h-8 w-[68px] rounded-full p-1 cursor-pointer
        transition-colors duration-300 border border-divider shrink-0
        ${isDark ? 'bg-content3' : 'bg-content2'}
      `}
    >
      {/* Sun icon — left side */}
      <span className={`absolute left-2 flex items-center justify-center transition-opacity duration-200 ${isDark ? 'opacity-30' : 'opacity-0'}`}>
        <Sun size={14} className="text-warning" />
      </span>

      {/* Moon icon — right side */}
      <span className={`absolute right-2 flex items-center justify-center transition-opacity duration-200 ${isDark ? 'opacity-0' : 'opacity-30'}`}>
        <Moon size={14} className="text-secondary" />
      </span>

      {/* Sliding thumb */}
      <span
        className={`
          relative z-10 flex items-center justify-center
          w-6 h-6 rounded-full shadow-medium
          transition-all duration-300 ease-in-out
          ${isDark ? 'translate-x-9 bg-content4' : 'translate-x-0 bg-white'}
        `}
      >
        {isDark
          ? <Moon size={13} className="text-secondary" />
          : <Sun  size={13} className="text-warning" />
        }
      </span>
    </button>
  );
}
