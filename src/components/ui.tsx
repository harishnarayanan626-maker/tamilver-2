/**
 * Shared presentational components (no data fetching).
 * Imported by both the eager app shell and lazily-loaded views,
 * so heavy pages split into their own chunks without cycles.
 */

import type { ReactNode } from "react";
import type { DiffToken } from "../lib/api";

export type IconName =
  | "search" | "arrow" | "book" | "evidence" | "chart" | "bookmark" | "plus"
  | "user" | "moon" | "sun" | "menu" | "close" | "copy" | "external"
  | "check" | "filter" | "download" | "note" | "spark";

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v17h4.5A3.5 3.5 0 0 1 20 22V5.5Z" /></>,
    evidence: <><path d="M6 2h9l4 4v16H6z" /><path d="M14 2v5h5M9 12h6M9 16h6" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    bookmark: <path d="M6 3h12v19l-6-4-6 4z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 22a8 8 0 0 1 16 0" /></>,
    moon: <path d="M21 15.2A9 9 0 1 1 8.8 3 7 7 0 0 0 21 15.2Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v6H4V5h6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
    download: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 19h16" /></>,
    note: <><path d="M5 3h14v18H5z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    spark: <path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />,
  };
  return (
    <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export function Button({ children, variant = "primary", icon, onClick, type }: {
  children: ReactNode; variant?: "primary" | "ghost" | "soft"; icon?: IconName;
  onClick?: () => void; type?: "button" | "submit";
}) {
  return (
    <button type={type || "button"} className={`button ${variant}`} onClick={onClick}>
      {icon && <Icon name={icon} />}{children}
    </button>
  );
}

export function KolamDivider() {
  return <div className="kolam" aria-hidden="true"><span /><i /><b /><i /><span /></div>;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div aria-label="Loading results">
      {Array.from({ length: count }).map((_, i) => (
        <div className="result-card skeleton-card" key={i} aria-hidden="true">
          <div className="skeleton"><i /><i /><i /></div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="state-card">
      <span className="kicker">NO RESULTS</span>
      <div className="state-icon"><Icon name="evidence" size={34} /><i /></div>
      <b className="ta">{title}</b>
      <small>{hint}</small>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state-card error-state">
      <span className="kicker">ERROR</span>
      <div className="state-icon"><Icon name="close" size={34} /></div>
      <b className="ta">சிறு தடங்கல் ஏற்பட்டது</b>
      <small>{message}</small>
      <Button variant="soft" onClick={onRetry}>Try again</Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Letter-level diff strip (grapheme-intact: tokens render whole, never split)
// ---------------------------------------------------------------------------

export function DiffStrip({ tokens, fromText, toText }: { tokens: DiffToken[]; fromText: string; toText: string }) {
  return (
    <div className="diff-card">
      <div className="diff-side old">
        <span>பழந்தமிழ் · OLD TAMIL</span>
        <div className="diff-word ta" aria-label={`Old form ${fromText}`}>
          {tokens.filter((d) => d.type !== "insert").map((d, i) => {
            if (d.type === "match") return <span key={i} className="tok-match ta">{d.oldChar}</span>;
            if (d.type === "delete") return <mark key={i} className="tok-del ta">{d.oldChar}</mark>;
            return <mark key={i} className="tok-rep-old ta">{d.oldChar}</mark>;
          })}
        </div>
        <small className="ta">{fromText}</small>
      </div>
      <div className="diff-arrow"><Icon name="arrow" /></div>
      <div className="diff-side new">
        <span>நவீன தமிழ் · MODERN</span>
        <div className="diff-word ta" aria-label={`New form ${toText}`}>
          {tokens.filter((d) => d.type !== "delete").map((d, i) => {
            if (d.type === "match") return <span key={i} className="tok-match ta">{d.newChar}</span>;
            if (d.type === "insert") return <mark key={i} className="tok-ins ta">{d.newChar}</mark>;
            return <mark key={i} className="tok-rep-new ta">{d.newChar}</mark>;
          })}
        </div>
        <small className="ta">{toText}</small>
      </div>
    </div>
  );
}

export function highlightVerse(verse: string, formText: string): ReactNode {
  if (!verse) return null;
  if (!formText || !verse.includes(formText)) return <span className="ta">{verse}</span>;
  const parts = verse.split(formText);
  return (
    <span className="ta">
      {parts.map((p, i) => (
        <span key={i}>{p}{i < parts.length - 1 && <mark className="ta">{formText}</mark>}</span>
      ))}
    </span>
  );
}
