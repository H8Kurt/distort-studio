import { useState } from "react";
import type { ReactNode } from "react";
import {
  MusicalNoteIcon,
  UsersIcon,
  ArrowsRightLeftIcon,
  ShoppingBagIcon,
  BoltIcon,
  HeartIcon,
} from "@heroicons/react/24/solid";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ThemeSwitcher from "./components/layout/ThemeSwitcher";
import PaletteSwitcher from "./components/layout/PaletteSwitcher";
import SkinSwitcher from "./components/layout/SkinSwitcher";
import Atmosphere from "./components/ui/Atmosphere";
import Marquee from "./components/ui/Marquee";
import Sticker from "./components/ui/Sticker";
import Tape from "./components/ui/Tape";
import HoloText from "./components/ui/HoloText";
import ChromeText from "./components/ui/ChromeText";
import JpText from "./components/ui/JpText";
import Barcode from "./components/ui/Barcode";
import CrtWindow from "./components/ui/CrtWindow";
import { LatinNote, OrnamentDivider, VisitorCounter, PixelBat } from "./components/ui/GothicBits";
import {
  Win98Window,
  PixelStar,
  Sparkle,
  PixelGhost,
  PixelCat,
  Kaomoji,
  RainbowText,
  DesktopIcon,
} from "./components/ui/WebcoreBits";
import { getSkin, type Skin } from "./lib/skin";
import type { User } from "./types";

interface LandingPageProps {
  onAuthenticated: (user: User) => void;
}

/* ============================================================
   GOTHIC (cyber) — сдержанный, мрачный, много чёрного воздуха
   ============================================================ */
const GOTHIC_TICKER = ["memento mori", "✠", "requiem aeternam", "MMIII", "sub rosa", "✝", "dies irae", "tenebrae", "ordo ab chao"];

const GOTHIC_FEATURES = [
  { n: "I", title: "Студия", text: "Треки и арты, проекты прямо в браузере." },
  { n: "II", title: "Коллабы", text: "Соавторы, роли и общий чат." },
  { n: "III", title: "Версии", text: "Ветки и откаты для звука и картинок." },
  { n: "IV", title: "Магазин", text: "Сэмплы, пресеты, обложки." },
];

const GOTHIC_STEPS = [
  { n: "I", title: "Заведи проект", text: "Приватно или на всеобщее обозрение." },
  { n: "II", title: "Фиксируй версии", text: "Контрольные точки, как в git." },
  { n: "III", title: "Зови соавторов", text: "И выпускай релиз вместе." },
];

const GOTHIC_RELICS = [
  { file: "night_drive.flp", tag: "dark synth", year: "2003" },
  { file: "collab_pack.zip", tag: "stems ×4", year: "2002" },
  { file: "y2k_textures.png", tag: "assets", year: "2001" },
];

