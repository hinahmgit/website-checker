/** Bullet list with small drawn check marks (used on the sign-in and request pages). */
export default function CheckList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5 text-ink-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4.5 10.5 3.5 3.5 7.5-8" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
