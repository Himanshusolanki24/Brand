"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    return () => {
      if (d.open) d.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="bp"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="px-6 pb-6 pt-5">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <div className="mt-3">{children}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-2.5 h-8 w-8 rounded-md text-ink-soft hover:bg-ink/5 hover:text-ink"
        >
          ✕
        </button>
      </div>
    </dialog>
  );
}
