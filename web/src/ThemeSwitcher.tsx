import { useState, useEffect } from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";

interface Theme {
  id: string;
  name: string;
  colors: string[];
}

const themes: Theme[] = [
  { 
    id: 'cyber-dark', 
    name: 'Cyber Dark', 
    colors: ['#0a0a0f', '#8b5cf6', '#a78bfa'] 
  },
  { 
    id: 'light', 
    name: 'Clean Light', 
    colors: ['#f8fafc', '#6366f1', '#818cf8'] 
  },
  { 
    id: 'midnight', 
    name: 'Midnight Blue', 
    colors: ['#0f172a', '#3b82f6', '#60a5fa'] 
  },
  { 
    id: 'sunset', 
    name: 'Sunset Orange', 
    colors: ['#1a1a1f', '#f97316', '#fb923c'] 
  },
  { 
    id: 'forest', 
    name: 'Forest Green', 
    colors: ['#0c1a12', '#10b981', '#34d399'] 
  },
  { 
    id: 'neon', 
    name: 'Neon Pink', 
    colors: ['#0f0a15', '#ec4899', '#f472b6'] 
  },
];

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'cyber-dark';
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary btn-icon"
        data-tooltip="Сменить тему"
      >
        <SparklesIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 glass-strong rounded-xl border border-gray-700/50 shadow-2xl z-50 animate-fade-in overflow-hidden">
            <div className="p-4 border-b border-gray-700/50">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-purple-400" />
                Выберите тему
              </h3>
            </div>
            
            <div className="p-3 grid grid-cols-2 gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setCurrentTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`relative p-3 rounded-lg border transition-all duration-200 text-left ${
                    currentTheme === theme.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700/50 hover:border-gray-600 bg-gray-800/50'
                  }`}
                >
                  <div className="flex gap-1 mb-2">
                    {theme.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-white font-medium">{theme.name}</span>
                  {currentTheme === theme.id && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
