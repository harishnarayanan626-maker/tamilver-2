/**
 * Word Journey hero view (timeline + letter morph + diff + evidence).
 * Lazy-loaded: this module is its own chunk, separate from the app shell.
 */

import { useEffect, useMemo, useState } from "react";
import {
  api,
  splitGraphemesClient,
  type CompareResponse,
  type JourneyResponse,
} from "../lib/api";
import { Icon, DiffStrip, ErrorState } from "../components/ui";
import { EvidenceDrawer } from "../components/EvidenceDrawer";

export interface JourneyParams {
  from?: string;
  to?: string;
}

export default function JourneyView({ wordId, params, notify, onShare }: {
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
        <div
          className="timeline"
          role="tablist"
          aria-label="Period timeline. Use left and right arrow keys to move between periods."
          onKeyDown={(e) => {
            const nodes = Array.from(document.querySelectorAll<HTMLButtonElement>(".timeline-node"));
            const current = nodes.indexOf(document.activeElement as HTMLButtonElement);
            if (current < 0) return;
            let next: number | null = null;
            if (e.key === "ArrowRight") next = (current + 1) % nodes.length;
            else if (e.key === "ArrowLeft") next = (current - 1 + nodes.length) % nodes.length;
            else if (e.key === "Home") next = 0;
            else if (e.key === "End") next = nodes.length - 1;
            if (next !== null) {
              e.preventDefault();
              nodes[next].focus();
            }
          }}
        >
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