function GothicBody({ onAuthenticated }: LandingPageProps) {
  const [mode, setMode] = useState<"login" | "register">("register");

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "2rem 1.5rem 4rem", position: "relative", zIndex: 2 }}>
      <section
        className="landing-grid"
        style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: "4rem", alignItems: "start" }}
      >
        <div>
          <div className="eyebrow">memento mori</div>

          <h1
            className="font-display"
            style={{ fontSize: "clamp(2.7rem, 6.4vw, 5rem)", lineHeight: 1.02, margin: "0.7rem 0 0.9rem" }}
          >
            Собери <HoloText>свою</HoloText>
            <br />
            <span className="neon">сцену.</span>
          </h1>

          <LatinNote style={{ display: "block", fontSize: "1.15rem", marginBottom: "1.3rem" }}>
            requiem aeternam · mundus MMIII
          </LatinNote>

          <p className="text-text-secondary" style={{ maxWidth: 520, marginBottom: "1.9rem" }}>
            <strong style={{ color: "var(--text-primary)" }}>Distort Studio</strong> — соцсеть и git для художников и
            музыкантов: проекты, версии, коллабы, магазин ассетов. Забытый собор раннего интернета — снова открыт.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "2rem" }}>
            <a href="#join" className="btn btn-primary btn-lg">
              <BoltIcon style={{ width: 16, height: 16 }} /> Войти в сцену
            </a>
            <a href="#how" className="btn btn-secondary btn-lg">
              Как это работает
            </a>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <VisitorCounter count={66613} />
            <PixelBat size={30} className="float-slow" />
            <span className="tech-label">est. mdcccclxvi</span>
          </div>
        </div>

        <div id="join" style={{ position: "relative", marginTop: "-1.75rem" }}>
          <CrtWindow title="/// DISTORT.EXE — 2003">
            <div
              style={{
                display: "flex",
                gap: 6,
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.9rem",
                marginBottom: "1.3rem",
              }}
            >
              <button
                className={`btn btn-sm ${mode === "register" ? "btn-primary" : "btn-ghost"}`}
                style={{ flex: 1 }}
                onClick={() => setMode("register")}
              >
                Регистрация
              </button>
              <button
                className={`btn btn-sm ${mode === "login" ? "btn-primary" : "btn-ghost"}`}
                style={{ flex: 1 }}
                onClick={() => setMode("login")}
              >
                Вход
              </button>
            </div>

            {mode === "register" ? (
              <RegisterForm onAuthenticated={onAuthenticated} />
            ) : (
              <LoginForm onAuthenticated={onAuthenticated} />
            )}
          </CrtWindow>

          <div style={{ marginTop: 14, textAlign: "right" }}>
            <LatinNote style={{ fontSize: "0.95rem" }}>anno domini · secure</LatinNote>
          </div>
        </div>
      </section>

      <OrnamentDivider style={{ margin: "3.5rem 0" }} />

      <section style={{ marginBottom: "3.5rem" }}>
        <div className="eyebrow" style={{ marginBottom: "1.2rem" }}>
          ordo ab chao
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem" }}>
          {GOTHIC_FEATURES.map((f) => (
            <div key={f.n} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.9rem" }}>
              <div className="tech-label" style={{ color: "var(--accent-primary)", marginBottom: 8 }}>
                {f.n}
              </div>
              <div className="gothic-label font-display" style={{ fontSize: "1.35rem", marginBottom: 6 }}>
                {f.title}
              </div>
              <div className="text-text-secondary" style={{ fontSize: "0.86rem" }}>
                {f.text}
              </div>
            </div>
          ))}
        </div>
      </section>

      <OrnamentDivider glyph="✝" style={{ margin: "3.5rem 0" }} />

      <section id="how" style={{ marginBottom: "3.5rem" }}>
        <div className="eyebrow" style={{ marginBottom: "1.2rem" }}>
          how it works
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {GOTHIC_STEPS.map((s) => (
            <div
              key={s.n}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr",
                gap: "1.2rem",
                alignItems: "baseline",
                padding: "1.1rem 0",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <div className="font-display" style={{ fontSize: "1.6rem", color: "var(--text-tertiary)" }}>
                {s.n}
              </div>
              <div>
                <div className="gothic-label font-display" style={{ fontSize: "1.3rem" }}>
                  {s.title}
                </div>
                <div className="text-text-secondary" style={{ fontSize: "0.86rem", marginTop: 4 }}>
                  {s.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <OrnamentDivider glyph="✠" style={{ margin: "3.5rem 0" }} />

      <section style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "1.2rem" }}>
          <div className="eyebrow">recent relics</div>
          <VisitorCounter count={1313} label="souls" />
        </div>
        <CrtWindow title="// archive.dir">
          {GOTHIC_RELICS.map((r) => (
            <div
              key={r.file}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "0.8rem 0",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <span className="tech-label" style={{ color: "var(--text-primary)" }}>
                {r.file}
              </span>
              <span className="tech-label">{r.tag}</span>
              <span className="tech-label">{r.year}</span>
            </div>
          ))}
        </CrtWindow>
      </section>

      <section style={{ textAlign: "center", padding: "2.5rem 0" }}>
        <h2 className="font-display" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", margin: "0.8rem 0 0.5rem" }}>
          Готов(а) <span className="neon">дистортить?</span>
        </h2>
        <LatinNote style={{ display: "block", marginBottom: "1.3rem" }}>velvet underground · three a.m.</LatinNote>
        <a href="#join" className="btn btn-primary btn-lg">
          Создать аккаунт
        </a>
      </section>

      <OrnamentDivider style={{ margin: "2.5rem 0 1.8rem" }} />

      <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <LatinNote>memento mori · distort studio © mmxxvi</LatinNote>
        <VisitorCounter count={66613} label="visitor" />
      </footer>
    </div>
  );
}

