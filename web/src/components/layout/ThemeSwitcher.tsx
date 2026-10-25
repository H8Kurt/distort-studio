import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

export default function ThemeSwitcher({ full = true }: { full?: boolean }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const dark = theme === "dark";

  return (
    <button
      className={`btn btn-secondary btn-sm ${full ? "w-full" : ""}`}
      onClick={() => setTheme(dark ? "light" : "dark")}
      type="button"
      aria-label="Переключить тему"
    >
      {dark ? (
        <SunIcon style={{ width: 16, height: 16, color: "var(--accent-acid)" }} />
      ) : (
        <MoonIcon style={{ width: 16, height: 16, color: "var(--accent-electric)" }} />
      )}
      <span className="font-pixel">{dark ? "Светлая тема" : "Тёмная тема"}</span>
    </button>
  );
}
