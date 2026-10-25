import { useEffect, useState } from "react";
import { ShieldExclamationIcon } from "@heroicons/react/24/solid";
import Modal from "./Modal";
import { api } from "../../lib/api";
import type { ReportTargetType } from "../../types";

const REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "Спам или реклама" },
  { value: "harassment", label: "Оскорбления / травля" },
  { value: "hate", label: "Язык вражды" },
  { value: "nsfw", label: "Неприемлемый контент (18+)" },
  { value: "violence", label: "Насилие / угрозы" },
  { value: "copyright", label: "Нарушение авторских прав" },
  { value: "other", label: "Другое" },
];

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: number;
}

export default function ReportDialog({ open, onClose, targetType, targetId }: ReportDialogProps) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("spam");
      setDetails("");
      setError("");
      setDone(false);
    }
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post("/api/moderation/reports", {
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить жалобу");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ShieldExclamationIcon style={{ width: 18, height: 18 }} /> Жалоба
        </span>
      }
      maxWidth={460}
      footer={
        done ? (
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Готово
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Отмена
            </button>
            <button type="button" className="btn btn-danger" onClick={submit} disabled={busy}>
              {busy ? "Отправка…" : "Отправить жалобу"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-text-secondary" style={{ margin: 0 }}>
          Спасибо! Жалоба отправлена модераторам. Мы рассмотрим её в ближайшее время.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label>Причина</label>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label>Комментарий (необязательно)</label>
            <textarea
              className="input"
              rows={3}
              maxLength={1000}
              placeholder="Опишите проблему…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          {error && <div className="badge badge-warning">{error}</div>}
        </div>
      )}
    </Modal>
  );
}
