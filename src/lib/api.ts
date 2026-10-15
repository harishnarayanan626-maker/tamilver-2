/**
 * Sorkalam typed API client.
 * Fetch wrapper with JSON error handling, JWT in memory + localStorage,
 * and auto-redirect to sign-in on 401.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Auth token storage: memory + localStorage
// ---------------------------------------------------------------------------

const TOKEN_KEY = "sorkalam_token";
const USER_KEY = "sorkalam_user";

let memoryToken: string | null = null;
let storageBooted = false;

function bootStorage(): void {
  if (storageBooted) return;
  storageBooted = true;
  try {
    const t = window.localStorage.getItem(TOKEN_KEY);
    if (t) memoryToken = t;
  } catch {
    memoryToken = null;
  }
}

export function getToken(): string | null {
  bootStorage();
  return memoryToken;
}

export function setToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function clearAuth(): void {
  memoryToken = null;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
}

// 401 handling: app registers a redirect (view -> auth). Default dispatches event.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setOnUnauthorized(fn: UnauthorizedHandler | null): void {
  unauthorizedHandler = fn;
}

function handleUnauthorized(): void {
  clearAuth();
  if (unauthorizedHandler) {
    unauthorizedHandler();
  } else if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sorkalam:unauthorized"));
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

export interface FetchOptions extends Omit<RequestInit, "body"> {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

function buildUrl(path: string, query?: FetchOptions["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === "") continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { query, body, headers, ...rest } = opts;
  const token = getToken();
  const res = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

  // Empty / non-JSON (e.g. CSV export returns text via JSON envelope, but guard anyway)
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body (plain export content)
    if (!res.ok) throw new ApiError(res.status, "HTTP_ERROR", text.slice(0, 300));
    return text as unknown as T;
  }

  if (!res.ok) {
    const env = parsed as ApiFailure | null;
    const code = env && !env.success ? env.error.code : `HTTP_${res.status}`;
    const message = env && !env.success ? env.error.message : `Request failed (${res.status})`;
    const details = env && !env.success ? env.error.details : undefined;
    if (res.status === 401 && !path.startsWith("/api/auth")) handleUnauthorized();
    throw new ApiError(res.status, code, message, details);
  }

  const env = parsed as ApiEnvelope<T>;
  if (env && typeof env === "object" && "success" in env) {
    if (env.success) return (env as ApiSuccess<T>).data;
    const f = env as ApiFailure;
    if (f.error.code === "UNAUTHORIZED" && !path.startsWith("/api/auth")) handleUnauthorized();
    throw new ApiError(res.status, f.error.code, f.error.message, f.error.details);
  }
  return parsed as T;
}

// ---------------------------------------------------------------------------
// Domain types (mirror server/handlers + lib/seedData shapes)
// ---------------------------------------------------------------------------

export type ChangeType = "spelling" | "meaning" | "usage";
export type UserRole = "student" | "researcher" | "scholar" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution?: string;
}

export interface SearchResultItem {
  id: string;
  lemmaModern: string;
  lemmaTa: string;
  transliteration: string;
  pos: string;
  matchedForm: string;
  oldForm: string;
  modernForm: string;
  changeType: ChangeType;
  description: string;
  meaningSummary: string;
  evidenceCount: number;
  periods: string[];
  similarityScore: number;
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

export interface PeriodItem {
  id: string;
  name: string;
  nameTa: string;
  years: string;
  color: string;
}

export interface JourneyTimelineNode {
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

export interface JourneyResponse {
  word: { id: string; lemmaModern: string; lemmaTa: string; transliteration: string; pos: string };
  overallConfidence: number;
  primaryChangeType: ChangeType;
  changeSummary: string;
  timeline: JourneyTimelineNode[];
  changes: Array<{
    id: string;
    wordId: string;
    fromPeriodId: string;
    toPeriodId: string;
    changeType: ChangeType;
    description: string;
    similarityScore: number;
    details: Record<string, unknown>;
  }>;
}

export interface EvidenceCitation {
  apa: string;
  mla: string;
  chicago: string;
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
    author: string;
    periodId: string;
    century: string;
    type: string;
  };
  citations: EvidenceCitation;
}

export interface EvidenceResponse {
  word: { id: string; lemmaModern: string; lemmaTa: string; transliteration: string };
  count: number;
  evidences: EvidenceItem[];
}

export interface DiffToken {
  type: "match" | "insert" | "delete" | "replace";
  oldChar?: string;
  newChar?: string;
  position: number;
  cost: number;
  phoneticNote?: string;
}

export interface CompareResponse {
  wordId: string;
  wordTa: string;
  fromPeriod: { id: string; name: string; nameTa: string; years: string };
  toPeriod: { id: string; name: string; nameTa: string; years: string };
  spelling: {
    fromText: string;
    toText: string;
    oldGraphemes: string[];
    newGraphemes: string[];
    distance: number;
    similarityScore: number;
    diff: DiffToken[];
    hasSpellingChange: boolean;
    descriptionTa: string;
    descriptionEn: string;
    mutations: Array<{ from: string; to: string; type: string }>;
  };
  semantic: {
    fromMeaningEn: string;
    fromMeaningTa: string;
    toMeaningEn: string;
    toMeaningTa: string;
    similarityScore: number;
    driftScore: number;
    classification: "narrowing" | "broadening" | "shift" | "stable";
    classificationTa: string;
    classificationEn: string;
    explanationTa: string;
    explanationEn: string;
    sharedTokens: string[];
    divergentTokens: string[];
  };
  usage: {
    fromPeriod: string;
    toPeriod: string;
    fromFrequency: number;
    toFrequency: number;
    frequencyDelta: number;
    fromPos: string;
    toPos: string;
    posChanged: boolean;
    classification: string;
    classificationTa: string;
    classificationEn: string;
    explanationTa: string;
    explanationEn: string;
    trajectory: Array<{ periodId: string; score: number }>;
  };
  overallSimilarity: number;
  primaryChangeType: ChangeType;
}

// ---------------------------------------------------------------------------
// API surface (only endpoints that exist in /server)
// ---------------------------------------------------------------------------

export const api = {
  search(params: { q?: string; period?: string; changeType?: string; page?: number; limit?: number }) {
    return apiFetch<SearchResponse>("/api/search", { query: params as Record<string, string> });
  },
  periods() {
    return apiFetch<PeriodItem[]>("/api/periods");
  },
  sources() {
    return apiFetch<Array<{ id: string; title: string; titleTa: string }>>("/api/sources");
  },
  journey(id: string) {
    return apiFetch<JourneyResponse>(`/api/words/${encodeURIComponent(id)}/journey`);
  },
  evidence(id: string, period?: string) {
    return apiFetch<EvidenceResponse>(`/api/words/${encodeURIComponent(id)}/evidence`, {
      query: period ? { period } : undefined,
    });
  },
  changes(id: string) {
    return apiFetch<{ wordId: string; wordTa: string; changes: JourneyResponse["changes"] }>(
      `/api/words/${encodeURIComponent(id)}/changes`
    );
  },
  compare(word: string, from = "sangam", to = "modern") {
    return apiFetch<CompareResponse>("/api/compare", { query: { word, from, to } });
  },
  insights() {
    return apiFetch<{
      mostChangedWords: Array<{ word: string; score: number; primaryChange: string; details: string }>;
      changeTypeDistribution: { spelling: number; meaning: number; usage: number; totalChanges: number };
      wordsPerPeriod: Array<{ periodId: string; name: string; nameTa: string; count: number }>;
      driftHeatmap: number[][];
      totalIndexedWords: number;
      indexedSources: number;
      periodsCovered: number;
    }>("/api/insights");
  },
  login(email: string, password: string) {
    return apiFetch<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },
  register(input: { name: string; email: string; password: string; role?: UserRole; institution?: string }) {
    return apiFetch<{ token: string; user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: input,
    });
  },
  me() {
    return apiFetch<AuthUser>("/api/auth/me");
  },
};

// ---------------------------------------------------------------------------
// Client-side Tamil grapheme splitter (Intl.Segmenter, never splits base+vowel sign)
// ---------------------------------------------------------------------------

export function splitGraphemesClient(text: string): string[] {
  if (!text) return [];
  try {
    const IntlAny = Intl as unknown as Record<string, unknown>;
    const Seg = IntlAny["Segmenter"] as
      | (new (locale: string, opts?: { granularity: string }) => {
          segment(s: string): Iterable<{ segment: string }>;
        })
      | undefined;
    if (Seg) {
      const seg = new Seg("ta", { granularity: "grapheme" });
      return Array.from(seg.segment(text), (s: { segment: string }) => s.segment);
    }
  } catch {
    /* fall through */
  }
  return Array.from(text);
}
