import { useEffect, useRef } from "react";
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";

export interface AuthNoticeData {
  type: "success" | "error";
  text: string;
}

interface Props {
  notice: AuthNoticeData | null;
  onClose: () => void;
}

export default function AuthNotice({ notice, onClose }: Props) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => closeRef.current(), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!notice) return null;

  return (
    <div className={`auth-notice auth-notice-${notice.type}`} role="status">
      {notice.type === "success" ? (
        <CheckCircleIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
      ) : (
        <XCircleIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
      )}
      <span>{notice.text}</span>
      <button className="icon-btn sm" aria-label="Закрыть" onClick={onClose}>
        <XMarkIcon style={{ width: 15, height: 15 }} />
      </button>
    </div>
  );
}