/* ============================================================
   KAWAII (webcore) — яркий коллаж 2000-х
   ============================================================ */
const FEATURES = [
  { icon: MusicalNoteIcon, title: "Студия онлайн", text: "Загружай треки и арты, собирай проекты прямо в браузере.", color: "linear-gradient(180deg,#67d7ff,#3b82f6)", tag: "REC" },
  { icon: UsersIcon, title: "Коллабы", text: "Зови соавторов и делай релиз вместе — роли, чат, реалтайм.", color: "linear-gradient(180deg,#c9a4ff,#7c3aed)", tag: "2x" },
  { icon: ArrowsRightLeftIcon, title: "Версии и ветки", text: "Как git, только для звука и картинок: fork, откат, diff.", color: "linear-gradient(180deg,#7ee8ff,#22cfff)", tag: "v1.0" },
  { icon: ShoppingBagIcon, title: "Магазин ассетов", text: "Продавай и покупай сэмплы, пресеты и обложки.", color: "linear-gradient(180deg,#ff9bde,#e11d9b)", tag: "NEW" },
];

const STEPS = [
  { n: "01", title: "Создай проект", text: "Новый трек, арт или релиз. Приватно или в публичную ленту." },
  { n: "02", title: "Коммить версии", text: "Сохраняй контрольные точки и ветки — как в git, но для креатива." },
  { n: "03", title: "Зови коллаб", text: "Приглашай соавторов, обменивайся файлами и выпускай вместе." },
];

const SHOWCASE = [
  { file: "night_drive.flp", tag: "DARK SYNTH", grad: "linear-gradient(135deg,#0b1030,#6b2fa0 60%,#ff2ec4)" },
  { file: "collab_pack.zip", tag: "STEMS ×4", grad: "linear-gradient(135deg,#04122a,#3b82f6 60%,#7dd3fc)" },
  { file: "y2k_textures.png", tag: "4K ASSETS", grad: "linear-gradient(135deg,#2a0f4a,#8b5cf6 55%,#ff9bde)" },
];

const TICKER_KAWAII = ["♡", "かわいい", "☆", "すごい", "✧", "daisuki", "(＾▽＾)", "ねこ", "pixels", "2000s", "♪", "オリジナル"];

function PolyPack({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 92 }}>
      {children}
      <span className="tech-label" style={{ letterSpacing: "0.16em" }}>
        {label}
      </span>
    </div>
  );
}

