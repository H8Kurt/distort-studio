import { useState } from "react";
import { applySkin, getSkin, type Skin } from "../../lib/skin";

interface SkinSwitcherProps {
  full?: boolean;
  onChange?: (skin: Skin) => void;
}

export default function SkinSwitcher({ full = false, onChange }: SkinSwitcherProps) {
  const [skin, setSkin] = useState<Skin>(getSkin);

  const pick = (next: Skin) => {
    setSkin(next);
    applySkin(next);
    onChange?.(next);
  };

  return (
    <div className={`skin-switch${full ? " w-full" : ""}`} role="group" aria-label="Скин">
      <button
        type="button"
        className={`skin-switch-btn${skin === "cyber" ? " active" : ""}`}
        onClick={() => pick("cyber")}
        aria-pressed={skin === "cyber"}
      >
        Y2K
      </button>
      <button
        type="button"
        className={`skin-switch-btn${skin === "webcore" ? " active" : ""}`}
        onClick={() => pick("webcore")}
        aria-pressed={skin === "webcore"}
      >
        かわいい
      </button>
    </div>
  );
}
