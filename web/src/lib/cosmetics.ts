import type { CSSProperties } from "react";

export interface FramePreset {
  id: string;
  name: string;
  gradient: string;
}

export interface BannerPreset {
  id: string;
  name: string;
  gradient: string;
}

const FALLBACK_BANNER = "linear-gradient(135deg,#241a2e,#120c18 60%,#3a1420)";

export const FRAMES: FramePreset[] = [
  { id: "none", name: "Без рамки", gradient: "transparent" },
  { id: "blood", name: "Кровавая", gradient: "linear-gradient(135deg,#8b2e2e,#e04545,#4a0e0e)" },
  { id: "violet", name: "Неон", gradient: "linear-gradient(135deg,#5a3a78,#b06cf0,#3a1f5a)" },
  { id: "gold", name: "Золото", gradient: "linear-gradient(135deg,#a9822e,#f5d76e,#7a5a1a)" },
  { id: "cyber", name: "Кибер", gradient: "linear-gradient(135deg,#00e5ff,#ff00e5,#00e5ff)" },
  { id: "ash", name: "Пепел", gradient: "linear-gradient(135deg,#555,#c4c4cf,#777)" },
  { id: "toxic", name: "Токсин", gradient: "linear-gradient(135deg,#4b8b2e,#b6ff45,#2a4a0e)" },
  { id: "aurora", name: "Сияние", gradient: "linear-gradient(135deg,#00ffa3,#00b3ff,#b06cf0)" },
  { id: "ember", name: "Угли", gradient: "linear-gradient(135deg,#ff9a00,#ff4400,#7a1500)" },
  { id: "frost", name: "Мороз", gradient: "linear-gradient(135deg,#bfe9ff,#5fa8d3,#1c3f5c)" },
];

export const BANNERS: BannerPreset[] = [
  { id: "none", name: "По умолчанию", gradient: FALLBACK_BANNER },
  { id: "crimson", name: "Багровый закат", gradient: "linear-gradient(120deg,#4a0e0e,#8b2e2e 45%,#2a0a0a)" },
  { id: "violet", name: "Фиалковая дымка", gradient: "linear-gradient(135deg,#3a1f5a,#7a4db0 55%,#1a0f2a)" },
  { id: "cyber", name: "Кибер-сетка", gradient: "linear-gradient(135deg,#0b1e2e,#0e5a6e 50%,#1a0f2a)" },
  { id: "sunset", name: "Закат", gradient: "linear-gradient(135deg,#ff7e5f,#feb47b,#8b2e2e)" },
  { id: "toxic", name: "Токсичный", gradient: "linear-gradient(135deg,#1a2e1a,#3fae5a,#0e1a0e)" },
  { id: "mono", name: "Монохром", gradient: "linear-gradient(135deg,#1a1a1f,#4a4a55,#1a1a1f)" },
];

export function getFrame(id?: string | null): FramePreset {
  return FRAMES.find((f) => f.id === id) || FRAMES[0];
}

export function frameStyle(id?: string | null): CSSProperties {
  const frame = getFrame(id);
  if (frame.id === "none") return { background: "transparent", padding: 0 };
  return { background: frame.gradient, padding: 3 };
}

// Значение bannerUrl может быть: пусто/none, "preset:<id>" или URL/data-URI.
export function bannerStyle(bannerUrl?: string | null): CSSProperties {
  if (!bannerUrl || bannerUrl === "preset:none") {
    return { backgroundImage: FALLBACK_BANNER };
  }
  if (bannerUrl.startsWith("preset:")) {
    const preset = BANNERS.find((b) => b.id === bannerUrl.slice("preset:".length));
    return { backgroundImage: preset?.gradient || FALLBACK_BANNER };
  }
  return {
    backgroundImage: `url(${bannerUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
