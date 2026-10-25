import { XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import {
  CHAT_BACKGROUNDS,
  DEFAULT_CHAT_SETTINGS,
  type ChatSettings,
} from "../../lib/chatSettings";

interface ChatSettingsPanelProps {
  settings: ChatSettings;
  onChange: (next: ChatSettings) => void;
  onClose: () => void;
}

export default function ChatSettingsPanel({ settings, onChange, onClose }: ChatSettingsPanelProps) {
  const update = (patch: Partial<ChatSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="chat-settings">
      <div className="chat-settings-head">
        <strong>Настройки чата</strong>
        <button className="icon-btn sm" onClick={onClose} aria-label="Закрыть">
          <XMarkIcon style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div className="chat-settings-body">
        <div className="chat-setting-group">
          <span className="chat-setting-label">Фон</span>
          <div className="chat-bg-grid">
            {CHAT_BACKGROUNDS.map((b) => (
              <button
                key={b.key}
                className={`chat-bg-swatch${settings.background === b.key ? " active" : ""}`}
                title={b.label}
                onClick={() => update({ background: b.key })}
                style={{ background: b.css || undefined }}
              >
                {!b.css && <span className="chat-bg-default-label">Aa</span>}
              </button>
            ))}
            <button
              className={`chat-bg-swatch${settings.background === "custom" ? " active" : ""}`}
              title="Своя"
              onClick={() => update({ background: "custom" })}
              style={{ background: settings.customBg || "var(--bg-secondary)" }}
            />
          </div>
          {settings.background === "custom" && (
            <input
              className="input"
              style={{ marginTop: 6 }}
              placeholder="CSS-цвет или градиент"
              value={settings.customBg}
              onChange={(e) => update({ customBg: e.target.value })}
            />
          )}
        </div>

        <div className="chat-setting-group">
          <span className="chat-setting-label">
            Размер текста <span className="chat-setting-value">{settings.fontSize}px</span>
          </span>
          <input
            type="range"
            min={12}
            max={22}
            value={settings.fontSize}
            onChange={(e) => update({ fontSize: Number(e.target.value) })}
          />
        </div>

        <div className="chat-setting-group">
          <span className="chat-setting-label">
            Закругление <span className="chat-setting-value">{settings.bubbleRadius}px</span>
          </span>
          <input
            type="range"
            min={0}
            max={24}
            value={settings.bubbleRadius}
            onChange={(e) => update({ bubbleRadius: Number(e.target.value) })}
          />
        </div>

        <div className="chat-setting-group">
          <span className="chat-setting-label">Цвет своих сообщений</span>
          <div className="chat-color-row">
            <input
              type="color"
              value={settings.ownColor}
              onChange={(e) => update({ ownColor: e.target.value })}
            />
            <span className="chat-setting-value">{settings.ownColor}</span>
          </div>
        </div>

        <div className="chat-setting-group">
          <span className="chat-setting-label">Плотность</span>
          <div className="feed-chips">
            <button
              type="button"
              className={`chip${settings.density === "cozy" ? " active" : ""}`}
              onClick={() => update({ density: "cozy" })}
            >
              Свободно
            </button>
            <button
              type="button"
              className={`chip${settings.density === "compact" ? " active" : ""}`}
              onClick={() => update({ density: "compact" })}
            >
              Плотно
            </button>
          </div>
        </div>

        <label className="chat-setting-toggle">
          <input
            type="checkbox"
            checked={settings.bubbleTail}
            onChange={(e) => update({ bubbleTail: e.target.checked })}
          />
          Хвостики у пузырей
        </label>
      </div>

      <button
        className="btn btn-secondary btn-sm chat-settings-reset"
        onClick={() => onChange({ ...DEFAULT_CHAT_SETTINGS })}
      >
        <ArrowPathIcon style={{ width: 15, height: 15 }} /> Сбросить
      </button>
    </div>
  );
}
