"use client";

import { useState } from "react";
import { BUDGETS, PROJECT_TYPES, site } from "@/config/site";

const input =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25";

/** "Request a website" form. Every submission is stored as a lead. */
export default function RequestForm({
  inspiredBy,
  checkId,
  defaultName = "",
  defaultEmail = "",
  onDone,
}: {
  /** Domain the visitor was looking at, e.g. "framer.com" ("a website like this"). */
  inspiredBy?: string;
  checkId?: string | null;
  defaultName?: string;
  defaultEmail?: string;
  onDone?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form), type: "website", checkId: checkId ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Please try again.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="rounded-lg bg-good-soft p-4">
        <p className="font-medium text-ink">Thanks, your request has been sent ✓</p>
        <p className="mt-1 text-sm text-ink-2">
          {site.ownerName} will reply by email within 1–2 working days to discuss your project and send a free quote.
        </p>
        {onDone && (
          <button onClick={onDone} className="mt-3 text-sm font-medium text-accent hover:underline">
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      {inspiredBy && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-ink">
          Inspired by <strong>{inspiredBy}</strong>. We&apos;ll use it as a reference for your project.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name" htmlFor="lead-name">
          <input id="lead-name" name="name" required maxLength={100} autoComplete="name" defaultValue={defaultName} className={input} />
        </Field>
        <Field label="Email" htmlFor="lead-email">
          <input id="lead-email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={defaultEmail} className={input} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="What do you need?" htmlFor="lead-projectType">
          <select id="lead-projectType" name="projectType" required defaultValue="" className={input}>
            <option value="" disabled>
              Choose…
            </option>
            {PROJECT_TYPES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Budget" htmlFor="lead-budget">
          <select id="lead-budget" name="budget" required defaultValue="" className={input}>
            <option value="" disabled>
              Choose…
            </option>
            {BUDGETS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Your current website (if any)" htmlFor="lead-website">
        <input id="lead-website" name="website" maxLength={300} inputMode="url" placeholder="yourbusiness.com" className={input} />
      </Field>

      <Field label="Tell us about your project" htmlFor="lead-message">
        <textarea
          id="lead-message"
          name="message"
          rows={4}
          maxLength={3000}
          required
          placeholder="What's the business, what should the site do, what you like about the reference site, deadline…"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </Field>

      {/* honeypot for bots */}
      <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="h-11 rounded-lg bg-accent px-5 font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Request a website"}
        </button>
        <p className="text-xs text-muted">Free, no-obligation quote from {site.ownerName}.</p>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
