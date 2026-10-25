import { useCallback, useEffect, useState, type FormEvent } from "react";
import { UserPlusIcon, TrashIcon, ClockIcon } from "@heroicons/react/24/solid";
import Avatar from "../../../components/ui/Avatar";
import { api, getSocket } from "../../../lib/api";
import type { Collaborator, User } from "../../../types";

interface CollabsTabProps {
  projectId: number;
  currentUser: User;
  isOwner: boolean;
}

type CollabRole = "viewer" | "editor";

export default function CollabsTab({ projectId, currentUser, isOwner }: CollabsTabProps) {
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<CollabRole>("editor");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Collaborator[]>(`/api/projects/${projectId}/collabs`);
      setCollabs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const onAdded = (c: Collaborator) => {
      setCollabs((prev) => {
        const next = prev.filter((x) => x.userId !== c.userId);
        return [...next, c];
      });
    };
    const onInvited = () => load();
    const onRoleChanged = (c: Collaborator) => {
      setCollabs((prev) => prev.map((x) => (x.userId === c.userId ? { ...x, role: c.role } : x)));
    };
    const onRemoved = ({ userId }: { userId: number }) => {
      setCollabs((prev) => prev.filter((x) => x.userId !== userId));
    };
    socket.on("collab:added", onAdded);
    socket.on("collab:invited", onInvited);
    socket.on("collab:roleChanged", onRoleChanged);
    socket.on("collab:removed", onRemoved);
    return () => {
      socket.off("collab:added", onAdded);
      socket.off("collab:invited", onInvited);
      socket.off("collab:roleChanged", onRoleChanged);
      socket.off("collab:removed", onRemoved);
    };
  }, [load]);

  useEffect(() => {
    api.get<User[]>("/api/users").then((d) => setUsers(Array.isArray(d) ? d : [])).catch(() => undefined);
  }, []);

  const isMember = collabs.some((c) => c.userId === currentUser.id && c.status === "accepted");
  const me = collabs.find((c) => c.userId === currentUser.id && c.status === "accepted");
  const canManage = isOwner || me?.role === "owner" || me?.role === "editor";

  const members = collabs.filter((c) => c.status === "accepted");
  const pending = collabs.filter((c) => c.status === "pending");

  const inviteCollaborator = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setError("");
    setNotice("");
    const found = users.find((u) => u.username.toLowerCase() === query.trim().toLowerCase());
    if (!found) {
      setError("Пользователь с таким username не найден");
      return;
    }
    if (collabs.some((c) => c.userId === found.id && c.status === "accepted")) {
      setError("Этот пользователь уже участник");
      return;
    }
    if (collabs.some((c) => c.userId === found.id && c.status === "pending")) {
      setError("Приглашение уже отправлено");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/projects/${projectId}/collabs`, { userId: found.id, role });
      setQuery("");
      setNotice(`Приглашение отправлено @${found.username}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (userId: number, newRole: string) => {
    try {
      await api.put(`/api/projects/${projectId}/collaborators/${userId}/role`, { role: newRole });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const removeCollab = async (userId: number) => {
    try {
      await api.del(`/api/projects/${projectId}/collaborators/${userId}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const inviteRow = (c: Collaborator) => (
    <div key={c.id} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <Avatar username={c.User?.username || "?"} url={c.User?.avatarUrl || undefined} size="md" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>@{c.User?.username || "unknown"}</div>
        <div className="text-text-tertiary" style={{ fontSize: "0.8rem" }}>
          {c.role} · ожидает ответа
        </div>
      </div>
      {canManage && (
        <button
          className="btn btn-secondary btn-sm"
          title="Отменить приглашение"
          onClick={() => removeCollab(c.userId)}
        >
          <TrashIcon style={{ width: 15, height: 15 }} />
        </button>
      )}
      <span className="badge badge-warning">
        <ClockIcon style={{ width: 12, height: 12 }} /> Ожидает
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <div className="badge badge-warning">{error}</div>}
      {notice && <div className="badge badge-success">{notice}</div>}

      {canManage && (
        <form onSubmit={inviteCollaborator} className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="input" style={{ width: 140 }} value={role} onChange={(e) => setRole(e.target.value as CollabRole)}>
            <option value="viewer">Наблюдатель</option>
            <option value="editor">Редактор</option>
          </select>
          <button className="btn btn-primary" disabled={busy}>
            <UserPlusIcon style={{ width: 15, height: 15 }} /> Пригласить
          </button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {members.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
              Участников пока нет
            </div>
          ) : (
            members.map((c) => (
              <div key={c.id} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <Avatar username={c.User?.username || "?"} url={c.User?.avatarUrl || undefined} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>@{c.User?.username || "unknown"}</div>
                  <div className="text-text-tertiary" style={{ fontSize: "0.8rem" }}>{c.role}</div>
                </div>
                {canManage && c.role !== "owner" ? (
                  <>
                    <select className="input" style={{ width: 140 }} value={c.role} onChange={(e) => changeRole(c.userId, e.target.value)}>
                      <option value="viewer">Наблюдатель</option>
                      <option value="editor">Редактор</option>
                    </select>
                    <button className="btn btn-danger btn-sm" onClick={() => removeCollab(c.userId)}>
                      <TrashIcon style={{ width: 15, height: 15 }} />
                    </button>
                  </>
                ) : (
                  <span className={`badge ${c.role === "owner" ? "badge-primary" : "badge-neutral"}`}>{c.role}</span>
                )}
              </div>
            ))
          )}
        </div>

        {canManage && pending.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div className="text-text-tertiary" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Приглашения ({pending.length})
            </div>
            {pending.map(inviteRow)}
          </div>
        )}

        {isMember && me?.role !== "owner" && !isOwner && (
          <button className="btn btn-secondary btn-sm" onClick={() => removeCollab(currentUser.id)}>
            Покинуть проект
          </button>
        )}
      </div>
    </div>
  );
}
