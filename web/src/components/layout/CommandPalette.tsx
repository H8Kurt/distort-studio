import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  HomeIcon,
  FolderIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  ArrowRightIcon,
  PencilSquareIcon,
  HashtagIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { api } from "../../lib/api";
import type { Project } from "../../types";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
}

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: typeof HomeIcon;
  to: string;
}

const PAGES: Item[] = [
  { id: "nav-feed", label: "Лента", icon: HomeIcon, to: "/" },
  { id: "nav-discover", label: "Обзор", icon: MagnifyingGlassIcon, to: "/discover" },
  { id: "nav-projects", label: "Проекты", icon: FolderIcon, to: "/projects" },
  { id: "nav-marketplace", label: "Магазин", icon: ShoppingBagIcon, to: "/marketplace" },
  { id: "nav-profile", label: "Профиль", icon: UserCircleIcon, to: "/profile" },
];

export default function CommandPalette({ open, onClose, projects }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<{
    users: { id: number; username: string; avatarUrl?: string | null }[];
    projects: Project[];
    posts: { id: number; content: string; author?: { username: string } | null }[];
    assets: { id: number; title: string }[];
    tags: { tag: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setResults(null);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Живой серверный поиск с debounce
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 1) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get<{
          users: { id: number; username: string; avatarUrl?: string | null }[];
          projects: Project[];
          posts: { id: number; content: string; author?: { username: string } | null }[];
          assets: { id: number; title: string }[];
          tags: { tag: string; count: number }[];
        }>(`/api/search?q=${encodeURIComponent(q)}`);
        setResults(res);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    setActive(0);
  }, [query, results]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const pages = q
      ? PAGES.filter((p) => p.label.toLowerCase().includes(q))
      : PAGES;

    // Пока нет серверного ответа — локальный поиск по загруженным проектам
    if (!results) {
      const localProjects: Item[] = (q ? projects : []).map((p) => ({
        id: `project-${p.id}`,
        label: p.title,
        hint: p.owner?.username ? `@${p.owner.username}` : "проект",
        icon: FolderIcon,
        to: `/projects/${p.id}`,
      }));
      return [...pages, ...localProjects];
    }

    const userItems: Item[] = results.users.map((u) => ({
      id: `user-${u.id}`,
      label: u.username,
      hint: "профиль",
      icon: UserCircleIcon,
      to: `/u/${u.id}`,
    }));
    const projectItems: Item[] = results.projects.map((p) => ({
      id: `project-${p.id}`,
      label: p.title,
      hint: p.owner?.username ? `@${p.owner.username}` : "проект",
      icon: FolderIcon,
      to: `/projects/${p.id}`,
    }));
    const postItems: Item[] = results.posts.map((p) => ({
      id: `post-${p.id}`,
      label: p.content,
      hint: p.author?.username ? `@${p.author.username}` : "пост",
      icon: PencilSquareIcon,
      to: "/",
    }));
    const assetItems: Item[] = results.assets.map((a) => ({
      id: `asset-${a.id}`,
      label: a.title,
      hint: "магазин",
      icon: ShoppingBagIcon,
      to: "/marketplace",
    }));
    const tagItems: Item[] = results.tags.map((t) => ({
      id: `tag-${t.tag}`,
      label: `#${t.tag}`,
      hint: `${t.count} проектов`,
      icon: HashtagIcon,
      to: "/discover",
    }));

    return [...pages, ...userItems, ...projectItems, ...postItems, ...assetItems, ...tagItems];
  }, [projects, query, results]);

  if (!open) return null;

  const run = (item: Item | undefined) => {
    if (!item) return;
    navigate(item.to);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(items[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="command-overlay" onMouseDown={onClose}>
      <div className="command-palette" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="command-input-row">
          {loading ? (
            <ArrowPathIcon className="command-spin" style={{ width: 18, height: 18, opacity: 0.7 }} />
          ) : (
            <MagnifyingGlassIcon style={{ width: 18, height: 18, opacity: 0.7 }} />
          )}
          <input
            ref={inputRef}
            className="command-input"
            placeholder="Люди, проекты, посты, теги…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <span className="topnav-kbd">Esc</span>
        </div>

        <div className="command-results">
          {items.length === 0 ? (
            <div className="command-empty">Ничего не найдено</div>
          ) : (
            items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`command-item${idx === active ? " active" : ""}`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => run(item)}
              >
                <item.icon style={{ width: 16, height: 16 }} />
                <span className="command-item-label line-clamp-1">{item.label}</span>
                {item.hint && <span className="command-item-hint">{item.hint}</span>}
                <ArrowRightIcon style={{ width: 14, height: 14, opacity: 0.5 }} />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