function KawaiiBody({ onAuthenticated }: LandingPageProps) {
  const [mode, setMode] = useState<"login" | "register">("register");

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "1.5rem 1.5rem 3rem", position: "relative", zIndex: 2 }}>
      <section
        style={{ display: "grid", gridTemplateColumns: "1.12fr 0.88fr", gap: "3rem", alignItems: "start" }}
        className="landing-grid"
      >
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
            <PixelStar size={40} />
            <PixelGhost size={44} className="float-slow" />
            <PixelCat size={44} />
            <Kaomoji>{"(＾▽＾)"}</Kaomoji>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="eyebrow">わたしのへや · моя комната в интернете</span>
            <Barcode style={{ color: "var(--accent-primary)" }} />
          </div>

          <h1 className="font-display" style={{ margin: "1rem 0 1.1rem", fontSize: "clamp(2.6rem, 6.6vw, 5.4rem)" }}>
            Собери <HoloText>свою</HoloText>
            <br />
            <RainbowText>сцену.</RainbowText>
          </h1>

          <p className="text-text-secondary" style={{ fontSize: "1.08rem", maxWidth: 560, marginBottom: "1.8rem" }}>
            <strong style={{ color: "var(--text-primary)" }}>Distort Studio</strong> — соцсеть и git для художников и
            музыкантов: проекты, версии, ветки, коллаборации и магазин ассетов. Твоя сцена, твои правила.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "2rem" }}>
            <a href="#join" className="btn btn-primary btn-lg">
              <BoltIcon style={{ width: 18, height: 18 }} /> Начать бесплатно
            </a>
            <a href="#how" className="btn btn-secondary btn-lg">
              <JpText>どうやって</JpText> Как это работает
            </a>
          </div>

          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            {[
              { v: "12K+", l: "артистов" },
              { v: "48K+", l: "треков и артов" },
              { v: "∞", l: "коллабов" },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-display neon" style={{ fontSize: "1.8rem", fontWeight: 800 }}>
                  {s.v}
                </div>
                <div className="tech-label">{s.l}</div>
              </div>
            ))}
            <span className="tech-label" style={{ marginLeft: "auto" }}>
              since 2004 ♡ dial-up ready
            </span>
          </div>
        </div>

        <div id="join" style={{ position: "relative", marginTop: "-1.75rem" }}>
          <Tape rotate={-7} style={{ top: -13, left: 24 }} />
          <Tape rotate={6} style={{ top: -13, right: 24 }} />
          <CrtWindow title="★ とうろく.exe ★" className="stripes animate-scale-in">
            <div
              style={{
                display: "flex",
                gap: 6,
                background: "var(--accent-soft)",
                border: "1px solid var(--border-color)",
                padding: 4,
                borderRadius: 999,
                marginBottom: "1.4rem",
              }}
            >
              <button
                className={`btn btn-sm ${mode === "register" ? "btn-primary" : "btn-ghost"}`}
                style={{ flex: 1 }}
                onClick={() => setMode("register")}
              >
                Регистрация
              </button>
              <button
                className={`btn btn-sm ${mode === "login" ? "btn-primary" : "btn-ghost"}`}
                style={{ flex: 1 }}
                onClick={() => setMode("login")}
              >
                Вход
              </button>
            </div>

            {mode === "register" ? (
              <RegisterForm onAuthenticated={onAuthenticated} />
            ) : (
              <LoginForm onAuthenticated={onAuthenticated} />
            )}
          </CrtWindow>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <Barcode style={{ color: "var(--text-tertiary)" }} />
            <span className="tech-label">♡ безопасно · уютно · для творчества</span>
          </div>
        </div>
      </section>

      <section style={{ position: "relative", margin: "3.5rem 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.2rem", alignItems: "flex-start", justifyContent: "center" }}>
          <Win98Window title="my_computer.exe" style={{ width: 280, transform: "rotate(-2deg)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <PixelCat size={48} />
              <div>
                <div className="gothic-label" style={{ fontSize: "0.9rem" }}>
                  ねこフォルダ
                </div>
                <div className="tech-label">C:\kawaii\neko</div>
              </div>
            </div>
            <div className="glitch-line" style={{ margin: "10px 0", opacity: 0.7 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Kaomoji>♡</Kaomoji>
              <Kaomoji>☆</Kaomoji>
              <Kaomoji>✧</Kaomoji>
              <Kaomoji>{"(‿◕)"}</Kaomoji>
            </div>
          </Win98Window>

          <div className="card" style={{ maxWidth: 340, transform: "rotate(1.5deg)" }}>
            <PixelGhost size={54} className="float-slow" />
            <RainbowText className="font-display" style={{ display: "block", fontSize: "1.35rem", marginTop: 8 }}>
              大好き ♡ 2000s
            </RainbowText>
            <p className="text-text-secondary" style={{ marginTop: 6 }}>
              Моя уютная комнатка в интернете. Слишком много всего — это фича <Kaomoji>{"(＾▽＾)"}</Kaomoji>
            </p>
          </div>

          <Win98Window title="♪ song.mp3" style={{ width: 250, transform: "rotate(3deg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkle size={18} />
              <span className="font-hand" style={{ fontSize: "1.35rem" }}>
                night_drive.mp3
              </span>
            </div>
            <div className="progress-bar" style={{ marginTop: 8 }}>
              <div className="progress-bar-fill" style={{ width: "62%" }} />
            </div>
            <div className="tech-label" style={{ marginTop: 6 }}>
              02:41 / 04:20
            </div>
          </Win98Window>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.4rem", justifyContent: "center", marginTop: "1.9rem" }}>
          <DesktopIcon icon="🖥️" label="My Computer" color="#7bd0ff" />
          <DesktopIcon icon="🌐" label="Internet" color="#8affd1" />
          <DesktopIcon icon="🎮" label="Games" color="#ffe98a" />
          <DesktopIcon icon="📁" label="Pictures" color="#d8b4fe" />
          <DesktopIcon icon="💾" label="Floppy (A:)" color="#ff9ec4" />
        </div>
      </section>

      <section style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0 }}>
            Всё для <HoloText>креатива</HoloText>
          </h2>
          <PixelStar size={34} />
          <JpText className="tech-label" style={{ marginBottom: 6 }}>
            すべてをひとつに
          </JpText>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.1rem" }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover tech-corners" style={{ padding: "1.3rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: f.color,
                    border: "1px solid rgba(255,255,255,0.55)",
                    boxShadow: "0 0 18px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <f.icon style={{ width: 24, height: 24, color: "#fff" }} />
                </div>
                <span className="tech-label">{f.tag}</span>
              </div>
              <div className="font-display" style={{ fontWeight: 800, fontSize: "1rem", marginTop: 14 }}>
                {f.title}
              </div>
              <div className="text-text-secondary" style={{ fontSize: "0.86rem", marginTop: 6 }}>
                {f.text}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "3.5rem" }}>
        <Win98Window title="kawaii_pack.exe">
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <PixelGhost size={50} className="float-slow" />
            <div>
              <div className="gothic-label" style={{ fontSize: "1rem" }}>
                かわいいキャラ · Kawaii Pack
              </div>
              <JpText className="tech-label">ピクセル · ぱっく</JpText>
            </div>
            <Sticker rotate={8} style={{ marginLeft: "auto" }}>
              ♡ 2 0 0 0 ♡
            </Sticker>
          </div>
          <div style={{ display: "flex", gap: "1.6rem", overflowX: "auto", paddingBottom: 6 }}>
            <PolyPack label="GHOST.OS">
              <PixelGhost size={78} className="float-slow" />
            </PolyPack>
            <PolyPack label="NEKO-01">
              <PixelCat size={78} />
            </PolyPack>
            <PolyPack label="STAR.RB">
              <PixelStar size={78} />
            </PolyPack>
            <PolyPack label="SPARKLE">
              <Sparkle size={64} />
            </PolyPack>
            <PolyPack label="ICON.DLL">
              <span aria-hidden style={{ fontSize: 54, lineHeight: 1 }}>
                🎀
              </span>
            </PolyPack>
            <PolyPack label="DORAYAKI">
              <span aria-hidden style={{ fontSize: 54, lineHeight: 1 }}>
                🍥
              </span>
            </PolyPack>
            <PolyPack label="GAMEBOY">
              <span aria-hidden style={{ fontSize: 54, lineHeight: 1 }}>
                🎮
              </span>
            </PolyPack>
          </div>
        </Win98Window>
      </section>

      <section id="how" style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>
            Как это <ChromeText>работает</ChromeText>
          </h2>
          <Sparkle size={28} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.1rem" }}>
          {STEPS.map((s) => (
            <div key={s.n} className="card tech-corners" style={{ position: "relative", overflow: "hidden" }}>
              <div
                className="font-display"
                style={{
                  position: "absolute",
                  top: -18,
                  right: -6,
                  fontSize: "5rem",
                  fontWeight: 900,
                  opacity: 0.14,
                  color: "var(--accent-primary)",
                }}
              >
                {s.n}
              </div>
              <div className="tech-label" style={{ color: "var(--accent-primary)" }}>
                step / {s.n}
              </div>
              <h3 style={{ margin: "0.5rem 0 0.4rem" }}>{s.title}</h3>
              <p className="text-text-secondary" style={{ fontSize: "0.88rem" }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "3.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0 }}>Проекты сообщества</h2>
          <PixelStar size={34} />
          <Sticker rotate={-6} color="linear-gradient(180deg,#ffb6d5,#ff6fb0)">
            LIVE FEED
          </Sticker>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.1rem" }}>
          {SHOWCASE.map((p) => (
            <CrtWindow key={p.file} title={p.file} className="card-hover">
              <div
                className="scanlines"
                style={{
                  height: 150,
                  borderRadius: 10,
                  background: p.grad,
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: 12,
                  marginBottom: 10,
                  overflow: "hidden",
                }}
              >
                <span className="tech-label" style={{ color: "#fff", opacity: 0.9 }}>
                  {p.tag}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="badge badge-neutral">
                  <HeartIcon style={{ width: 12, height: 12 }} /> {120 + p.file.length * 7}
                </span>
                <JpText className="tech-label">ひらく</JpText>
              </div>
            </CrtWindow>
          ))}
        </div>
      </section>

      <section
        className="stripes tech-corners"
        style={{
          position: "relative",
          borderRadius: 18,
          border: "1px solid var(--border-color)",
          background: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
          padding: "2.4rem 1.8rem",
          display: "flex",
          gap: 20,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          boxShadow: "var(--shadow-lg), 0 0 34px var(--accent-glow)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <PixelCat size={72} className="float-slow" />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Sparkle size={20} />
              <span className="eyebrow">присоединяйся</span>
            </div>
            <h2 style={{ margin: 0 }}>
              Готов(а) <RainbowText>дистортить?</RainbowText>
            </h2>
            <p className="text-text-secondary" style={{ marginTop: 6 }}>
              <JpText>ゆめをげんじつに。</JpText> Создай аккаунт и заселись в свою комнатку ♡
            </p>
          </div>
        </div>
        <a href="#join" className="btn btn-primary btn-lg">
          <BoltIcon style={{ width: 18, height: 18 }} /> Создать аккаунт
        </a>
      </section>

      <footer style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="brand-logo" style={{ width: 38, height: 38, fontSize: "1.1rem" }}>
              D
            </div>
            <PixelStar size={34} />
            <Barcode style={{ color: "var(--text-tertiary)" }} />
          </div>
          <JpText className="tech-label">♡ ゆめ · みらい · おと ♡</JpText>
          <span className="tech-label">© 2004–2026 DISTORT STUDIO</span>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   Контроллер: общий каркас + переключатели
   ============================================================ */
export default function LandingPage({ onAuthenticated }: LandingPageProps) {
  const [skin, setSkin] = useState<Skin>(getSkin);
  const webcore = skin === "webcore";

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", position: "relative", zIndex: 1 }}>
      <Atmosphere />

      {webcore ? (
        <div
          style={{
            background: "var(--accent-gradient)",
            backgroundSize: "220% 220%",
            color: "#fff",
            fontFamily: "var(--font-pixel)",
            fontWeight: 700,
            fontSize: "0.85rem",
            padding: "0.42rem 0",
            letterSpacing: "0.04em",
            boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.35), 0 0 26px var(--accent-glow)",
            position: "relative",
            zIndex: 2,
          }}
        >
          <Marquee items={TICKER_KAWAII} />
        </div>
      ) : (
        <div
          style={{
            background: "rgba(0,0,0,0.55)",
            borderTop: "1px solid var(--border-color)",
            borderBottom: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.74rem",
            padding: "0.4rem 0",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            position: "relative",
            zIndex: 2,
          }}
        >
          <Marquee items={GOTHIC_TICKER} />
        </div>
      )}

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "1.5rem 1.5rem 0", position: "relative", zIndex: 2 }}>
        <header style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          <div className="brand-logo">D</div>
          <div>
            <div className="brand-name" style={{ fontSize: "1.15rem" }}>
              DISTORT STUDIO
            </div>
            {webcore ? (
              <JpText className="tech-label" style={{ display: "block" }}>
                ディストート · 2000
              </JpText>
            ) : (
              <LatinNote style={{ display: "block", fontSize: "0.92rem" }}>requiem aeternam</LatinNote>
            )}
          </div>
          {!webcore && <PixelBat size={26} className="float-slow" style={{ marginLeft: 4 }} />}
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <SkinSwitcher onChange={setSkin} />
            {!webcore && <PaletteSwitcher showLabel={false} />}
            <ThemeSwitcher full={false} />
          </div>
        </header>
      </div>

      {webcore ? <KawaiiBody onAuthenticated={onAuthenticated} /> : <GothicBody onAuthenticated={onAuthenticated} />}
    </div>
  );
}
