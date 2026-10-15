/**
 * Sorkalam Change Detection Engine Orchestrator
 * Comprehensive multi-dimensional linguistic analyzer combining:
 * 1. Grapheme-level orthographic mutation (Tamil edit distance + letter diffs)
 * 2. Semantic drift vector evaluation (Sentence embeddings + narrowing/broadening/shift)
 * 3. Usage frequency & morphosyntactic evolution
 */

import { computeTamilSpellingDiff, type SpellingChangeResult } from "./spellingDiff";
import { computeSemanticDrift, type SemanticChangeResult } from "./semanticDrift";
import { computeUsageChange, type UsageChangeResult } from "./usageShift";
import { splitTamilGraphemes, analyzeGrapheme } from "./graphemes";

export * from "./graphemes";
export * from "./spellingDiff";
export * from "./semanticDrift";
export * from "./usageShift";

export interface WordEvolutionReport {
  wordId: string;
  wordTa: string;
  fromPeriod: { id: string; name: string; nameTa: string; years: string };
  toPeriod: { id: string; name: string; nameTa: string; years: string };
  spelling: SpellingChangeResult;
  semantic: SemanticChangeResult;
  usage: UsageChangeResult;
  overallSimilarity: number;
  primaryChangeType: "spelling" | "meaning" | "usage";
}

/**
 * Runs the complete change engine pipeline comparing two historical points of a word.
 */
export async function compareWordAcrossEras(params: {
  wordId: string;
  wordTa: string;
  fromPeriod: { id: string; name: string; nameTa: string; years: string };
  toPeriod: { id: string; name: string; nameTa: string; years: string };
  fromForm: string;
  toForm: string;
  fromMeaningEn: string;
  fromMeaningTa: string;
  toMeaningEn: string;
  toMeaningTa: string;
  fromFrequency: number;
  toFrequency: number;
  fromPos?: string;
  toPos?: string;
  allFrequencies?: Array<{ periodId: string; score: number }>;
}): Promise<WordEvolutionReport> {
  const spelling = computeTamilSpellingDiff(params.fromForm, params.toForm);
  const semantic = await computeSemanticDrift(
    params.wordTa,
    params.fromMeaningEn,
    params.fromMeaningTa,
    params.toMeaningEn,
    params.toMeaningTa
  );
  const usage = computeUsageChange(
    params.fromPeriod,
    params.toPeriod,
    params.fromFrequency,
    params.toFrequency,
    params.fromPos || "noun",
    params.toPos || "noun",
    params.allFrequencies
  );

  // Overall combined linguistic similarity score (weighted average: spelling 40%, meaning 40%, usage 20%)
  const overallSimilarity = Number(
    (
      spelling.similarityScore * 0.4 +
      semantic.similarityScore * 0.4 +
      Math.max(0, 1 - Math.abs(usage.frequencyDelta) / 100) * 0.2
    ).toFixed(4)
  );

  // Determine primary prominent change type
  let primaryChangeType: "spelling" | "meaning" | "usage" = "meaning";
  if (spelling.hasSpellingChange && spelling.similarityScore < 0.8) {
    primaryChangeType = "spelling";
  } else if (semantic.driftScore >= 0.25) {
    primaryChangeType = "meaning";
  } else if (Math.abs(usage.frequencyDelta) >= 15 || usage.posChanged) {
    primaryChangeType = "usage";
  }

  return {
    wordId: params.wordId,
    wordTa: params.wordTa,
    fromPeriod: params.fromPeriod,
    toPeriod: params.toPeriod,
    spelling,
    semantic,
    usage,
    overallSimilarity,
    primaryChangeType,
  };
}
