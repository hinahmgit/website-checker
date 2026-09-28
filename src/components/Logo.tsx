/** CheckWebStack mark: the layers of a website stack, with the platform on top. Same drawing as app/icon.svg. */
export default function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="14" fill="#15161A" />
      <path d="M14 39.5 32 48.5 50 39.5" fill="none" stroke="#F6F5F1" strokeOpacity=".45" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 31.5 32 40.5 50 31.5" fill="none" stroke="#F6F5F1" strokeOpacity=".75" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 13.5 50 22.5 32 31.5 14 22.5Z" fill="#E8551F" />
    </svg>
  );
}
