import React, { useState, useEffect } from 'react';
import { ClockIcon } from "@heroicons/react/24/solid";
import type { Project, Session } from '../types/index.js';

interface SessionsPageProps {
  token: string | null;
  projects: Project[];
}

const SessionsPage: React.FC<SessionsPageProps> = ({
  token,
  projects
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const fetchMySessions = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/sessions/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error("Ошибка загрузки сессий:", err);
      setSessions([]);
    }
  };

  useEffect(() => {
    fetchMySessions();
  }, [token]);

  const startSession = async () => {
    if (!selectedProjectId || !startTime) {
      alert("Выберите проект и укажите время начала");
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          startTime,
          endTime: endTime || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to start session");
      await fetchMySessions();
      setShowStartModal(false);
      setStartTime("");
      setEndTime("");
      setSelectedProjectId(null);
    } catch (err: any) {
      alert(err.message || "Ошибка создания сессии");
    }
  };

  const stopSession = async (sessionId: number) => {
    if (!confirm("Завершить эту сессию?")) return;
    try {
      const res = await fetch(`http://localhost:4000/api/sessions/${sessionId}/stop`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ endTime: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to stop session");
      await fetchMySessions();
    } catch (err: any) {
      alert(err.message || "Ошибка завершения сессии");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Мои сессии</h2>
          <p className="text-gray-400">История рабочих сессий</p>
        </div>
        <button onClick={() => setShowStartModal(true)} className="btn btn-primary">
          <ClockIcon className="w-4 h-4" />
          Начать сессию
        </button>
      </div>

      {/* Модальное окно начала сессии */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Начать сессию</h3>

            <label className="block text-sm text-gray-300 mb-1">Проект</label>
            <select
              className="input w-full mb-4"
              value={selectedProjectId || ""}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            >
              <option value="">Выберите проект</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            <label className="block text-sm text-gray-300 mb-1">Время начала</label>
            <input
              type="datetime-local"
              className="input w-full mb-4"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />

            <label className="block text-sm text-gray-300 mb-1">Время окончания (опционально)</label>
            <input
              type="datetime-local"
              className="input w-full mb-4"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />

            <div className="flex gap-2">
              <button onClick={startSession} className="btn btn-primary flex-1">
                Начать
              </button>
              <button onClick={() => { setShowStartModal(false); setStartTime(""); setEndTime(""); setSelectedProjectId(null); }} className="btn btn-secondary">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список сессий */}
      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">{session.Project?.title || "Проект"}</h4>
                  <p className="text-sm text-gray-400">
                    {new Date(session.startTime).toLocaleString('ru-RU')}
                    {session.endTime && ` - ${new Date(session.endTime).toLocaleString('ru-RU')}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Длительность: {Math.floor(session.durationSeconds / 60)} мин.
                  </p>
                </div>
              </div>
              {!session.endTime && (
                <button onClick={() => stopSession(session.id)} className="btn btn-danger">
                  Завершить
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 card">
          <ClockIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg mb-2">Нет сессий</p>
          <p className="text-gray-500 text-sm">Начните свою первую рабочую сессию</p>
        </div>
      )}
    </div>
  );
};

export default SessionsPage;
