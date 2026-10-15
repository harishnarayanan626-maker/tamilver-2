/**
 * Sorkalam Frontend API Client
 * Connects UI directly to backend endpoints with fallback data for resilient development.
 */

export interface SearchResultItem {
  id: string;
  lemmaModern: string;
  lemmaTa: string;
  transliteration: string;
  pos: string;
  matchedForm: string;
  oldForm: string;
  modernForm: string;
  changeType: "spelling" | "meaning" | "usage";
  description: string;
  meaningSummary: string;
  evidenceCount: number;
  periods: string[];
  similarityScore: number;
  usageDomains?: string;
  exampleQuote?: string;
}

export interface SearchResponse {
  query: string;
  targetTamil: string;
  transliterationSuggestions: string[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  results: SearchResultItem[];
}

export interface TimelineNode {
  periodId: string;
  era: string;
  en: string;
  years: string;
  color: string;
  word: string;
  meaningEn: string;
  meaningTa: string;
  confidence: number;
  frequencyScore: number;
  evidenceCount: number;
  verifiedCount: number;
}

export interface WordJourneyData {
  word: {
    id: string;
    lemmaModern: string;
    lemmaTa: string;
    transliteration: string;
    pos: string;
  };
  overallConfidence: number;
  primaryChangeType: "spelling" | "meaning" | "usage";
  changeSummary: string;
  timeline: TimelineNode[];
  changes: Array<{
    id: string;
    fromPeriodId: string;
    toPeriodId: string;
    changeType: "spelling" | "meaning" | "usage";
    description: string;
    similarityScore: number;
  }>;
}

export interface EvidenceItem {
  id: string;
  periodId: string;
  periodName: string;
  periodNameTa: string;
  years: string;
  formText: string;
  verseText: string;
  translationEn: string;
  lineRef?: string;
  pageOrVerseNo?: string;
  verified: boolean;
  source: {
    id: string;
    title: string;
    titleTa: string;
    author?: string;
    century?: string;
    type: string;
  };
  citations: {
    apa: string;
    mla: string;
    chicago: string;
  };
}

export interface CompareData {
  wordId: string;
  wordTa: string;
  fromPeriod: { id: string; name: string; nameTa: string; years: string };
  toPeriod: { id: string; name: string; nameTa: string; years: string };
  spelling: {
    fromText: string;
    toText: string;
    distance: number;
    similarityScore: number;
    diff: Array<{
      type: "match" | "insert" | "delete" | "replace";
      oldChar?: string;
      newChar?: string;
      cost: number;
    }>;
    hasSpellingChange: boolean;
    descriptionTa: string;
    descriptionEn: string;
  };
  semantic: {
    fromMeaningEn: string;
    toMeaningEn: string;
    fromMeaningTa: string;
    toMeaningTa: string;
    similarityScore: number;
    driftScore: number;
    classification: string;
    classificationTa: string;
    classificationEn: string;
    explanationTa: string;
    explanationEn: string;
    sharedTokens: string[];
    divergentTokens: string[];
  };
  usage: {
    fromFrequency: number;
    toFrequency: number;
    frequencyDelta: number;
    classification: string;
    classificationTa: string;
    classificationEn: string;
    explanationTa: string;
    explanationEn: string;
    trajectory: Array<{ periodId: string; score: number }>;
  };
  overallSimilarity: number;
  primaryChangeType: "spelling" | "meaning" | "usage";
}

export interface InsightsData {
  mostChangedWords: Array<{ word: string; score: number; primaryChange: string; details: string }>;
  changeTypeDistribution: { spelling: number; meaning: number; usage: number; totalChanges: number };
  wordsPerPeriod: Array<{ periodId: string; name: string; nameTa: string; count: number }>;
  driftHeatmap: number[][];
  totalIndexedWords: number;
  indexedSources: number;
  periodsCovered: number;
}

export interface ContributionItem {
  id: string;
  wordText: string;
  periodId: string;
  changeType: "spelling" | "meaning" | "usage";
  sourceTitle: string;
  verseText: string;
  translationEn?: string;
  lineRef?: string;
  century?: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  createdAt: string;
}

export interface CollectionItem {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  items: Array<{
    id: string;
    wordId: string;
    wordTa: string;
    lemmaModern: string;
    notes?: string;
    addedAt: string;
  }>;
}

const API_BASE = "";

export async function apiSearch(params: {
  q?: string;
  period?: string;
  changeType?: string;
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<SearchResponse> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.period && params.period !== "all") sp.set("period", params.period);
  if (params.changeType && params.changeType !== "all") sp.set("changeType", params.changeType);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.sort) sp.set("sort", params.sort);

  const res = await fetch(`${API_BASE}/api/search?${sp.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Search failed");
  return json.data;
}

export async function apiGetJourney(wordId: string): Promise<WordJourneyData> {
  const res = await fetch(`${API_BASE}/api/words/${encodeURIComponent(wordId)}/journey`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load journey");
  return json.data;
}

export async function apiGetEvidence(wordId: string, periodId?: string): Promise<{ count: number; evidences: EvidenceItem[] }> {
  const sp = periodId ? `?period=${encodeURIComponent(periodId)}` : "";
  const res = await fetch(`${API_BASE}/api/words/${encodeURIComponent(wordId)}/evidence${sp}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load evidence");
  return json.data;
}

export async function apiCompare(word: string, from?: string, to?: string): Promise<CompareData> {
  const sp = new URLSearchParams({ word, from: from || "sangam", to: to || "modern" });
  const res = await fetch(`${API_BASE}/api/compare?${sp.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to compare");
  return json.data;
}

export async function apiGetInsights(): Promise<InsightsData> {
  const res = await fetch(`${API_BASE}/api/insights`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load insights");
  return json.data;
}

export async function apiGetCollections(): Promise<CollectionItem[]> {
  const res = await fetch(`${API_BASE}/api/collections`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load collections");
  return json.data;
}

export async function apiCreateCollection(name: string, description?: string): Promise<CollectionItem> {
  const res = await fetch(`${API_BASE}/api/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to create collection");
  return json.data;
}

export async function apiGetContributions(): Promise<ContributionItem[]> {
  const res = await fetch(`${API_BASE}/api/contributions`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to load contributions");
  return json.data;
}

export async function apiSubmitContribution(data: {
  wordText: string;
  periodId: string;
  changeType: "spelling" | "meaning" | "usage";
  sourceTitle: string;
  verseText: string;
  translationEn?: string;
  lineRef?: string;
  century?: string;
}): Promise<ContributionItem> {
  const res = await fetch(`${API_BASE}/api/contributions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to submit contribution");
  return json.data;
}

export async function apiReviewContribution(id: string, status: "approved" | "rejected", notes: string): Promise<ContributionItem> {
  const res = await fetch(`${API_BASE}/api/contributions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, notes }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to review contribution");
  return json.data;
}
