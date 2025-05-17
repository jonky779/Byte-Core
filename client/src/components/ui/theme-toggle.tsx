import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Wait for component to mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col space-y-1">
      <button
        onClick={() => setTheme("light")}
        className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm text-gray-200 hover:bg-gray-800 ${theme === "light" ? "bg-gray-800" : ""}`}
      >
        <div className="flex items-center">
          <Sun className="h-4 w-4 mr-2" />
          Light Theme
        </div>
        {theme === "light" && <span className="ml-auto">✓</span>}
      </button>
      
      <button
        onClick={() => setTheme("dark")}
        className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm text-gray-200 hover:bg-gray-800 ${theme === "dark" ? "bg-gray-800" : ""}`}
      >
        <div className="flex items-center">
          <Moon className="h-4 w-4 mr-2" />
          Dark Theme
        </div>
        {theme === "dark" && <span className="ml-auto">✓</span>}
      </button>
      
      <button
        onClick={() => setTheme("system")}
        className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm text-gray-200 hover:bg-gray-800 ${theme === "system" ? "bg-gray-800" : ""}`}
      >
        <div className="flex items-center">
          <Monitor className="h-4 w-4 mr-2" />
          System Theme
        </div>
        {theme === "system" && <span className="ml-auto">✓</span>}
      </button>
    </div>
  );
}