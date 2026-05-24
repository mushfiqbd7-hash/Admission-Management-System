import { useTheme } from "../../context/ThemeContext";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  
  // Sun icon (shows in dark mode)
  const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  );
  
  // Moon icon (shows in light mode)
  const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex items-center gap-2 px-3 py-2 rounded-lg 
                 bg-[var(--surface-hover)] hover:bg-[var(--border)] 
                 text-[var(--text-primary)] transition-all duration-200
                 focus:outline-none focus:ring-2 focus:ring-[var(--navy-400)]
                 border border-[var(--border)]"
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
      <span className="text-xs font-medium hidden sm:inline">
        {resolvedTheme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}