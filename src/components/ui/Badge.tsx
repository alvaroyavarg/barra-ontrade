const STYLES = {
  aacc: "bg-ink text-white",
  reserve: "bg-accent-soft text-accent",
} as const;

const LABELS = {
  aacc: "AACC",
  reserve: "Reserve",
} as const;

export default function Badge({ kind }: { kind: keyof typeof STYLES }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center rounded-pill px-2.5 text-[11px] font-semibold tracking-wide ${STYLES[kind]}`}
    >
      {LABELS[kind]}
    </span>
  );
}
