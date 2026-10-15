import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  api,
  apiFetch,
  getToken,
  setToken,
  clearAuth,
  setOnUnauthorized,
  splitGraphemesClient,
  type AuthUser,
  type CompareResponse,
  type EvidenceResponse,
  type JourneyResponse,
  type PeriodItem,
  type SearchResponse,
  type DiffToken,
} from "./lib/api";

type View =
  | "home"
  | "search"
  | "journey"
  | "compare"
  | "insights"
  | "workspace"
  | "contribute"
  | "auth"
  | "notfound";

type IconName =
  | "search" | "arrow" | "book" | "evidence" | "chart" | "bookmark" | "plus"
  | "user" | "moon" | "sun" | "menu" | "close" | "copy" | "external"
  | "check" | "filter" | "download" | "note" | "spark";

type Lang = "ta" | "en";

const LANG_KEY = "sorkalam_lang";
const DARK_KEY = "sorkalam_dark";
const USER_KEY = "sorkalam_user";

function loadLang(): Lang {
  try {
    return (window.localStorage.getItem(LANG_KEY) as Lang) === "en" ? "en" : "ta";
  } catch {
    return "ta";
  }
}

function loadDark(): boolean {
  try {
    return window.localStorage.getItem(DARK_KEY) === "1";
  } catch {
    return false;
  }
}

function loadCachedUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

const STRINGS: Record<string, { ta: string; en: string }> = {
  journey: { ta: "சொல் பயணம்", en: "Journey" },
  compare: { ta: "ஒப்பிடுக", en: "Compare" },
  insights: { ta: "ஆய்வுகள்", en: "Insights" },
  workspace: { ta: "சேமிப்புகள்", en: "Workspace" },
  contribute: { ta: "பங்களிக்க", en: "Contribute" },
  search: { ta: "தேடல்", en: "Search" },
  signIn: { ta: "உள்நுழைக", en: "Sign in" },
  signOut: { ta: "வெளியேறு", en: "Sign out" },
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
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

function Button({ children, variant = "primary", icon, onClick, type }: {
  children: ReactNode; variant?: "primary" | "ghost" | "soft"; icon?: IconName;
  onClick?: () => void; type?: "button" | "submit";
}) {
  return (
    <button type={type || "button"} className={`button ${variant}`} onClick={onClick}>
      {icon && <Icon name={icon} />}{children}
    </button>
  );
}

function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Sorkalam home">
      <span className="brand-mark ta">சொ</span>
      <span><strong className="ta">சொற்காலம்</strong><small>SORKALAM</small></span>
    </button>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="toast" role="status">{message}</div>;
}

