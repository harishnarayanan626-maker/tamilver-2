/**
 * Tamil-aware Spelling Diff & Edit Distance
 * Operates on authentic Tamil grapheme clusters rather than raw UTF-16 bytes.
 * Implements a weighted Wagner-Fischer dynamic programming algorithm.
 */

import { splitTamilGraphemes, analyzeGrapheme } from "./graphemes";

export type DiffOperationType = "match" | "insert" | "delete" | "replace";

export interface GraphemeDiffToken {
  type: DiffOperationType;
  oldChar?: string;
  newChar?: string;
  position: number;
  cost: number;
  phoneticNote?: string;
}

export interface SpellingChangeResult {
  fromText: string;
  toText: string;
  oldGraphemes: string[];
  newGraphemes: string[];
  distance: number;
  similarityScore: number; // 0.0000 to 1.0000
  diff: GraphemeDiffToken[];
  hasSpellingChange: boolean;
  descriptionTa: string;
  descriptionEn: string;
  mutations: Array<{ from: string; to: string; type: string }>;
}

/**
 * Computes substitution cost between two Tamil graphemes.
 * If both share the same base consonant and only the vowel sign differs,
 * cost is reduced to 0.5 (partial phonetic mutation).
 */
function getSubstitutionCost(a: string, b: string): number {
  if (a === b) return 0;
  const analysisA = analyzeGrapheme(a);
  const analysisB = analyzeGrapheme(b);

  if (analysisA.baseConsonant && analysisB.baseConsonant && analysisA.baseConsonant === analysisB.baseConsonant) {
    return 0.5; // Same consonant, different vowel matra
  }

  // Classic historical glide elision (e.g. யா -> ஆ or ய -> அ)
  if ((a === "யா" && b === "ஆ") || (a === "ய" && b === "அ")) {
    return 0.75;
  }

  return 1.0;
}

/**
 * Computes the Tamil-aware grapheme level edit distance and letter-by-letter diff.
 */
export function computeTamilSpellingDiff(fromText: string, toText: string): SpellingChangeResult {
  const oldGraphemes = splitTamilGraphemes(fromText.trim());
  const newGraphemes = splitTamilGraphemes(toText.trim());

  const m = oldGraphemes.length;
  const n = newGraphemes.length;

  if (m === 0 && n === 0) {
    return {
      fromText,
      toText,
      oldGraphemes: [],
      newGraphemes: [],
      distance: 0,
      similarityScore: 1.0,
      diff: [],
      hasSpellingChange: false,
      descriptionTa: "எழுத்து மாற்றம் இல்லை",
      descriptionEn: "No spelling change detected",
      mutations: [],
    };
  }

  // DP table for distances
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = getSubstitutionCost(oldGraphemes[i - 1], newGraphemes[j - 1]);
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // match / replace
      );
    }
  }

  const rawDistance = dp[m][n];
  const maxLen = Math.max(m, n);
  const similarityScore = Math.max(0, Math.min(1, Number((1 - rawDistance / maxLen).toFixed(4))));

  // Backtrack to extract the optimal alignment diff
  let i = m;
  let j = n;
  const reversedDiff: GraphemeDiffToken[] = [];
  const mutations: Array<{ from: string; to: string; type: string }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const cost = getSubstitutionCost(oldGraphemes[i - 1], newGraphemes[j - 1]);
      if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + cost)) < 0.001) {
        if (cost === 0) {
          reversedDiff.push({
            type: "match",
            oldChar: oldGraphemes[i - 1],
            newChar: newGraphemes[j - 1],
            position: i - 1,
            cost: 0,
          });
        } else {
          reversedDiff.push({
            type: "replace",
            oldChar: oldGraphemes[i - 1],
            newChar: newGraphemes[j - 1],
            position: i - 1,
            cost,
            phoneticNote: `${oldGraphemes[i - 1]} → ${newGraphemes[j - 1]}`,
          });
          mutations.push({
            from: oldGraphemes[i - 1],
            to: newGraphemes[j - 1],
            type: "replace",
          });
        }
        i--;
        j--;
        continue;
      }
    }

    if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + 1)) < 0.001) {
      reversedDiff.push({
        type: "delete",
        oldChar: oldGraphemes[i - 1],
        position: i - 1,
        cost: 1,
      });
      mutations.push({
        from: oldGraphemes[i - 1],
        to: "",
        type: "delete",
      });
      i--;
    } else {
      reversedDiff.push({
        type: "insert",
        newChar: newGraphemes[j - 1],
        position: j - 1,
        cost: 1,
      });
      mutations.push({
        from: "",
        to: newGraphemes[j - 1],
        type: "insert",
      });
      j--;
    }
  }

  const diff = reversedDiff.reverse();
  const hasSpellingChange = rawDistance > 0;

  // Generate descriptive commentary
  let descriptionTa = "எழுத்தமைப்பில் மாற்றமில்லை";
  let descriptionEn = "Orthographic structure preserved";

  if (hasSpellingChange) {
    const changesList = mutations
      .map((m) => (m.type === "replace" ? `'${m.from}' → '${m.to}'` : m.type === "delete" ? `'${m.from}' நீக்கம்` : `'${m.to}' சேர்க்கை`))
      .join(", ");
    descriptionTa = `எழுத்து மாற்றம் (${changesList}): சொல் வடிவம் சீரமைக்கப்பட்டுள்ளது.`;
    descriptionEn = `Spelling mutation (${changesList}): Graphemic alignment shift observed.`;

    // Special linguistic rules
    if (fromText === "யாண்டு" && toText === "ஆண்டு") {
      descriptionTa = "தொடக்க ஒலி சுருக்கம்: பழந்தமிழில் காணப்பட்ட 'யா' காலப்போக்கில் 'ஆ' எனத் திரிந்தது (Glide elision /yā/ → /ā/).";
      descriptionEn = "Phonological simplification: Initial glide elision where Old Tamil /yā/ merged into Modern /ā/.";
    }
  }

  return {
    fromText,
    toText,
    oldGraphemes,
    newGraphemes,
    distance: rawDistance,
    similarityScore,
    diff,
    hasSpellingChange,
    descriptionTa,
    descriptionEn,
    mutations,
  };
}
