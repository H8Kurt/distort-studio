export interface ChatSettings {
  background: string;
  customBg: string;
  fontSize: number;
  bubbleRadius: number;
  density: "cozy" | "compact";
  ownColor: string;
  bubbleTail: boolean;
}

export interface ChatBackgroundPreset {
  key: string;
  label: string;
  css: string;
}

export const CHAT_BACKGROUNDS: ChatBackgroundPreset[] = [
  { key: "default", label: "По умолчанию", css: "" },
  { key: "dusk", label: "Сумерки", css: "linear-gradient(160deg, #2b1055, #7597de)" },
  { key: "sunset", label: "Закат", css: "linear-gradient(160deg, #ff9a9e, #fad0c4, #fbc2eb)" },
  { key: "mint", label: "Мята", css: "linear-gradient(160deg, #d4fc79, #96e6a1)" },
  { key: "graphite", label: "Графит", css: "linear-gradient(160deg, #232526, #414345)" },
  { key: "dots", label: "Точки", css: "radial-gradient(rgba(255,255,255,0.28) 1px, transparent 1px)", },
  { key: "grid", label: "Сетка", css: "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)" },
];

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  background: "default",
  customBg: "",
  fontSize: 15,
  bubbleRadius: 14,
  density: "cozy",
  ownColor: "#4f7cff",
  bubbleTail: true,
};

const KEY = "chat-settings";

export function loadChatSettings(): ChatSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_CHAT_SETTINGS };
    return { ...DEFAULT_CHAT_SETTINGS, ...(JSON.parse(raw) as Partial<ChatSettings>) };
  } catch {
    return { ...DEFAULT_CHAT_SETTINGS };
  }
}

export function saveChatSettings(settings: ChatSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function applyChatSettings(el: HTMLElement | null, settings: ChatSettings) {
  if (!el) return;
  const preset = CHAT_BACKGROUNDS.find((b) => b.key === settings.background);
  let bg = settings.background === "custom" ? settings.customBg : preset?.css || "";
  if (settings.background === "dots") bg += " ";
  el.style.setProperty("--chat-bg", bg || "transparent");
  el.style.setProperty("--chat-font-size", `${settings.fontSize}px`);
  el.style.setProperty("--chat-radius", `${settings.bubbleRadius}px`);
  el.style.setProperty("--chat-own", settings.ownColor);
  el.dataset.tails = settings.bubbleTail ? "on" : "off";
  el.dataset.density = settings.density;
  if (settings.background === "dots") {
    el.style.setProperty("--chat-bg-size", "18px 18px");
  } else if (settings.background === "grid") {
    el.style.setProperty("--chat-bg-size", "26px 26px");
  } else {
    el.style.removeProperty("--chat-bg-size");
  }
  el.dataset.chatBg = settings.background;
}