function SkeletonCards({ count = 3 }: { count?: number }) {
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

function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
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

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
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
// Header
// ---------------------------------------------------------------------------

function Header({ view, setView, dark, setDark, lang, setLang, user, onSignOut }: {
  view: View; setView: (v: View) => void; dark: boolean; setDark: (d: boolean) => void;
  lang: Lang; setLang: (l: Lang) => void; user: AuthUser | null; onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const t = (k: keyof typeof STRINGS) => (lang === "ta" ? STRINGS[k].ta : STRINGS[k].en);
  return (
    <header className="header">
      <Brand onClick={() => setView("home")} />
      <nav className={open ? "nav open" : "nav"}>
        {([["journey", t("journey")], ["compare", t("compare")], ["insights", t("insights")], ["workspace", t("workspace")], ["contribute", t("contribute")]] as Array<[View, string]>).map(([id, label]) => (
          <button key={id} className={view === id ? "nav-link active ta" : "nav-link ta"}
            onClick={() => { setView(id); setOpen(false); }}>{label}</button>
        ))}
      </nav>
      <div className="header-actions">
        <button className="language" onClick={() => setLang(lang === "ta" ? "en" : "ta")}
          aria-label="Toggle language">
          <b className="ta">தமிழ்</b><span>EN</span>
        </button>
        {user && <span className="role-badge" title={user.email}>{user.role}</span>}
        <button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">
          <Icon name={dark ? "sun" : "moon"} />
        </button>
        {user ? (
          <button className="icon-button" onClick={onSignOut} aria-label="Sign out" title={t("signOut") as string}>
            <Icon name="close" />
          </button>
        ) : (
          <button className="icon-button user-button" onClick={() => setView("auth")} aria-label="Sign in">
            <Icon name="user" />
          </button>
        )}
        <button className="icon-button menu-button" onClick={() => setOpen(!open)} aria-label="Menu">
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
    </header>
  );
}

function KolamDivider() {
  return <div className="kolam" aria-hidden="true"><span /><i /><b /><i /><span /></div>;
}

// ---------------------------------------------------------------------------
// Search box (instant local transliteration hint; parent does the live fetch)
// ---------------------------------------------------------------------------

function SearchBox({ value, onChange, onSubmit, compact = false }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; compact?: boolean;
}) {
  return (
    <div className={`search-box ${compact ? "compact" : ""}`}>
      <Icon name="search" size={22} />
      <div className="search-input-wrap">
        <input data-search-input value={value} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="தமிழ்ச் சொல்லைத் தேடுங்கள்… ( / )" aria-label="Search Tamil words" className="ta" />
        {!compact && <small>{value ? `தேடல்: ${value}` : "Try “kadavul” or கடவுள்"}</small>}
      </div>
      <button className="keyboard ta" aria-label="Tamil keyboard">அ</button>
      <button className="search-submit" onClick={onSubmit}>
        <span className="ta">தேடுக</span><Icon name="arrow" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Letter-level diff strip (grapheme-intact: tokens render whole, never split)
// ---------------------------------------------------------------------------

function DiffStrip({ tokens, fromText, toText }: { tokens: DiffToken[]; fromText: string; toText: string }) {
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

function highlightVerse(verse: string, formText: string): ReactNode {
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

// ---------------------------------------------------------------------------
// Evidence drawer (live /evidence, cite copies APA/MLA from backend citations)
// ---------------------------------------------------------------------------

function EvidenceDrawer({ wordId, periodId, onClose, notify }: {
  wordId: string; periodId?: string; onClose: () => void; notify: (m: string) => void;
}) {
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [citeStyle, setCiteStyle] = useState<"apa" | "mla" | "chicago">("apa");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    api.evidence(wordId, periodId)
      .then((d) => { if (live) { setData(d); setLoading(false); } })
      .catch((e: Error) => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [wordId, periodId]);

  const first = data?.evidences[0];

  async function copyCitation() {
    if (!first) return;
    const text = first.citations[citeStyle];
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    notify("Citation copied to clipboard");
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close evidence" />
      <aside className="drawer" aria-label="Evidence panel">
        <div className="drawer-handle" />
        <div className="drawer-head">
          <div>
            <span className="kicker">முதன்மைச் சான்று · PRIMARY EVIDENCE</span>
            <h2 className="ta">{first ? `${first.source.titleTa} · ${first.pageOrVerseNo || first.lineRef || ""}` : "சான்றுகள்"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        {loading && <div className="skeleton"><i /><i /><i /><i /></div>}
        {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
        {data && data.evidences.length === 0 && (
          <EmptyState title="சான்று இன்னும் கிடைக்கவில்லை" hint="No verified evidence for this period yet." />
        )}
        {first && (
          <>
            <div className="reliability">
              <span><Icon name="check" />{first.verified ? "Peer-reviewed source" : "Unverified source"}</span>
              <b>{first.verified ? "High confidence" : "Needs review"}</b>
            </div>
            <div className="verse verse-ta">
              <span className="verse-number">{first.pageOrVerseNo || "❧"}</span>
              <p>{highlightVerse(first.verseText, first.formText)}</p>
            </div>
            <div className="translation-block">
              <span>ATTESTED FORM</span>
              <p className="ta">{first.formText} · {first.periodNameTa} ({first.years})</p>
            </div>
            <div className="translation-block">
              <span>ENGLISH GLOSS</span>
              <p>{first.translationEn}</p>
            </div>
            <KolamDivider />
            <dl className="source-details">
              <div><dt>Source</dt><dd className="ta">{first.source.titleTa} · {first.source.title}</dd></div>
              <div><dt>Period</dt><dd>{first.periodName} · {first.years}</dd></div>
              <div><dt>Author</dt><dd className="ta">{first.source.author}</dd></div>
              <div><dt>Reference</dt><dd>{first.pageOrVerseNo || first.lineRef || "—"}</dd></div>
            </dl>
            <div className="citation">
              <span>CITE THIS EVIDENCE</span>
              <div className="citation-tabs">
                {(["apa", "mla", "chicago"] as const).map((s) => (
                  <button key={s} className={citeStyle === s ? "active" : ""} onClick={() => setCiteStyle(s)}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
              <p>{first.citations[citeStyle]}</p>
            </div>
            <div className="drawer-actions">
              <Button variant="soft" icon={copied ? "check" : "copy"} onClick={copyCitation}>
                {copied ? "Copied" : "Cite this"}
              </Button>
              <Button icon="external">Open full text</Button>
            </div>
            {data.count > 1 && <small>{data.count - 1} more evidence(s) for this word — refine by period.</small>}
          </>
        )}
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Search view: live search, 300ms debounce, filters, pagination, states
// ---------------------------------------------------------------------------

function SearchView({ initialQuery, onOpenJourney }: {
  initialQuery: string; onOpenJourney: (id: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [period, setPeriod] = useState("all");
  const [changeType, setChangeType] = useState("all");
  const [page, setPage] = useState(1);
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebouncedValue(query, 300);
  const reqId = useRef(0);

  useEffect(() => {
    api.periods().then(setPeriods).catch(() => undefined);
  }, []);

  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    api.search({ q: debounced, period, changeType, page, limit: 12 })
      .then((d) => { if (id === reqId.current) { setData(d); setLoading(false); } })
      .catch((e: Error) => { if (id === reqId.current) { setError(e.message); setLoading(false); } });
  }, [debounced, period, changeType, page]);

  useEffect(() => { setPage(1); }, [debounced, period, changeType]);

  return (
    <main className="page">
      <div className="search-top">
        <span className="kicker">சொல் தேடல் · WORD SEARCH</span>
        <h1 className="ta">காலத்தின் வழியே தேடுங்கள்</h1>
        <SearchBox compact value={query} onChange={setQuery} onSubmit={() => undefined} />
        {data && data.transliterationSuggestions.length > 0 && data.query && (
          <div className="suggestion">
            <Icon name="spark" />
            <span>Transliterated <b>“{data.query}”</b> → <b className="ta">“{data.targetTamil}”</b></span>
            <button onClick={() => setQuery(data.targetTamil)}>Search it</button>
          </div>
        )}
      </div>
      <div className="results-layout">
        <aside className="filters" aria-label="Filters">
          <div className="filter-title"><b className="ta">வடிகட்டிகள்</b>
            <button onClick={() => { setPeriod("all"); setChangeType("all"); }}>அழி</button>
          </div>
          <div className="filter-group">
            <strong className="ta">காலம் · Period</strong>
            <label>
              <input type="radio" name="period" checked={period === "all"} onChange={() => setPeriod("all")} />
              <span>அனைத்தும் · All</span>
            </label>
            {periods.map((p) => (
              <label key={p.id}>
                <input type="radio" name="period" checked={period === p.id} onChange={() => setPeriod(p.id)} />
                <span className="ta">{p.nameTa} · {p.name}</span>
              </label>
            ))}
          </div>
          <div className="filter-group">
            <strong className="ta">மாற்றம் · Change type</strong>
            {(["all", "spelling", "meaning", "usage"] as const).map((c) => (
              <label key={c}>
                <input type="radio" name="ct" checked={changeType === c} onChange={() => setChangeType(c)} />
                <span>{c === "all" ? "All types" : c}</span>
              </label>
            ))}
          </div>
        </aside>
        <section className="results" aria-live="polite">
          <div className="result-header">
            <div>
              {loading ? <span>Searching…</span> : data && (
                <><strong className="ta">“{data.targetTamil || data.query || "—"}”</strong>
                <span> — {data.total} result(s)</span></>
              )}
            </div>
            <select aria-label="Change type filter" value={changeType} onChange={(e) => setChangeType(e.target.value)}>
              <option value="all">Best evidence</option>
              <option value="spelling">Spelling first</option>
              <option value="meaning">Meaning first</option>
              <option value="usage">Usage first</option>
            </select>
          </div>
          {loading && <SkeletonCards count={3} />}
          {!loading && error && <ErrorState message={error} onRetry={() => setPage((p) => p)} />}
          {!loading && !error && data && data.results.length === 0 && (
            <EmptyState title="சான்று இன்னும் கிடைக்கவில்லை"
              hint="Try widening the historical period or removing a source filter." />
          )}
          {!loading && !error && data && data.results.map((r) => (
            <button className="result-card" key={r.id} onClick={() => onOpenJourney(r.id)}>
              <div className="word-pair">
                <span className="ta">{r.oldForm}</span>
                <div><i /><Icon name="arrow" /><small>{r.periods.join(" · ")}</small></div>
                <span className="ta">{r.modernForm}</span>
              </div>
              <p className="ta">{r.description}</p>
              <p><small>{r.meaningSummary}</small></p>
              <div className="result-meta">
                <span className={`badge ${r.changeType}`}>
                  {r.changeType === "spelling" ? "எழுத்து மாற்றம்" : r.changeType === "meaning" ? "பொருள் மாற்றம்" : "பயன்பாட்டு மாற்றம்"}
                </span>
                <span className="ta">{r.lemmaTa} · {r.transliteration}</span>
                <span><Icon name="evidence" /> {r.evidenceCount} சான்றுகள்</span>
              </div>
            </button>
          ))}
          {!loading && !error && data && data.totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
              <span>Page {data.page} / {data.totalPages}</span>
              <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Journey view: hero screen with timeline + morph + diff + evidence
// ---------------------------------------------------------------------------

export interface JourneyParams {
  from?: string;
  to?: string;
}

function JourneyView({ wordId, params, notify, onShare }: {
  wordId: string; params: JourneyParams; notify: (m: string) => void; onShare: (url: string) => void;
}) {
  const [journey, setJourney] = useState<JourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    api.journey(wordId)
      .then((d) => {
        if (!live) return;
        setJourney(d);
        const wantedTo = params.to && d.timeline.some((n) => n.periodId === params.to)
          ? params.to
          : d.timeline[Math.min(2, d.timeline.length - 1)]?.periodId || d.timeline[0]?.periodId;
        setActivePeriod(wantedTo);
        setLoading(false);
      })
      .catch((e: Error) => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [wordId, params.to]);

  const activeNode = useMemo(
    () => journey?.timeline.find((n) => n.periodId === activePeriod) || journey?.timeline[0] || null,
    [journey, activePeriod]
  );

  useEffect(() => {
    if (!journey || !activeNode) return;
    const base = (params.from && journey.timeline.find((n) => n.periodId === params.from)) || journey.timeline[0];
    if (!base || base.periodId === activeNode.periodId) { setCompare(null); return; }
    let live = true;
    api.compare(journey.word.lemmaTa, base.periodId, activeNode.periodId)
      .then((c) => { if (live) setCompare(c); })
      .catch(() => { if (live) setCompare(null); });
    return () => { live = false; };
  }, [journey, activeNode, params.from]);

  function shareJourney() {
    if (!journey || !activeNode) return;
    const base = (params.from && journey.timeline.some((n) => n.periodId === params.from))
      ? params.from
      : journey.timeline[0]?.periodId || "sangam";
    const url = `${window.location.origin}${window.location.pathname}#/word/${encodeURIComponent(journey.word.id)}?from=${base}&to=${activeNode.periodId}`;
    onShare(url);
  }

  if (loading) {
    return (
      <main className="page">
        <div className="skeleton"><i /><i /><i /><i /></div>
        <b className="ta">சான்றுகளைத் தேடுகிறோம்…</b>
        <small>Searching indexed texts</small>
      </main>
    );
  }
  if (error || !journey || !activeNode) {
    return (
      <main className="page">
        <ErrorState message={error || "Word journey not found."} onRetry={() => window.location.reload()} />
      </main>
    );
  }

  const graphemes = splitGraphemesClient(activeNode.word);

  return (
    <main className="journey-page">
      <div className="journey-title">
        <div>
          <span className="kicker">சொல் பயணம் · WORD JOURNEY</span>
          <div className="title-word">
            <h1 className="ta morph-giant" key={activeNode.word}>
              {graphemes.map((g, i) => (
                <span key={`${activeNode.periodId}-${i}`} className="morph-letter ta"
                  style={{ animationDelay: `${i * 45}ms` }}>{g}</span>
              ))}
            </h1>
            <button onClick={() => setEvidenceOpen(true)}><Icon name="bookmark" /> சேமிக்க</button>
            <button onClick={shareJourney} aria-label="Copy permalink"><Icon name="copy" /> Share</button>
          </div>
          <p>{journey.word.transliteration} · {journey.word.pos} · year, annual cycle</p>
        </div>
        <div className="confidence">
          <div><span style={{ width: `${journey.overallConfidence}%` }} /></div>
          <b>{journey.overallConfidence}%</b>
          <small>evidence confidence</small>
        </div>
      </div>
      <div className="morph-strip" aria-label="Letter morph across eras">
        <span className="ta">{journey.timeline[0]?.word}</span><i className="ta">{activeNode.meaningTa}</i>
        <div /><span className="ta">{activeNode.word}</span><i className="ta">{activeNode.meaningEn}</i>
        <small>சொல் உருமாற்றம் · letter morph</small>
      </div>
      <section className="timeline-wrap">
        <div className="timeline-intro"><span>300 BCE</span><b>2,300 years of change</b><span>Today</span></div>
        <div className="timeline" role="tablist" aria-label="Period timeline">
          <div className="river" />
          {journey.timeline.map((p) => (
            <button key={p.periodId} role="tab" aria-selected={p.periodId === activeNode.periodId}
              className={`timeline-node ${p.periodId === activeNode.periodId ? "active" : ""}`}
              onClick={() => setActivePeriod(p.periodId)}>
              <div className={`node-dot ${p.color}`}>
                <span>{p.confidence}</span>
              </div>
              <div className="node-card">
                <small className="ta">{p.era}</small>
                <b className="ta">{p.word}</b>
                <span className="meaning-chip ta">{p.meaningTa}</span>
                <span>{p.meaningEn}</span>
                <em>{p.years}</em>
                <i className="confidence-dot" title={`Confidence ${p.confidence}%`}>
                  <Icon name="evidence" /> {p.evidenceCount} சான்றுகள் · {p.confidence}%
                </i>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="journey-analysis">
        <div className="analysis-summary">
          <div>
            <span className={`badge ${journey.primaryChangeType}`}>
              {journey.primaryChangeType === "spelling" ? "எழுத்து மாற்றம்"
                : journey.primaryChangeType === "meaning" ? "பொருள் மாற்றம்" : "பயன்பாட்டு மாற்றம்"}
            </span>
            <h2 className="ta">{journey.changeSummary}</h2>
            <p>{activeNode.meaningEn} — {activeNode.years}. Confidence {activeNode.confidence}%.</p>
          </div>
          <button className="evidence-callout" onClick={() => setEvidenceOpen(true)}>
            <Icon name="evidence" size={28} />
            <span><b>{activeNode.evidenceCount} primary sources</b><small>Open evidence panel</small></span>
            <Icon name="arrow" />
          </button>
        </div>
        {compare ? (
          <div className="compare-view">
            <div className="compare-header">
              <div>
                <span className="kicker">LETTER-BY-LETTER COMPARISON</span>
                <h2 className="ta">எழுத்துகளின் மாற்றம்</h2>
              </div>
              <div className="legend">
                <span><i className="removed" />Removed</span>
                <span><i className="added" />Added</span>
              </div>
            </div>
            <DiffStrip tokens={compare.spelling.diff} fromText={compare.spelling.fromText} toText={compare.spelling.toText} />
            <p>{compare.spelling.descriptionEn}</p>
            <p className="ta">{compare.spelling.descriptionTa}</p>
          </div>
        ) : (
          <p><small>Select another era to see the letter-level diff from {journey.timeline[0]?.era}.</small></p>
        )}
      </section>
      {evidenceOpen && (
        <EvidenceDrawer wordId={journey.word.id} periodId={activeNode.periodId}
          onClose={() => setEvidenceOpen(false)} notify={notify} />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Compare view: word + from/to, diff + drift + usage
// ---------------------------------------------------------------------------

function ComparePage({ notify }: { notify: (m: string) => void }) {
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [word, setWord] = useState("யாண்டு");
  const [from, setFrom] = useState("sangam");
  const [to, setTo] = useState("modern");
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.periods().then((p) => {
      setPeriods(p);
      if (p.length >= 2) { setFrom(p[0].id); setTo(p[p.length - 1].id); }
    }).catch(() => undefined);
  }, []);

  const run = useCallback(async () => {
    if (!word.trim()) { notify("Enter a Tamil word to compare"); return; }
    setLoading(true);
    setError(null);
    try {
      const d = await api.compare(word.trim(), from, to);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setLoading(false);
    }
  }, [word, from, to, notify]);

  useEffect(() => { run(); }, [run]);

  return (
    <main className="page">
      <div className="page-title">
        <div>
          <span className="kicker">ஒப்பீடு · COMPARE ERAS</span>
          <h1 className="ta">காலங்களை ஒப்பிடுக</h1>
          <p>Live spelling, meaning and usage comparison from the change engine.</p>
        </div>
      </div>
      <div className="compare-controls">
        <label>Word<input value={word} onChange={(e) => setWord(e.target.value)} className="ta"
          placeholder="யாண்டு" aria-label="Word to compare" /></label>
        <label>From<select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From period">
          {periods.map((p) => <option key={p.id} value={p.id}>{p.nameTa} · {p.name}</option>)}
        </select></label>
        <label>To<select value={to} onChange={(e) => setTo(e.target.value)} aria-label="To period">
          {periods.map((p) => <option key={p.id} value={p.id}>{p.nameTa} · {p.name}</option>)}
        </select></label>
        <Button icon="chart" onClick={run}>Compare</Button>
      </div>
      {loading && <div className="skeleton"><i /><i /><i /></div>}
      {error && <ErrorState message={error} onRetry={run} />}
      {data && !loading && (
        <div className="compare-view">
          <DiffStrip tokens={data.spelling.diff} fromText={data.spelling.fromText} toText={data.spelling.toText} />
          <div className="compare-grid">
            <div className="analysis-card">
              <span className="kicker">MEANING DRIFT · {(data.semantic.driftScore * 100).toFixed(1)}%</span>
              <h3 className="ta">{data.semantic.classificationTa} · {data.semantic.classification}</h3>
              <p>{data.semantic.explanationEn}</p>
              <p className="ta">{data.semantic.explanationTa}</p>
              <p><small>Similarity {(data.semantic.similarityScore * 100).toFixed(1)}% · {data.semantic.fromMeaningEn} → {data.semantic.toMeaningEn}</small></p>
            </div>
            <div className="analysis-card">
              <span className="kicker">USAGE CHANGE · {data.usage.frequencyDelta > 0 ? "+" : ""}{data.usage.frequencyDelta}</span>
              <h3 className="ta">{data.usage.classificationTa}</h3>
              <p>{data.usage.explanationEn}</p>
              <p className="ta">{data.usage.explanationTa}</p>
              <p><small>{data.usage.fromFrequency} → {data.usage.toFrequency} · {data.usage.fromPos} → {data.usage.toPos}</small></p>
            </div>
          </div>
          <p><small>Overall similarity {(data.overallSimilarity * 100).toFixed(1)}% · primary change: {data.primaryChangeType}</small></p>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Home: live stats + featured word from the real backend
// ---------------------------------------------------------------------------

function FeaturedQuote({ wordId, onOpen }: { wordId: string | null; onOpen: (id: string) => void }) {
  const [quote, setQuote] = useState<EvidenceResponse["evidences"][number] | null>(null);
  useEffect(() => {
    if (!wordId) return;
    api.evidence(wordId).then((d) => setQuote(d.evidences[0] || null)).catch(() => undefined);
  }, [wordId]);
  return (
    <div className="era-quote">
      <span className="quote-mark">“</span>
      {quote ? (
        <>
          <p className="ta verse-ta">{quote.verseText}</p>
          <small className="ta">{quote.source.titleTa} · {quote.source.author} · {quote.source.century}</small>
          <button onClick={() => wordId && onOpen(wordId)}>சான்றைக் காண்க <Icon name="arrow" /></button>
        </>
      ) : (
        <p><small>Loading live verse…</small></p>
      )}
    </div>
  );
}

function Home({ setView, onSearch, onOpenJourney }: {
  setView: (v: View) => void; onSearch: (q: string) => void; onOpenJourney: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [stats, setStats] = useState<{ words: number; sources: number; periods: number } | null>(null);
  const [featured, setFeatured] = useState<JourneyResponse | null>(null);
  const [eraLabel, setEraLabel] = useState("");

  useEffect(() => {
    api.insights()
      .then((d) => {
        setStats({ words: d.totalIndexedWords, sources: d.indexedSources, periods: d.periodsCovered });
        // Word of the Era: deterministic daily rotation over the live most-changed list.
        const now = new Date();
        const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
        const list = d.mostChangedWords;
        if (list.length > 0) {
          const pick = list[dayOfYear % list.length];
          setEraLabel(`${now.toLocaleDateString()} · ${pick.details}`);
          // Journey resolves by id, lemmaTa or lemmaModern — the live word string works.
          api.journey(pick.word).then(setFeatured).catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="eyebrow"><span>ஆவணப்படுத்தப்பட்ட மொழி வரலாறு</span></div>
        <h1>Every word carries<br /><em>a thousand years.</em></h1>
        <p className="hero-copy ta">தமிழ்ச் சொற்களின் காலப்பயணத்தை இலக்கியச் சான்றுகளுடன் கண்டறியுங்கள்.</p>
        <div className="word-morph" aria-label="Word evolution from yaandu to aandu">
          <span className="ta">யாண்டு</span>
          <div className="morph-line"><i /><b>கி.மு. 300</b><i /><Icon name="arrow" /></div>
          <span className="ta">ஆண்டு</span>
        </div>
        <SearchBox value={q} onChange={setQ} onSubmit={() => onSearch(q)} />
        <div className="hero-meta">
          <span><Icon name="spark" /> Smart transliteration</span>
          <span><Icon name="evidence" /> Every claim cited</span>
          <span><Icon name="book" /> {stats ? `${stats.sources} canonical texts` : "Live corpus"}</span>
        </div>
      </section>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <span className="kicker">இன்றைய சொல் · WORD OF THE ERA</span>
            <h2 className="ta">ஒரு சொல்லின் மறைந்த வரலாறு</h2>
          </div>
          <Button variant="ghost" icon="arrow" onClick={() => setView("journey")}>முழுப் பயணம்</Button>
        </div>
        <div className="era-card">
          <div className="era-main">
            <div className="era-tag ta">Word of the Era · {eraLabel || "daily pick from live research data"}</div>
            {featured ? (
              <>
                <div className="featured-word ta">{featured.word.lemmaTa}</div>
                <div className="pronunciation">{featured.word.transliteration} · {featured.word.pos}</div>
                <p>{featured.changeSummary}</p>
              </>
            ) : (
              <div className="skeleton"><i /><i /><i /></div>
            )}
            <div className="change-row">
              <span className={`badge ${featured?.primaryChangeType || "meaning"}`}>
                {featured?.primaryChangeType === "spelling" ? "எழுத்து மாற்றம்"
                  : featured?.primaryChangeType === "usage" ? "பயன்பாட்டு மாற்றம்" : "Meaning drift"}
              </span>
              <button className="source-count" onClick={() => featured && onOpenJourney(featured.word.id)}>
                <Icon name="evidence" /> Open live journey
              </button>
            </div>
          </div>
          <FeaturedQuote wordId={featured?.word.id || null} onOpen={onOpenJourney} />
        </div>
      </section>
      <section className="stats-band">
        {[
          [stats ? stats.words.toLocaleString() : "…", "சொற்கள் தடமறியப்பட்டன", "Words traced"],
          [stats ? String(stats.sources) : "…", "மூல நூல்கள்", "Texts indexed"],
          [stats ? String(stats.periods) : "…", "வரலாற்றுக் காலங்கள்", "Periods covered"],
        ].map(([n, ta, en]) => (
          <div className="stat" key={en as string}>
            <strong>{n}</strong><span className="ta">{ta}</span><small>{en}</small>
          </div>
        ))}
      </section>
      <section className="content-section how">
        <div className="center-heading">
          <span className="kicker">மூன்று எளிய படிகள்</span>
          <h2>Research with a trail of evidence</h2>
          <p>Built for curious readers and rigorous researchers alike.</p>
        </div>
        <div className="steps">
          {([
            ["01", "search", "சொல்லைத் தேடுங்கள்", "Search in Tamil or type phonetically in English."],
            ["02", "chart", "காலப்பயணம் காணுங்கள்", "Follow spelling, meaning and usage through six eras."],
            ["03", "evidence", "சான்றைச் சரிபாருங்கள்", "Open the original verse, translation and citation."],
          ] as Array<[string, IconName, string, string]>).map(([n, icon, title, text]) => (
            <div className="step" key={n}>
              <span className="step-number">{n}</span>
              <div className="step-icon"><Icon name={icon} /></div>
              <h3 className="ta">{title}</h3><p>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Insights / Workspace / Contribute (all live, no mocks)
// ---------------------------------------------------------------------------

function InsightsView() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.insights>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.insights().then(setData).catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <main className="page"><ErrorState message={error} onRetry={() => window.location.reload()} /></main>;
  if (!data) return <main className="page"><div className="skeleton"><i /><i /><i /></div></main>;
  return (
    <main className="page dashboard">
      <div className="page-title">
        <div>
          <span className="kicker">தரவு ஆய்வுகள் · INSIGHTS</span>
          <h1>Tamil, seen through data</h1>
          <p>{data.totalIndexedWords.toLocaleString()} words · {data.indexedSources} sources · {data.periodsCovered} periods (live).</p>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="dash-card wide">
          <div className="card-head">
            <div><span className="kicker">MOST CHANGED WORDS</span><h3 className="ta">சொற்களின் மாற்ற அளவு</h3></div>
          </div>
          <div className="bars">
            {data.mostChangedWords.map((m) => (
              <div key={m.word}><span className="ta">{m.word}</span>
                <i><b style={{ width: `${m.score}%` }} /></i><strong>{m.score}%</strong></div>
            ))}
          </div>
        </div>
        <div className="dash-card">
          <span className="kicker">CHANGE TYPES</span><h3 className="ta">மாற்ற வகைகள்</h3>
          <div className="donut"><div><b>{(data.changeTypeDistribution.totalChanges / 1000).toFixed(1)}k</b><span>changes</span></div></div>
          <div className="donut-legend">
            <span><i className="terra" />Spelling <b>{data.changeTypeDistribution.spelling}%</b></span>
            <span><i className="teal" />Meaning <b>{data.changeTypeDistribution.meaning}%</b></span>
            <span><i className="gold" />Usage <b>{data.changeTypeDistribution.usage}%</b></span>
          </div>
        </div>
      </div>
    </main>
  );
}

function Protected({ user, setView, children }: {
  user: AuthUser | null; setView: (v: View) => void; children: ReactNode;
}) {
  if (!user) {
    return (
      <main className="page">
        <div className="state-card">
          <span className="kicker">PROTECTED</span>
          <b className="ta">உள்நுழைக · Sign in required</b>
          <small>This workspace is private. Sign in to continue.</small>
          <Button onClick={() => setView("auth")}>Sign in</Button>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}

function WorkspaceView() {
  const [cols, setCols] = useState<Array<{ id: string; name: string; description?: string; items: unknown[] }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiFetch<Array<{ id: string; name: string; description?: string; items: unknown[] }>>("/api/collections")
      .then((d) => { setCols(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);
  if (loading) return <main className="page"><SkeletonCards count={2} /></main>;
  if (error) return <main className="page"><ErrorState message={error} onRetry={() => window.location.reload()} /></main>;
  return (
    <main className="page">
      <div className="page-title">
        <div>
          <span className="kicker">ஆய்வாளர் பணியிடம் · WORKSPACE</span>
          <h1 className="ta">உங்கள் சொல் சேகரிப்பு</h1>
          <p>{cols.length} live collection(s) from the backend.</p>
        </div>
      </div>
      {cols.length === 0 && (
        <EmptyState title="உங்கள் முதல் சொல்லைச் சேமியுங்கள்"
          hint="Build a collection to compare words and export citations." />
      )}
      {cols.map((c) => (
        <div className="saved-card" key={c.id}>
          <div className="saved-index">❧</div>
          <div><h3 className="ta">{c.name}</h3><small>{c.description}</small></div>
          <div className="saved-source"><Icon name="evidence" /><b>{c.items.length} items</b></div>
        </div>
      ))}
    </main>
  );
}

function ContributeView({ notify }: { notify: (m: string) => void }) {
  const [items, setItems] = useState<Array<{ id: string; wordText: string; status: string; sourceTitle: string }>>([]);
  const [wordText, setWordText] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [verseText, setVerseText] = useState("");
  const [periodId, setPeriodId] = useState("sangam");

  const refresh = useCallback(() => {
    apiFetch<Array<{ id: string; wordText: string; status: string; sourceTitle: string }>>("/api/contributions")
      .then(setItems).catch(() => undefined);
  }, []);

  useEffect(refresh, [refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/api/contributions", {
        method: "POST",
        body: { wordText, periodId, changeType: "meaning", sourceTitle, verseText },
      });
      notify("Contribution submitted for scholar review");
      setWordText(""); setSourceTitle(""); setVerseText("");
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Submit failed");
    }
  }

  return (
    <main className="page">
      <div className="page-title">
        <div>
          <span className="kicker">சமூகப் பங்களிப்பு · CONTRIBUTE</span>
          <h1 className="ta">வரலாற்றுக்கு ஒரு சான்றைச் சேர்க்கவும்</h1>
          <p>Every contribution is reviewed by verified Tamil scholars.</p>
        </div>
      </div>
      <div className="contribute-grid">
        <form className="contribute-form" onSubmit={submit}>
          <label>தமிழ்ச் சொல்<input value={wordText} onChange={(e) => setWordText(e.target.value)}
            placeholder="எ.கா. கடவுள்" required className="ta" /></label>
          <div className="form-row">
            <label>வரலாற்றுக் காலம்
              <select value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
                <option value="sangam">சங்க காலம்</option>
                <option value="pallava">பக்தி காலம்</option>
                <option value="chola">சோழர் காலம்</option>
                <option value="nayak">நாயக்கர் காலம்</option>
                <option value="colonial">காலனிய காலம்</option>
                <option value="modern">நவீன காலம்</option>
              </select>
            </label>
          </div>
          <label>மூல நூல்<input value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)}
            placeholder="நூலின் பெயர்" className="ta" /></label>
          <label>மூல வரிகள்<textarea value={verseText} onChange={(e) => setVerseText(e.target.value)}
            placeholder="அசல் தமிழ்ச் செய்யுளை இங்கே உள்ளிடவும்…" className="ta verse-ta" /></label>
          <Button type="submit" icon="arrow">ஆய்வுக்கு அனுப்புக</Button>
        </form>
        <aside className="review-queue">
          <div className="queue-head"><span className="kicker">SCHOLAR REVIEW QUEUE</span><h3 className="ta">சரிபார்ப்புப் பட்டியல்</h3></div>
          {items.map((w) => (
            <div className="queue-item" key={w.id}>
              <span className={`status ${w.status}`} />
              <div><b className="ta">{w.wordText}</b><small>{w.sourceTitle}</small></div>
              <em>{w.status}</em>
            </div>
          ))}
          {items.length === 0 && <small>No contributions yet.</small>}
        </aside>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Auth view
// ---------------------------------------------------------------------------

function AuthView({ onAuthed, notify }: {
  onAuthed: (u: AuthUser) => void; notify: (m: string) => void;
}) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = mode === "in"
        ? await api.login(email, password)
        : await api.register({ name, email, password, role: "researcher" });
      setToken(res.token);
      try { window.localStorage.setItem(USER_KEY, JSON.stringify(res.user)); } catch { /* noop */ }
      onAuthed(res.user);
      notify(`Welcome, ${res.user.name} (${res.user.role})`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-art">
        <div className="sun-disc" />
        <div className="auth-quote">
          <span>“</span>
          <p className="ta verse-ta">யாதும் ஊரே<br />யாவரும் கேளிர்</p>
          <small>Every place is our home; everyone our kin.</small>
        </div>
      </section>
      <section className="auth-form">
        <div className="auth-box">
          <span className="kicker">மீண்டும் வருக · WELCOME BACK</span>
          <h1 className="ta">{mode === "in" ? "உங்கள் ஆய்வைத் தொடருங்கள்" : "புதிய கணக்கை உருவாக்குங்கள்"}</h1>
          <p>Sign in to access saved words, notes and collections.</p>
          <form onSubmit={submit}>
            {mode === "up" && (
              <label>பெயர் · Name<input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your name" required /></label>
            )}
            <label>மின்னஞ்சல் · Email<input type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="researcher@example.com" required /></label>
            <label>கடவுச்சொல் · Password<input type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></label>
            <Button type="submit">{busy ? "…" : mode === "in" ? "உள்நுழைக · Sign in" : "Create account"}</Button>
          </form>
          <p className="signup">
            {mode === "in" ? "New to Sorkalam? " : "Have an account? "}
            <button onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
        <small className="auth-foot">By continuing, you agree to our Terms &amp; Privacy Policy.</small>
      </section>
    </main>
  );
}

function NotFound({ setView }: { setView: (v: View) => void }) {
  return (
    <main className="page">
      <div className="state-card">
        <span className="kicker">404 · NOT FOUND</span>
        <b className="ta">பக்கம் கிடைக்கவில்லை</b>
        <small>The page you asked for does not exist.</small>
        <Button onClick={() => setView("home")}>Go home</Button>
      </div>
    </main>
  );
}

function BottomNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <nav className="bottom-nav">
      {([["home", "search", "தேடல்"], ["journey", "chart", "பயணம்"], ["compare", "bookmark", "ஒப்பிடு"], ["contribute", "plus", "பங்களி"]] as Array<[View, IconName, string]>).map(([id, icon, label]) => (
        <button className={view === id ? "active" : ""} key={id} onClick={() => setView(id)}>
          <Icon name={icon} /><span className="ta">{label}</span>
        </button>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

export default function App() {
  const [view, setView] = useState<View>("home");
  const [dark, setDark] = useState(loadDark);
  const [lang, setLang] = useState<Lang>(loadLang);
  const [user, setUser] = useState<AuthUser | null>(loadCachedUser);
  const [searchQuery, setSearchQuery] = useState("");
  const [journeyId, setJourneyId] = useState("w-kadavul");
  const [journeyParams, setJourneyParams] = useState<JourneyParams>({});

function parseWordHash(): { id: string; params: JourneyParams } | null {
  try {
    const h = window.location.hash;
    const m = h.match(/^#\/word\/([^?]+)(\?(.*))?$/);
    if (!m) return null;
    const id = decodeURIComponent(m[1]);
    const sp = new URLSearchParams(m[3] || "");
    return { id, params: { from: sp.get("from") || undefined, to: sp.get("to") || undefined } };
  } catch {
    return null;
  }
}
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DARK_KEY, dark ? "1" : "0");
      window.localStorage.setItem(LANG_KEY, lang);
    } catch { /* noop */ }
  }, [dark, lang]);

  useEffect(() => {
    setOnUnauthorized(() => setView("auth"));
    if (getToken() && !user) {
      api.me().then((u) => {
        setUser(u);
        try { window.localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch { /* noop */ }
      }).catch(() => clearAuth());
    }
    const onEvt = () => setView("auth");
    window.addEventListener("sorkalam:unauthorized", onEvt);
    return () => window.removeEventListener("sorkalam:unauthorized", onEvt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  // Keyboard shortcut: "/" focuses the search bar from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      const visible = Array.from(document.querySelectorAll<HTMLInputElement>("input[data-search-input]"))
        .find((el) => el.offsetParent !== null);
      if (visible) {
        visible.focus();
      } else {
        setView("search");
        window.setTimeout(() => {
          document.querySelector<HTMLInputElement>("input[data-search-input]")?.focus();
        }, 80);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openSearch(q: string) {
    setSearchQuery(q);
    setView("search");
  }

  function openJourney(id: string, params: JourneyParams = {}) {
    setJourneyId(id);
    setJourneyParams(params);
    setView("journey");
    try {
      const qs = new URLSearchParams();
      if (params.from) qs.set("from", params.from);
      if (params.to) qs.set("to", params.to);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      window.location.hash = `/word/${encodeURIComponent(id)}${suffix}`;
    } catch { /* noop */ }
  }

  async function shareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    notify("Permalink copied — share this word journey");
  }

  // Deep link: #/word/:id?from=&to= opens the journey directly (incl. back/forward).
  useEffect(() => {
    const apply = () => {
      const parsed = parseWordHash();
      if (parsed) {
        setJourneyId(parsed.id);
        setJourneyParams(parsed.params);
        setView("journey");
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  function handleSignOut() {
    clearAuth();
    setUser(null);
    setView("home");
    notify("Signed out");
  }

  const t = (k: keyof typeof STRINGS) => (lang === "ta" ? STRINGS[k].ta : STRINGS[k].en);

  return (
    <div className={dark ? "app dark" : "app"} lang={lang === "ta" ? "ta" : "en"}>
      {view !== "auth" && (
        <Header view={view} setView={setView} dark={dark} setDark={setDark}
          lang={lang} setLang={setLang} user={user} onSignOut={handleSignOut} />
      )}
      {view === "home" && <Home setView={setView} onSearch={openSearch} onOpenJourney={openJourney} />}
      {view === "search" && <SearchView initialQuery={searchQuery} onOpenJourney={openJourney} />}
      {view === "journey" && (
        <JourneyView wordId={journeyId} params={journeyParams} notify={notify} onShare={shareUrl} />
      )}
      {view === "compare" && <ComparePage notify={notify} />}
      {view === "insights" && <InsightsView />}
      {view === "workspace" && (
        <Protected user={user} setView={setView}><WorkspaceView /></Protected>
      )}
      {view === "contribute" && (
        <Protected user={user} setView={setView}><ContributeView notify={notify} /></Protected>
      )}
      {view === "auth" && (
        <AuthView notify={notify} onAuthed={(u) => { setUser(u); setView("workspace"); }} />
      )}
      {view === "notfound" && <NotFound setView={setView} />}
      {view !== "auth" && (
        <footer>
          <Brand onClick={() => setView("home")} />
          <p className="ta">தமிழ்ச் சொற்களின் காலப்பயணம்.<br />A living archive of Tamil language. ({t("search")})</p>
          <button onClick={() => setView("notfound")}>System states</button>
          <small>© 2025 Sorkalam Research Project</small>
        </footer>
      )}
      {view !== "auth" && <BottomNav view={view} setView={setView} />}
      <Toast message={toast} />
    </div>
  );
}
