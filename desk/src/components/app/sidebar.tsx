"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BookOpen, FileText, Info, PenLine, Stamp, type LucideIcon } from "lucide-react";
import { unresolved, useDemo } from "@/lib/store";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { Wordmark } from "@/components/wordmark";

function NavLink({
  href,
  label,
  icon: Icon,
  count,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
        active
          ? "bg-ink font-medium text-paper"
          : "text-ink-soft hover:bg-ink/5 hover:text-ink",
      )}
    >
      <Icon size={15.5} strokeWidth={2} aria-hidden />
      {label}
      {typeof count === "number" && count > 0 ? (
        <span className="ml-auto rounded-full bg-flag-wash px-1.5 py-px text-[11px] font-semibold text-flag">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1 pt-4 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-soft/70">
      {children}
    </p>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { state, dispatch, session, engineError } = useDemo();

  const openFlags = state.reviews.reduce((sum, r) => sum + unresolved(r).length, 0);
  const waiting = state.approvals.filter((a) => a.state === "waiting").length;

  const links = [
    { href: "/app", label: "The Imprint", icon: BookOpen },
    { href: "/app/submit", label: "Submit a piece", icon: PenLine },
    { href: "/app/manuscripts", label: "Manuscripts", icon: FileText, count: openFlags },
    { href: "/app/press", label: "The Press", icon: Stamp, count: waiting },
  ];
  const truthLinks = [
    { href: "/how-it-works", label: "How this review works", icon: Info },
  ];

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 flex-col border-r border-line bg-desk px-3 py-5 md:flex">
        <Link href="/" className="px-2.5">
          <Wordmark className="text-[19px]" />
        </Link>
        <nav className="mt-4 flex flex-1 flex-col" aria-label="Workspace">
          <GroupLabel>The book</GroupLabel>
          <div className="flex flex-col gap-0.5">
            {links.map((l) => (
              <NavLink key={l.href} {...l} active={pathname === l.href} />
            ))}
          </div>
          <GroupLabel>Ground truth</GroupLabel>
          <div className="flex flex-col gap-0.5">
            {truthLinks.map((l) => (
              <NavLink key={l.href} {...l} active={pathname === l.href} />
            ))}
          </div>
        </nav>
        <div className="mt-4 px-2.5">
          {/* Lane status — one quiet line; the detail rides on hover */}
          <div
            className="mb-3 flex items-center gap-2 rounded-md px-2.5 py-1"
            title={
              session
                ? "Connected to the review service — live findings, governed actions."
                : engineError
                  ? "The review service is unreachable, so the desk runs labeled sample data."
                  : "Sample data only — nothing on this desk is real."
            }
          >
            <span
              aria-hidden
              className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", session ? "bg-keep" : "bg-amber")}
            />
            <span
              className={clsx(
                "text-[11.5px] font-semibold tracking-wide",
                session ? "text-keep" : "text-amber",
              )}
            >
              {session ? "Live desk" : "Sample desk"}
            </span>
          </div>
          <label className="block pb-1 text-[11.5px] font-medium text-ink-soft/70" htmlFor="role">
            {session ? "your seat" : "demo seat"}
          </label>
          {session ? (
            <div className="rounded-md border border-line-strong bg-sheet px-2.5 py-2">
              <p className="text-[12.5px] font-medium">{ROLE_LABELS[state.role]}</p>
              <p className="truncate pt-0.5 text-[11px] text-ink-soft">{session.user.email}</p>
            </div>
          ) : (
            <select
              id="role"
              value={state.role}
              onChange={(e) => dispatch({ type: "setRole", role: e.target.value as Role })}
              className="h-9 w-full rounded-md border border-line-strong bg-sheet px-2 text-sm"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label} — you
                </option>
              ))}
            </select>
          )}
          <p className="pt-2 text-[11.5px] leading-snug text-ink-soft/70">
            {session
              ? "Signed into the review service — role comes from your token."
              : "Private demo workspace. Nothing ships anywhere."}
          </p>
        </div>
      </aside>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-line bg-desk px-4 py-2.5 md:hidden">
        <Link href="/" className="shrink-0 pr-1">
          <Wordmark className="text-[16px]" />
        </Link>
        {links.map((l) => (
          <NavLink key={l.href} {...l} active={pathname === l.href} />
        ))}
      </div>
    </>
  );
}
