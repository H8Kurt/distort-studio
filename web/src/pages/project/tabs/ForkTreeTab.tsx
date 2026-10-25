import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathRoundedSquareIcon,
  ShareIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";
import Avatar from "../../../components/ui/Avatar";
import { api, API_URL } from "../../../lib/api";
import type { ForkNode, ForkTree } from "../../../types";

interface ForkTreeTabProps {
  projectId: number;
  canFork?: boolean;
}

function cover(node: ForkNode) {
  if (!node.coverUrl) return "";
  return node.coverUrl.startsWith("http") ? node.coverUrl : `${API_URL}${node.coverUrl}`;
}

export default function ForkTreeTab({ projectId }: ForkTreeTabProps) {
  const navigate = useNavigate();
  const [tree, setTree] = useState<ForkTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<ForkTree>(`/api/projects/${projectId}/tree`);
      setTree(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const { roots, childrenOf } = useMemo(() => {
    const nodes = tree?.nodes || [];
    const ids = new Set(nodes.map((n) => n.id));
    const map = new Map<number, ForkNode[]>();
    const rootsArr: ForkNode[] = [];
    for (const n of nodes) {
      const parent = n.forkedFromId;
      if (parent == null || !ids.has(parent)) {
        rootsArr.push(n);
      } else {
        if (!map.has(parent)) map.set(parent, []);
        map.get(parent)!.push(n);
      }
    }
    return { roots: rootsArr, childrenOf: map };
  }, [tree]);

  const forkCurrent = async () => {
    setBusy(true);
    try {
      const forked = await api.post<{ id: number }>(`/api/projects/${projectId}/fork`);
      navigate(`/projects/${forked.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка форка");
    } finally {
      setBusy(false);
    }
  };

  const renderNode = (node: ForkNode, depth: number) => {
    const kids = childrenOf.get(node.id) || [];
    const isCurrent = node.id === tree?.currentId;
    return (
      <div key={node.id} className="fork-branch" style={{ marginLeft: depth === 0 ? 0 : 28 }}>
        <button
          type="button"
          className={`fork-node${isCurrent ? " current" : ""}`}
          onClick={() => navigate(`/projects/${node.id}`)}
        >
          <span
            className="fork-node-thumb"
            style={cover(node) ? { backgroundImage: `url(${cover(node)})` } : undefined}
          />
          <span className="fork-node-info">
            <span className="fork-node-title">{node.title}</span>
            <span className="fork-node-owner">
              {node.owner && (
                <Avatar
                  username={node.owner.username}
                  url={node.owner.avatarUrl || undefined}
                  size="sm"
                />
              )}
              @{node.owner?.username || "неизвестный"}
            </span>
          </span>
          {isCurrent && <span className="fork-node-here">ты здесь</span>}
          {kids.length > 0 && (
            <span className="fork-node-kids">
              <ShareIcon style={{ width: 12, height: 12 }} /> {kids.length}
            </span>
          )}
        </button>
        {kids.length > 0 && <div className="fork-children">{kids.map((k) => renderNode(k, depth + 1))}</div>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card empty-state">
        <p className="text-text-secondary">Загрузка дерева форков…</p>
      </div>
    );
  }

  return (
    <div className="fork-tree">
      {error && <div className="badge badge-warning">{error}</div>}

      <div className="fork-tree-head">
        <div>
          <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShareIcon style={{ width: 20, height: 20, color: "var(--accent-primary)" }} />
            Родословная форков
          </h3>
          <p className="text-text-tertiary" style={{ fontSize: "0.82rem", marginTop: 4 }}>
            {tree ? `${tree.nodes.length} проект(ов) в дереве` : "—"}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={forkCurrent} disabled={busy}>
          <ArrowPathRoundedSquareIcon style={{ width: 14, height: 14 }} />
          {busy ? "Форк…" : "Форк этого проекта"}
        </button>
      </div>

      {!tree || tree.nodes.length === 0 ? (
        <div className="card empty-state">
          <UsersIcon style={{ width: 26, height: 26, opacity: 0.5 }} />
          <p className="text-text-secondary">Дерево пустое.</p>
        </div>
      ) : (
        <div className="card fork-canvas">{roots.map((r) => renderNode(r, 0))}</div>
      )}
    </div>
  );
}
