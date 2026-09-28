"use client";

import { useEffect, useRef } from "react";
import RequestForm from "./RequestForm";

/** "Request a website" form in a pop-up dialog. */
export default function RequestDialog({
  open,
  onClose,
  inspiredBy,
  checkId,
  defaultName,
  defaultEmail,
}: {
  open: boolean;
  onClose: () => void;
  inspiredBy?: string;
  checkId?: string | null;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="request-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50"
    >
      {open && (
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="request-dialog-title" className="text-xl font-semibold">
                Request a website
              </h2>
              <p className="mt-1 text-sm text-ink-2">Tell us what you need and get a free quote.</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 grid size-9 place-items-center rounded-lg text-xl text-muted hover:bg-surface-2 hover:text-ink">
              ×
            </button>
          </div>
          <RequestForm inspiredBy={inspiredBy} checkId={checkId} defaultName={defaultName} defaultEmail={defaultEmail} onDone={onClose} />
        </div>
      )}
    </dialog>
  );
}
