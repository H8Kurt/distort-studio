import { useState } from "react";
import { FlagIcon } from "@heroicons/react/24/solid";
import ReportDialog from "./ReportDialog";
import type { ReportTargetType } from "../../types";

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: number;
  title?: string;
  className?: string;
}

export default function ReportButton({ targetType, targetId, title, className }: ReportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className || "icon-btn sm"}
        onClick={() => setOpen(true)}
        title={title || "Пожаловаться"}
        aria-label="Пожаловаться"
      >
        <FlagIcon style={{ width: 14, height: 14 }} />
      </button>
      <ReportDialog
        open={open}
        onClose={() => setOpen(false)}
        targetType={targetType}
        targetId={targetId}
      />
    </>
  );
}
