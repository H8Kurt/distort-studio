export type Skin = "cyber" | "webcore";

export function getSkin(): Skin {
  if (typeof document === "undefined") return "cyber";
  const stored = localStorage.getItem("skin");
  if (stored === "cyber" || stored === "webcore") return stored;
  return "cyber";
}

export function applySkin(skin: Skin) {
  document.documentElement.setAttribute("data-skin", skin);
  localStorage.setItem("skin", skin);
}
