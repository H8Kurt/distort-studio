import { useCallback, useRef, useState, type ReactNode } from "react";
import Modal from "./Modal";
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from "./confirm";

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setState((s) => (s ? { ...s, open: false } : s));
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state?.open}
        onClose={() => close(false)}
        title={state?.title || "Подтверждение"}
        maxWidth={430}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => close(false)}>
              {state?.cancelLabel || "Отмена"}
            </button>
            <button
              type="button"
              className={`btn ${state?.danger ? "btn-danger" : "btn-primary"}`}
              onClick={() => close(true)}
            >
              {state?.confirmLabel || "Подтвердить"}
            </button>
          </>
        }
      >
        <p className="text-text-secondary" style={{ margin: 0 }}>
          {state?.message}
        </p>
      </Modal>
    </ConfirmContext.Provider>
  );
}
