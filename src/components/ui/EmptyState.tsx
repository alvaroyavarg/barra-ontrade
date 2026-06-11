import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  body,
  hint,
}: {
  icon?: LucideIcon;
  title: string;
  body: string;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface px-6 py-14 text-center shadow-card">
      {Icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon size={22} />
        </div>
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{body}</p>
      {hint && (
        <span className="mt-4 inline-flex items-center rounded-pill bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          {hint}
        </span>
      )}
    </div>
  );
}
