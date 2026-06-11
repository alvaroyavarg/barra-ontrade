"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { MOBILE_TABS, NAV_ITEMS, ROLE_LABEL } from "@/lib/nav";
import type { UserRole } from "@/types/next-auth";

type Props = {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default function AppShell({ role, userName, children }: Props) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const mobileTabs = MOBILE_TABS[role]
    .map((href) => navItems.find((i) => i.href === href))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border px-4 py-6 md:flex">
        <Link href="/" className="px-3 text-xl font-semibold tracking-tight">
          Key 3<span className="text-accent">.</span>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`tappable flex h-10 items-center gap-3 rounded-pill px-3 text-sm font-medium ${
                isActive(href)
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t border-border px-1 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
            {initials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{userName}</p>
            <p className="text-xs text-muted">{ROLE_LABEL[role]}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Cerrar sesión"
            className="tappable rounded-pill p-2 text-muted hover:bg-surface hover:text-ink"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur md:hidden">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Key 3<span className="text-accent">.</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="tappable flex h-9 items-center gap-2 rounded-pill px-3 text-sm text-muted"
        >
          <LogOut size={15} />
          Salir
        </button>
      </header>

      {/* Contenido */}
      <main className="min-w-0 flex-1 md:pl-60">
        <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 md:px-10 md:pb-16 md:pt-10">
          {children}
        </div>
      </main>

      {/* Bottom tabs mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {mobileTabs.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`tappable flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              isActive(href) ? "text-accent" : "text-muted"
            }`}
          >
            <Icon size={21} strokeWidth={2} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
