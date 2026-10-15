/**
 * Tamil Grapheme Segmentation Engine
 * Accurately extracts and categorizes Tamil grapheme clusters according to Tamil phonology:
 * - Uyir (உயிர் - independent vowels: அ to ஔ)
 * - Mei (மெய் - pure consonants with pulli: க், ங், ச்...)
 * - Uyirmei (உயிர்மெய் - consonant + vowel sign: க, கா, கி, கீ...)
 * - Aytham (ஆய்தம்: ஃ)
 * - Grantha syllables (ஜ, ஷ, ஸ, ஹ, க்ஷ, ஸ்ரீ)
 */

export type TamilGraphemeType = "uyir" | "mei" | "uyirmei" | "aytham" | "grantha" | "other";

export interface TamilGrapheme {
  text: string;
  type: TamilGraphemeType;
  baseConsonant?: string;
  vowelSign?: string;
}

// Unicode code points for Tamil dependent vowel signs and pulli
const PULLI = "\u0BCD"; // ்
const AYTHAM = "\u0B83"; // ஃ
const VOWEL_SIGNS_REGEX = /[\u0BBE-\u0BCC\u0BD7]/; // ா ி ீ ு ூ ெ ே ை ொ ோ ௌ ௗ
const TAMIL_INDEPENDENT_VOWELS = new Set([
  "அ", "ஆ", "இ", "ஈ", "உ", "ஊ", "எ", "ஏ", "ஐ", "ஒ", "ஓ", "ஔ",
]);
const GRANTHA_BASES = new Set(["ஜ", "ஷ", "ஸ", "ஹ", "க்ஷ", "ஶ்ரீ", "ஸ்ரீ"]);

let segmenterInstance: Intl.Segmenter | null = null;

function getSegmenter(): Intl.Segmenter {
  if (!segmenterInstance) {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      segmenterInstance = new Intl.Segmenter("ta", { granularity: "grapheme" });
    }
  }
  return segmenterInstance!;
}

/**
 * Splits a Tamil string into authentic grapheme clusters.
 * Handles Tamil phonology accurately: pure consonants with pulli (மெய்),
 * compound syllables (உயிர்மெய்), independent vowels (உயிர்), and aytham (ஆய்தம்).
 */
export function splitTamilGraphemes(text: string): string[] {
  if (!text) return [];

  // Authentic Tamil phonological regex:
  // 1. Aytham: \u0B83
  // 2. Consonant + Pulli: [\u0B95-\u0BB9\u0BB6\u0BB7\u0BB8\u0BB9]\u0BCD (pure mei)
  // 3. Consonant + Vowel Signs: [\u0B95-\u0BB9\u0BB6\u0BB7\u0BB8\u0BB9][\u0BBE-\u0BCC\u0BD7]+ (uyirmei)
  // 4. Consonant base alone: [\u0B95-\u0BB9\u0BB6\u0BB7\u0BB8\u0BB9] (inherent 'a')
  // 5. Independent Vowels: [\u0B85-\u0B94]
  // 6. Grantha compounds (க்ஷ, ஸ்ரீ): க்ஷ|ஶ்ரீ|ஸ்ரீ
  // 7. Any other Unicode character
  const TAMIL_GRAPHEME_REGEX =
    /[\u0B83]|(?:க்ஷ|ஶ்ரீ|ஸ்ரீ)(?:\u0BCD|[\u0BBE-\u0BCC\u0BD7]+)?|[\u0B95-\u0BB9\u0BB6-\u0BB9]\u0BCD|[\u0B95-\u0BB9\u0BB6-\u0BB9][\u0BBE-\u0BCC\u0BD7]+|[\u0B95-\u0BB9\u0BB6-\u0BB9]|[\u0B85-\u0B94]|[\s\S]/gu;

  const matches = text.match(TAMIL_GRAPHEME_REGEX);
  return matches || [];
}

/**
 * Analyzes an individual Tamil grapheme cluster to determine its linguistic properties.
 */
export function analyzeGrapheme(grapheme: string): TamilGrapheme {
  if (!grapheme) {
    return { text: "", type: "other" };
  }

  if (grapheme === AYTHAM) {
    return { text: grapheme, type: "aytham" };
  }

  if (TAMIL_INDEPENDENT_VOWELS.has(grapheme)) {
    return { text: grapheme, type: "uyir" };
  }

  if (grapheme.endsWith(PULLI)) {
    const base = grapheme.slice(0, -1);
    const isGrantha = GRANTHA_BASES.has(base);
    return {
      text: grapheme,
      type: isGrantha ? "grantha" : "mei",
      baseConsonant: base,
      vowelSign: PULLI,
    };
  }

  if (VOWEL_SIGNS_REGEX.test(grapheme)) {
    const base = grapheme[0];
    const sign = grapheme.slice(1);
    const isGrantha = GRANTHA_BASES.has(base);
    return {
      text: grapheme,
      type: isGrantha ? "grantha" : "uyirmei",
      baseConsonant: base,
      vowelSign: sign,
    };
  }

  // Pure single base consonant with inherent 'a' vowel
  if (/[\u0B95-\u0BB9]/.test(grapheme)) {
    const isGrantha = GRANTHA_BASES.has(grapheme);
    return {
      text: grapheme,
      type: isGrantha ? "grantha" : "uyirmei",
      baseConsonant: grapheme,
      vowelSign: "அ", // Inherent short vowel
    };
  }

  return { text: grapheme, type: "other" };
}
