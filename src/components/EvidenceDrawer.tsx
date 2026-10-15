/**
 * Evidence drawer (live /evidence). Heavy-page dependency — kept out of the
 * eager app shell so the Journey view can be code-split.
 */

import { useEffect, useRef, useState } from "react";
import { api, type EvidenceResponse } from "../lib/api";
import {
  Icon,
  Button,
  KolamDivider,
  EmptyState,
  ErrorState,
  highlightVerse,
} from "./ui";

export function EvidenceDrawer({ wordId, periodId, onClose, notify }: {
  wordId: string; periodId?: string; onClose: () => void; notify: (m: string) => void;
}) {
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [citeStyle, setCiteStyle] = useState<"apa" | "mla" | "chicago">("apa");
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Evidence panel">
        <div className="drawer-handle" />
        <div className="drawer-head">
          <div>
            <span className="kicker">முதன்மைச் சான்று · PRIMARY EVIDENCE</span>
            <h2 className="ta">{first ? `${first.source.titleTa} · ${first.pageOrVerseNo || first.lineRef || ""}` : "சான்றுகள்"}</h2>
          </div>
          <button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close evidence panel">
            <Icon name="close" />
          </button>
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
