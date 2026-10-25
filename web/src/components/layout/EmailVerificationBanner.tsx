import { useState } from "react";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { api } from "../../lib/api";
import type { User } from "../../types";

interface Props {
  currentUser: User;
}

export default function EmailVerificationBanner({ currentUser }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [devLink, setDevLink] = useState("");
  const [error, setError] = useState("");

  if (currentUser.emailVerified || dismissed) return null;

  const resend = async () => {
    setState("sending");
    setError("");
    try {
      const res = await api.post<{ message: string; devVerifyLink?: string }>(
        "/api/auth/resend-verification"
      );
      setState("sent");
      if (res.devVerifyLink) setDevLink(res.devVerifyLink);
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Не удалось отправить письмо");
    }
  };

  return (
    <div className="email-verify-banner">
      <ExclamationTriangleIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
      <div className="email-verify-text">
        {state === "sent" ? (
          <>
            <span>Письмо отправлено на {currentUser.email}. Проверьте почту.</span>
            {devLink && (
              <a href={devLink} className="text-accent-primary" style={{ wordBreak: "break-all" }}>
                {devLink}
              </a>
            )}
          </>
        ) : (
          <span>Подтвердите email — мы отправили ссылку на {currentUser.email}.</span>
        )}
        {error && <span className="email-verify-error">{error}</span>}
      </div>
      {state !== "sent" && (
        <button className="btn btn-sm btn-secondary" onClick={resend} disabled={state === "sending"}>
          {state === "sending" ? "Отправляем…" : "Отправить письмо"}
        </button>
      )}
      <button className="icon-btn sm" aria-label="Скрыть" onClick={() => setDismissed(true)}>
        <XMarkIcon style={{ width: 15, height: 15 }} />
      </button>
    </div>
  );
}
