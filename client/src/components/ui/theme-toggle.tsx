import { useTheme } from "next-themes";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
    <>
      <DropdownMenuItem onClick={() => setTheme("light")}>
        <Sun className="h-4 w-4 mr-2" />
        Light Theme
        {theme === "light" && <span className="ml-auto">✓</span>}
      </DropdownMenuItem>
      
      <DropdownMenuItem onClick={() => setTheme("dark")}>
        <Moon className="h-4 w-4 mr-2" />
        Dark Theme
        {theme === "dark" && <span className="ml-auto">✓</span>}
      </DropdownMenuItem>
      
      <DropdownMenuItem onClick={() => setTheme("system")}>
        <Monitor className="h-4 w-4 mr-2" />
        System Theme
        {theme === "system" && <span className="ml-auto">✓</span>}
      </DropdownMenuItem>
    </>
  );
}