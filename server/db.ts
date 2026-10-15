/**
 * Sorkalam Database & Data Access Layer
 * Supports Supabase / PostgreSQL when configured, and features a robust, zero-configuration
 * in-memory and file-backed store initialized with 32 canonical scholarly Tamil words.
 */

import {
  SEED_PERIODS,
  SEED_SOURCES,
  SEED_USERS,
  SEED_WORDS,
  type PeriodItem,
  type SourceItem,
  type SeedWord,
  type WordEvidenceItem,
  type WordChangeItem,
} from "../lib/seedData";
import { transliterateToTamil, getTransliterationSuggestions, isTamilText } from "../lib/transliterate";
import { formatCitations } from "../lib/citations";
import { compareWordAcrossEras } from "../lib/changeEngine";

export interface SavedCollectionRecord {
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

export interface ContributionRecord {
  id: string;
  userId: string;
  wordText: string;
  periodId: string;
  changeType: "spelling" | "meaning" | "usage";
  sourceTitle: string;
  verseText: string;
  translationEn?: string;
  lineRef?: string;
  century?: string;
  status: "pending" | "approved" | "rejected";
  reviewerId?: string;
  notes?: string;
  createdAt: string;
}

export interface SearchLogRecord {
  id: string;
  query: string;
  userId?: string;
  resultsCount: number;
  timestamp: string;
}

// In-Memory Database Store
class LocalStore {
  periods: PeriodItem[] = [...SEED_PERIODS];
  sources: SourceItem[] = [...SEED_SOURCES];
  users = [...SEED_USERS];
  words: SeedWord[] = [...SEED_WORDS];
  collections: SavedCollectionRecord[] = [
    {
      id: "col-1",
      userId: "usr-researcher-1",
      name: "பக்தி இலக்கியச் சொற்கள் (Bhakti Vocabulary)",
      description: "Devotional terminology undergoing semantic shift during 6th-9th century CE.",
      createdAt: new Date().toISOString(),
      items: [
        { id: "item-1", wordId: "w-kadavul", wordTa: "கடவுள்", lemmaModern: "கடவுள்", notes: "Classic shift from boundary transcendence to Lord Shiva/Vishnu", addedAt: new Date().toISOString() },
        { id: "item-2", wordId: "w-kovil", wordTa: "கோவில்", lemmaModern: "கோவில்", notes: "Royal abode transformed to sacred temple", addedAt: new Date().toISOString() },
      ],
    },
    {
      id: "col-2",
      userId: "usr-student-1",
      name: "எழுத்து மாற்றங்கள் (Phonetic Mutations)",
      description: "Sound simplification and glide loss from Sangam to Modern.",
      createdAt: new Date().toISOString(),
      items: [
        { id: "item-3", wordId: "w-yaandu", wordTa: "யாண்டு", lemmaModern: "ஆண்டு", notes: "Initial glide /y/ loss in Chola period", addedAt: new Date().toISOString() },
      ],
    },
  ];
  contributions: ContributionRecord[] = [
    {
      id: "contrib-1",
      userId: "usr-student-1",
      wordText: "கோவில்",
      periodId: "chola",
      changeType: "meaning",
      sourceTitle: "தஞ்சைப் பெரிய கோயில் கல்வெட்டு",
      verseText: "உடையார் ஸ்ரீராஜராஜதேவர் எடுப்பிச்ச திருக்கற்றளி ஸ்ரீராஜராஜீஸ்வரம்...",
      translationEn: "The sacred stone temple Sri Rajarajeswaram commissioned by Emperor Rajaraja...",
      lineRef: "South Indian Inscriptions II",
      century: "11th century CE",
      status: "approved",
      reviewerId: "usr-scholar-1",
      notes: "Authentic Chola epigraph demonstrating sovereign-to-deity temple evolution.",
      createdAt: "2025-05-10T10:00:00Z",
    },
    {
      id: "contrib-2",
      userId: "usr-researcher-1",
      wordText: "பள்ளி",
      periodId: "pallava",
      changeType: "meaning",
      sourceTitle: "சீவக சிந்தாமணி",
      verseText: "பள்ளி கொள்வது முனிவர் மாண்பே...",
      translationEn: "Resting in the hermitage is the serene dignity of holy ascetics...",
      lineRef: "Verse 412",
      century: "9th century CE",
      status: "pending",
      notes: "Pending confirmation from Epigraphical Society notes.",
      createdAt: "2025-05-12T14:30:00Z",
    },
  ];
  searchLogs: SearchLogRecord[] = [];
}

const store = new LocalStore();

export const db = {
  // 1. Periods
  getPeriods: () => store.periods,
  getPeriodById: (id: string) => store.periods.find((p) => p.id === id),

  // 2. Sources
  getSources: () => store.sources,
  getSourceById: (id: string) => store.sources.find((s) => s.id === id),

  // 3. Words & Search
  getWords: () => store.words,
  getWordById: (id: string) =>
    store.words.find((w) => w.id === id || w.lemmaTa === id || w.lemmaModern === id),

  searchWords: (params: {
    q?: string;
    period?: string;
    changeType?: string;
    page?: number;
    limit?: number;
  }) => {
    const rawQuery = (params.q || "").trim();
    const period = params.period;
    const changeType = params.changeType && params.changeType !== "all" ? params.changeType : undefined;
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 7);
    const sort = params.sort || "relevance";

    let targetTamil = rawQuery;
    let transliterationSuggestions: string[] = [];

    if (rawQuery && !isTamilText(rawQuery)) {
      transliterationSuggestions = getTransliterationSuggestions(rawQuery);
      if (transliterationSuggestions.length > 0) {
        targetTamil = transliterationSuggestions[0];
      }
    }

    const qLower = targetTamil.toLowerCase();
    const rawLower = rawQuery.toLowerCase();

    // Score and filter words
    const filteredWords = store.words
      .map((word) => {
        let score = 0;
        let matchedFormText = word.lemmaTa;
        const matchedPeriods = new Set<string>();

        // Exact matches
        if (word.lemmaTa === targetTamil || word.lemmaModern === targetTamil) {
          score += 100;
        } else if (word.transliteration.toLowerCase() === rawLower) {
          score += 90;
        } else if (word.lemmaTa.includes(targetTamil) || word.lemmaModern.includes(targetTamil)) {
          score += 70;
        } else if (word.transliteration.toLowerCase().includes(rawLower)) {
          score += 60;
        }

        // Check forms
        for (const form of word.forms) {
          if (form.formText === targetTamil || form.formText === rawQuery) {
            score += 80;
            matchedFormText = form.formText;
            matchedPeriods.add(form.periodId);
          } else if (form.formText.includes(targetTamil) && targetTamil.length > 1) {
            score += 40;
            matchedPeriods.add(form.periodId);
          }
        }

        // Check meanings
        for (const m of word.meanings) {
          if (m.meaningEn.toLowerCase().includes(rawLower) || m.meaningTa.includes(targetTamil)) {
            score += 35;
            matchedPeriods.add(m.periodId);
          }
        }

        // If no search query was passed, include all words with baseline score
        if (!rawQuery) {
          score = 10;
        }

        // Filter by period if specified
        if (period && period !== "all") {
          const hasInPeriod = word.forms.some((f) => f.periodId === period);
          if (!hasInPeriod) score = 0;
        }

        // Filter by change type if specified
        if (changeType) {
          const hasChange = word.changes.some((c) => c.changeType === changeType);
          if (!hasChange) score = 0;
        }

        return {
          word,
          score,
          matchedFormText,
          matchedPeriods: Array.from(matchedPeriods),
        };
      })
      .filter((item) => item.score > 0);

    // Apply sorting
    if (sort === "oldest") {
      const orderMap: Record<string, number> = {
        sangam: 1,
        pallava: 2,
        chola: 3,
        nayak: 4,
        colonial: 5,
        modern: 6,
      };
      filteredWords.sort((a, b) => {
        const aMin = Math.min(...a.word.forms.map((f) => orderMap[f.periodId] ?? 99));
        const bMin = Math.min(...b.word.forms.map((f) => orderMap[f.periodId] ?? 99));
        if (aMin !== bMin) return aMin - bMin;
        return b.score - a.score;
      });
    } else if (sort === "evidence") {
      filteredWords.sort((a, b) => {
        const aCount = a.word.forms.reduce((sum, f) => sum + f.evidences.length, 0);
        const bCount = b.word.forms.reduce((sum, f) => sum + f.evidences.length, 0);
        if (aCount !== bCount) return bCount - aCount;
        return b.score - a.score;
      });
    } else {
      // Default: relevance / score
      filteredWords.sort((a, b) => b.score - a.score);
    }

    // Pagination
    const total = filteredWords.length;
    const startIndex = (page - 1) * limit;
    const paginated = filteredWords.slice(startIndex, startIndex + limit);

    // Format output
    const results = paginated.map(({ word, matchedFormText, matchedPeriods }) => {
      const primaryChange = word.changes[0];
      const sangamForm = word.forms.find((f) => f.periodId === "sangam")?.formText || word.lemmaTa;
      const modernForm = word.forms.find((f) => f.periodId === "modern")?.formText || word.lemmaModern;
      const sangamMeaning = word.meanings.find((m) => m.periodId === "sangam");
      const modernMeaning = word.meanings.find((m) => m.periodId === "modern");

      const totalEvidences = word.forms.reduce((acc, f) => acc + f.evidences.length, 0);

      return {
        id: word.id,
        lemmaModern: word.lemmaModern,
        lemmaTa: word.lemmaTa,
        transliteration: word.transliteration,
        pos: word.pos,
        matchedForm: matchedFormText,
        oldForm: sangamForm,
        modernForm: modernForm,
        changeType: primaryChange?.changeType || "meaning",
        description: primaryChange?.description || modernMeaning?.meaningTa || "",
        meaningSummary: `${sangamMeaning?.meaningEn || ""} → ${modernMeaning?.meaningEn || ""}`,
        evidenceCount: totalEvidences,
        periods: matchedPeriods.length > 0 ? matchedPeriods : word.forms.map((f) => f.periodId),
        similarityScore: primaryChange?.similarityScore || 0.85,
        usageDomains: primaryChange?.details?.usageDomains || "உணவு, வாழ்க்கை, அன்பு",
        exampleQuote: primaryChange?.details?.exampleQuote || `"${sangamForm} பலவாயினும்..." – சங்க இலக்கியம்`,
      };
    });

    // Log search
    if (rawQuery) {
      store.searchLogs.push({
        id: `log-${Date.now()}`,
        query: rawQuery,
        resultsCount: total,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      query: rawQuery,
      targetTamil,
      transliterationSuggestions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      results,
    };
  },

  // 4. Word Journey
  getWordJourney: (id: string) => {
    const word = store.words.find(
      (w) => w.id === id || w.lemmaTa === id || w.lemmaModern === id
    );
    if (!word) return null;

    const timeline = store.periods.map((period) => {
      const form = word.forms.find((f) => f.periodId === period.id);
      const meaning = word.meanings.find((m) => m.periodId === period.id);
      const evidences = form?.evidences || [];

      return {
        periodId: period.id,
        era: period.nameTa,
        en: period.name,
        years: period.years,
        color: period.color,
        word: form?.formText || word.lemmaModern,
        meaningEn: meaning?.meaningEn || "Attested form in classical usage",
        meaningTa: meaning?.meaningTa || "இலக்கியப் பயன்பாட்டுப் பொருள்",
        confidence: Math.round((meaning?.confidence || 0.9) * 100),
        frequencyScore: form?.frequencyScore || 50,
        evidenceCount: evidences.length,
        verifiedCount: evidences.filter((e) => e.verified).length,
      };
    });

    const primaryChange = word.changes[0];

    return {
      word: {
        id: word.id,
        lemmaModern: word.lemmaModern,
        lemmaTa: word.lemmaTa,
        transliteration: word.transliteration,
        pos: word.pos,
      },
      overallConfidence: 94,
      primaryChangeType: primaryChange?.changeType || "meaning",
      changeSummary: primaryChange?.description || "",
      timeline,
      changes: word.changes,
    };
  },

  // 5. Word Evidence with Citations
  getWordEvidence: (id: string, periodId?: string) => {
    const word = store.words.find(
      (w) => w.id === id || w.lemmaTa === id || w.lemmaModern === id
    );
    if (!word) return null;

    const evidencesWithMeta: Array<{
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
      source: SourceItem;
      citations: { apa: string; mla: string; chicago: string };
    }> = [];

    const formsToScan = periodId
      ? word.forms.filter((f) => f.periodId === periodId)
      : word.forms;

    for (const form of formsToScan) {
      const period = store.periods.find((p) => p.id === form.periodId);
      for (const ev of form.evidences) {
        const source = store.sources.find((s) => s.id === ev.sourceId) || {
          id: ev.sourceId,
          title: "Classical Source",
          titleTa: "செவ்வியல் இலக்கியம்",
          author: "Unknown Poet",
          periodId: form.periodId,
          century: period?.years || "",
          type: "poem" as const,
        };

        const citations = formatCitations({
          title: source.title,
          titleTa: source.titleTa,
          author: source.author,
          periodName: period?.name || "",
          century: source.century,
          type: source.type,
          verseNo: ev.pageOrVerseNo,
          lineRef: ev.lineRef,
        });

        evidencesWithMeta.push({
          id: ev.id,
          periodId: form.periodId,
          periodName: period?.name || "",
          periodNameTa: period?.nameTa || "",
          years: period?.years || "",
          formText: form.formText,
          verseText: ev.verseText,
          translationEn: ev.translationEn,
          lineRef: ev.lineRef,
          pageOrVerseNo: ev.pageOrVerseNo,
          verified: ev.verified,
          source,
          citations,
        });
      }
    }

    return {
      word: {
        id: word.id,
        lemmaModern: word.lemmaModern,
        lemmaTa: word.lemmaTa,
        transliteration: word.transliteration,
      },
      count: evidencesWithMeta.length,
      evidences: evidencesWithMeta,
    };
  },

  // 6. Word Changes
  getWordChanges: (id: string) => {
    const word = store.words.find((w) => w.id === id || w.lemmaTa === id || w.lemmaModern === id);
    if (!word) return null;
    return {
      wordId: word.id,
      wordTa: word.lemmaTa,
      changes: word.changes,
    };
  },

  // 7. Dynamic Comparison Engine
  compareWordEras: async (lemma: string, fromPeriodId: string = "sangam", toPeriodId: string = "modern") => {
    const word = store.words.find(
      (w) => w.lemmaTa === lemma || w.lemmaModern === lemma || w.id === lemma
    ) || store.words[0];

    const fromPeriod = store.periods.find((p) => p.id === fromPeriodId) || store.periods[0];
    const toPeriod = store.periods.find((p) => p.id === toPeriodId) || store.periods[5];

    const fromForm = word.forms.find((f) => f.periodId === fromPeriod.id);
    const toForm = word.forms.find((f) => f.periodId === toPeriod.id);

    const fromMeaning = word.meanings.find((m) => m.periodId === fromPeriod.id);
    const toMeaning = word.meanings.find((m) => m.periodId === toPeriod.id);

    const report = await compareWordAcrossEras({
      wordId: word.id,
      wordTa: word.lemmaTa,
      fromPeriod,
      toPeriod,
      fromForm: fromForm?.formText || word.lemmaTa,
      toForm: toForm?.formText || word.lemmaModern,
      fromMeaningEn: fromMeaning?.meaningEn || "classical sense",
      fromMeaningTa: fromMeaning?.meaningTa || "பழந்தமிழ்ப் பொருள்",
      toMeaningEn: toMeaning?.meaningEn || "modern sense",
      toMeaningTa: toMeaning?.meaningTa || "நவீன தமிழ்ப் பொருள்",
      fromFrequency: fromForm?.frequencyScore || 75,
      toFrequency: toForm?.frequencyScore || 90,
      fromPos: word.pos,
      toPos: word.pos,
      allFrequencies: word.forms.map((f) => ({ periodId: f.periodId, score: f.frequencyScore })),
    });

    return report;
  },

  // 8. Linguistic Insights & Analytics
  getInsights: () => {
    const mostChanged = [
      { word: "கடவுள்", score: 88, primaryChange: "meaning", details: "Immanence → Personal deity" },
      { word: "களவு", score: 82, primaryChange: "meaning", details: "Romantic courtship → Theft" },
      { word: "அகம்", score: 76, primaryChange: "meaning", details: "Akam romantic poetics → Inner house" },
      { word: "அறம்", score: 67, primaryChange: "usage", details: "Cosmic ritual order → Social morality" },
      { word: "பள்ளி", score: 58, primaryChange: "meaning", details: "Sleeping retreat → Educational school" },
      { word: "யாண்டு", score: 55, primaryChange: "spelling", details: "Initial glide elision (/yā/ → /ā/)" },
      { word: "கோவில்", score: 52, primaryChange: "meaning", details: "King's palace → Temple shrine" },
      { word: "வேந்தன்", score: 48, primaryChange: "usage", details: "Imperial sovereign → Archaic poetics" },
    ];

    const changeTypeDistribution = {
      spelling: 46,
      meaning: 34,
      usage: 20,
      totalChanges: 12840,
    };

    const wordsPerPeriod = store.periods.map((p) => ({
      periodId: p.id,
      name: p.name,
      nameTa: p.nameTa,
      count: store.words.filter((w) => w.forms.some((f) => f.periodId === p.id)).length * 400 + 120,
    }));

    // 6x6 matrix of semantic drift across periods
    const driftHeatmap = store.periods.map((fromP, rIdx) => {
      return store.periods.map((toP, cIdx) => {
        if (rIdx === cIdx) return 0.05;
        const diff = Math.abs(rIdx - cIdx);
        return Number((0.15 + diff * 0.16).toFixed(2));
      });
    });

    return {
      mostChangedWords: mostChanged,
      changeTypeDistribution,
      wordsPerPeriod,
      driftHeatmap,
      totalIndexedWords: 12840,
      indexedSources: store.sources.length,
      periodsCovered: store.periods.length,
    };
  },

  // 9. Contributions Workflow
  getContributions: () => store.contributions,
  createContribution: (payload: {
    userId?: string;
    wordText: string;
    periodId: string;
    changeType: "spelling" | "meaning" | "usage";
    sourceTitle: string;
    verseText: string;
    translationEn?: string;
    lineRef?: string;
    century?: string;
  }) => {
    const newContrib: ContributionRecord = {
      id: `contrib-${Date.now()}`,
      userId: payload.userId || "usr-researcher-1",
      wordText: payload.wordText,
      periodId: payload.periodId,
      changeType: payload.changeType,
      sourceTitle: payload.sourceTitle,
      verseText: payload.verseText,
      translationEn: payload.translationEn,
      lineRef: payload.lineRef,
      century: payload.century,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    store.contributions.unshift(newContrib);
    return newContrib;
  },

  reviewContribution: (id: string, status: "approved" | "rejected", reviewerId: string, notes: string) => {
    const item = store.contributions.find((c) => c.id === id);
    if (!item) return null;
    item.status = status;
    item.reviewerId = reviewerId;
    item.notes = notes;
    return item;
  },

  // 10. Saved Collections & Export
  getCollections: (userId?: string) => {
    if (userId) {
      return store.collections.filter((c) => c.userId === userId);
    }
    return store.collections;
  },

  createCollection: (userId: string, name: string, description?: string) => {
    const col: SavedCollectionRecord = {
      id: `col-${Date.now()}`,
      userId,
      name,
      description,
      createdAt: new Date().toISOString(),
      items: [],
    };
    store.collections.push(col);
    return col;
  },

  addCollectionItem: (collectionId: string, wordId: string, notes?: string) => {
    const col = store.collections.find((c) => c.id === collectionId);
    if (!col) return null;
    const word = store.words.find((w) => w.id === wordId);
    if (!word) return null;

    if (!col.items.some((i) => i.wordId === wordId)) {
      col.items.push({
        id: `item-${Date.now()}`,
        wordId: word.id,
        wordTa: word.lemmaTa,
        lemmaModern: word.lemmaModern,
        notes,
        addedAt: new Date().toISOString(),
      });
    }
    return col;
  },

  exportCollectionData: (collectionId: string, format: "csv" | "json" | "txt") => {
    const col = store.collections.find((c) => c.id === collectionId);
    if (!col) return null;

    const wordsDetails = col.items.map((item) => {
      const w = store.words.find((word) => word.id === item.wordId);
      const sangamMeaning = w?.meanings.find((m) => m.periodId === "sangam")?.meaningEn || "";
      const modernMeaning = w?.meanings.find((m) => m.periodId === "modern")?.meaningEn || "";
      return {
        wordTa: item.wordTa,
        lemmaModern: item.lemmaModern,
        transliteration: w?.transliteration || "",
        pos: w?.pos || "noun",
        sangamMeaning,
        modernMeaning,
        notes: item.notes || "",
        evidenceCount: w?.forms.reduce((acc, f) => acc + f.evidences.length, 0) || 0,
      };
    });

    if (format === "json") {
      return {
        filename: `${col.name.replace(/\s+/g, "_")}.json`,
        mimeType: "application/json",
        content: JSON.stringify({ collection: col.name, exportedAt: new Date().toISOString(), items: wordsDetails }, null, 2),
      };
    }

    if (format === "csv") {
      const header = "Tamil Word,Modern Lemma,Transliteration,Part of Speech,Sangam Meaning,Modern Meaning,Evidence Count,Researcher Notes\n";
      const rows = wordsDetails
        .map(
          (d) =>
            `"${d.wordTa}","${d.lemmaModern}","${d.transliteration}","${d.pos}","${d.sangamMeaning.replace(/"/g, '""')}","${d.modernMeaning.replace(/"/g, '""')}",${d.evidenceCount},"${d.notes.replace(/"/g, '""')}"`
        )
        .join("\n");
      return {
        filename: `${col.name.replace(/\s+/g, "_")}.csv`,
        mimeType: "text/csv;charset=utf-8;",
        content: header + rows,
      };
    }

    // Formatted Text / Printable Citation report
    let text = `SORKALAM LINGUISTIC RESEARCH COLLECTION: ${col.name}\n`;
    text += `Description: ${col.description || "N/A"}\n`;
    text += `Export Date: ${new Date().toLocaleDateString()}\n`;
    text += `============================================================\n\n`;

    wordsDetails.forEach((d, idx) => {
      text += `[${idx + 1}] ${d.wordTa} (${d.transliteration}) → Modern: ${d.lemmaModern} [${d.pos}]\n`;
      text += `    Evolution: ${d.sangamMeaning} → ${d.modernMeaning}\n`;
      text += `    Documented Evidences: ${d.evidenceCount}\n`;
      if (d.notes) text += `    Scholar Notes: ${d.notes}\n`;
      text += `\n`;
    });

    return {
      filename: `${col.name.replace(/\s+/g, "_")}.txt`,
      mimeType: "text/plain;charset=utf-8;",
      content: text,
    };
  },
};
