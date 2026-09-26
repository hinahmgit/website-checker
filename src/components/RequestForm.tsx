"use client";

import { useState } from "react";
import { BUDGETS, PROJECT_TYPES, site } from "@/config/site";
import type { RequestType } from "@/lib/types";

const input =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25";

export default function RequestForm({
  type,
  website = "",
  checkId,
  defaultName = "",
  defaultEmail = "",
}: {
  type: RequestType;
  website?: string;
  checkId?: string | null;
  defaultName?: string;
  defaultEmail?: string;
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
        body: JSON.stringify({ ...Object.fromEntries(form), type, checkId: checkId ?? null }),
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
          {site.ownerName} will reply by email within 1–2 working days
          {type === "audit" ? " with the price and next steps for your full report." : " to discuss your project and send a quote."}
        </p>
      </div>
    );
  }

  const id = (name: string) => `${type}-${name}`;
  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name" htmlFor={id("name")}>
          <input id={id("name")} name="name" required maxLength={100} autoComplete="name" defaultValue={defaultName} className={input} />
        </Field>
        <Field label="Email" htmlFor={id("email")}>
          <input id={id("email")} name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={defaultEmail} className={input} />
        </Field>
      </div>

      <Field label={type === "audit" ? "Website to audit" : "Current website (if any)"} htmlFor={id("website")}>
        <input
          id={id("website")}
          name="website"
          required={type === "audit"}
          maxLength={300}
          inputMode="url"
          placeholder="example.com"
          defaultValue={website}
          className={input}
        />
      </Field>

      {type === "website" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="What do you need?" htmlFor={id("projectType")}>
            <select id={id("projectType")} name="projectType" required defaultValue="" className={input}>
              <option value="" disabled>
                Choose…
              </option>
              {PROJECT_TYPES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Budget" htmlFor={id("budget")}>
            <select id={id("budget")} name="budget" required defaultValue="" className={input}>
              <option value="" disabled>
                Choose…
              </option>
              {BUDGETS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <Field label={type === "audit" ? "Anything we should focus on? (optional)" : "Tell us about your project"} htmlFor={id("message")}>
        <textarea
          id={id("message")}
          name="message"
          rows={4}
          maxLength={3000}
          required={type === "website"}
          placeholder={
            type === "audit"
              ? "e.g. low sales from mobile, checkout drop-off, planning a redesign…"
              : "What's the business, what should the site do, any examples you like, deadline…"
          }
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
          {status === "sending" ? "Sending…" : type === "audit" ? "Request full report" : "Request a quote"}
        </button>
        <p className="text-xs text-muted">
          {type === "audit"
            ? site.auditPrice
              ? `Paid service · ${site.auditPrice}. You'll get an invoice before any work starts.`
              : "Paid service. You'll get a quote before any work starts."
            : "Free, no-obligation quote."}
        </p>
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
