/**
 * Sorkalam Transliteration Engine
 * Converts Romanized / English phonetic Tamil representations into standard Tamil Unicode script.
 * Supports popular conversational phonetic inputs, ISO 15919, and scholarly romanization.
 */

// Vowels (உயிரெழுத்துக்கள்)
const VOWELS: Record<string, string> = {
  a: "அ",
  aa: "ஆ",
  A: "ஆ",
  ā: "ஆ",
  i: "இ",
  ii: "ஈ",
  I: "ஈ",
  ī: "ஈ",
  u: "உ",
  uu: "ஊ",
  U: "ஊ",
  ū: "ஊ",
  e: "எ",
  ee: "ஏ",
  E: "ஏ",
  ē: "ஏ",
  ai: "ஐ",
  o: "ஒ",
  oo: "ஓ",
  O: "ஓ",
  ō: "ஓ",
  au: "ஔ",
  ou: "ஔ",
};

// Vowel signs (உயிர்மெய் குறிகள்)
const VOWEL_SIGNS: Record<string, string> = {
  a: "",
  aa: "ா",
  A: "ா",
  ā: "ா",
  i: "ி",
  ii: "ீ",
  I: "ீ",
  ī: "ீ",
  u: "ு",
  uu: "ூ",
  U: "ூ",
  ū: "ூ",
  e: "ெ",
  ee: "ே",
  E: "ே",
  ē: "ே",
  ai: "ை",
  o: "ொ",
  oo: "ோ",
  O: "ோ",
  ō: "ோ",
  au: "ௌ",
  ou: "ௌ",
};

// Consonants (மெய்யெழுத்துக்கள் base forms)
// Order matters for multi-character matching (e.g. "th", "zh", "ng", "nj", "sh")
const CONSONANT_ENTRIES: Array<[string, string]> = [
  ["ksh", "க்ஷ"],
  ["sri", "ஸ்ரீ"],
  ["sh", "ஷ"],
  ["zh", "ழ"],
  ["th", "த"],
  ["dh", "த"],
  ["ng", "ங"],
  ["nj", "ஞ"],
  ["gn", "ஞ"],
  ["ny", "ஞ"],
  ["ch", "ச"],
  ["jh", "ஜ"],
  ["ph", "ப"],
  ["bh", "ப"],
  ["gh", "க"],
  ["kh", "க"],
  ["nd", "ண்ட"],
  ["nt", "ந்த"],
  ["k", "க"],
  ["g", "க"],
  ["c", "ச"],
  ["s", "ச"],
  ["j", "ஜ"],
  ["t", "ட"],
  ["d", "ட"],
  ["ṭ", "ட"],
  ["ṇ", "ண"],
  ["n", "ந"],
  ["ṉ", "ன"],
  ["p", "ப"],
  ["b", "ப"],
  ["m", "ம"],
  ["y", "ய"],
  ["r", "ர"],
  ["ṟ", "ற"],
  ["R", "ற"],
  ["l", "ல"],
  ["ḷ", "ள"],
  ["L", "ள"],
  ["v", "வ"],
  ["w", "வ"],
  ["z", "ழ"],
  ["h", "ஹ"],
  ["f", "ஃ"],
];

// Special common Tamil dictionary word mappings for instant exact disambiguation
const COMMON_EXACT_MAP: Record<string, string> = {
  kadavul: "கடவுள்",
  katavul: "கடவுள்",
  kaṭavuḷ: "கடவுள்",
  yaandu: "யாண்டு",
  yantu: "யாண்டு",
  yāṇṭu: "யாண்டு",
  aandu: "ஆண்டு",
  antu: "ஆண்டு",
  āṇṭu: "ஆண்டு",
  aram: "அறம்",
  aṟam: "அறம்",
  agam: "அகம்",
  akam: "அகம்",
  puram: "புறம்",
  puṟam: "புறம்",
  kalam: "களம்",
  kaḷam: "களம்",
  naadu: "நாடு",
  nāṭu: "நாடு",
  oor: "ஊர்",
  ūr: "ஊர்",
  kovil: "கோவில்",
  koyil: "கோயில்",
  kōyil: "கோயில்",
  palli: "பள்ளி",
  paḷḷi: "பள்ளி",
  tamil: "தமிழ்",
  thamizh: "தமிழ்",
  tamiḻ: "தமிழ்",
  sol: "சொல்",
  col: "சொல்",
  nool: "நூல்",
  nūl: "நூல்",
  natpu: "நட்பு",
  kaasu: "காசு",
  kācu: "காசு",
  pon: "பொன்",
  thingal: "திங்கள்",
  tiṅkaḷ: "திங்கள்",
  gnayiru: "ஞாயிறு",
  ñāyiṟu: "ஞாயிறு",
  mazhai: "மழை",
  maḻai: "மழை",
  vaan: "வான்",
  vāṉ: "வான்",
  thai: "தாய்",
  tāy: "தாய்",
  thanthai: "தந்தை",
  tantai: "தந்தை",
  arasan: "அரசன்",
  aracan: "அரசன்",
  maanthar: "மாந்தர்",
  māntar: "மாந்தர்",
  virali: "விறலி",
  viṟali: "விறலி",
  kavi: "கவி",
  aazhi: "ஆழி",
  āḻi: "ஆழி",
  vanakkam: "வணக்கம்",
  vaṇakkam: "வணக்கம்",
  thirukural: "திருக்குறள்",
  tirukkuṟaḷ: "திருக்குறள்",
  purananuru: "புறநானூறு",
  puṟanāṉūṟu: "புறநானூறு",
};

/**
 * Checks if a string contains any Tamil script Unicode code points (U+0B80 to U+0BFF).
 */
export function isTamilText(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

/**
 * Phonetically transliterates Romanized Tamil text to Tamil Unicode.
 */
export function transliterateToTamil(input: string): string {
  if (!input || typeof input !== "string") return "";
  const cleaned = input.trim().toLowerCase();
  if (isTamilText(cleaned)) return cleaned;

  // Exact dictionary match first
  if (COMMON_EXACT_MAP[cleaned]) {
    return COMMON_EXACT_MAP[cleaned];
  }

  // Token-by-token rule-based parser
  let result = "";
  let i = 0;
  const n = cleaned.length;

  while (i < n) {
    // Check if current char is non-alphabetic
    const char = cleaned[i];
    if (!/[a-zāīūēōṭṇṉṟḷḻ]/i.test(char)) {
      result += char;
      i++;
      continue;
    }

    // Try consonant match first
    let matchedConsonant: string | null = null;
    let consonantLen = 0;

    for (const [key, base] of CONSONANT_ENTRIES) {
      if (cleaned.startsWith(key, i)) {
        matchedConsonant = base;
        consonantLen = key.length;
        break;
      }
    }

    if (matchedConsonant) {
      i += consonantLen;

      // Check following vowel
      let matchedVowelSign: string | null = null;
      let vowelLen = 0;

      // Check 2-char vowels first (aa, ee, oo, ai, au, uu, ii)
      if (i < n) {
        const twoCharVowel = cleaned.slice(i, i + 2);
        if (VOWEL_SIGNS[twoCharVowel] !== undefined) {
          matchedVowelSign = VOWEL_SIGNS[twoCharVowel];
          vowelLen = 2;
        } else {
          const oneCharVowel = cleaned[i];
          if (VOWEL_SIGNS[oneCharVowel] !== undefined) {
            matchedVowelSign = VOWEL_SIGNS[oneCharVowel];
            vowelLen = 1;
          }
        }
      }

      if (matchedVowelSign !== null) {
        // Compound syllable: base consonant + vowel sign
        result += matchedConsonant + matchedVowelSign;
        i += vowelLen;
      } else {
        // No vowel follows -> pure consonant with pulli (்)
        result += matchedConsonant + "்";
      }
    } else {
      // It's a standalone vowel
      let matchedVowel: string | null = null;
      let vowelLen = 0;

      const twoCharVowel = cleaned.slice(i, i + 2);
      if (VOWELS[twoCharVowel]) {
        matchedVowel = VOWELS[twoCharVowel];
        vowelLen = 2;
      } else if (VOWELS[char]) {
        matchedVowel = VOWELS[char];
        vowelLen = 1;
      }

      if (matchedVowel) {
        result += matchedVowel;
        i += vowelLen;
      } else {
        result += char;
        i++;
      }
    }
  }

  // Refine common final 'n' to 'ன்' and internal n-substitutions
  return result
    .replace(/ந்$/, "ன்")
    .replace(/ந் /g, "ன் ")
    .replace(/ந்([,\.])/g, "ன்$1");
}

/**
 * Returns suggested Tamil forms for a query if it was typed in English.
 */
export function getTransliterationSuggestions(query: string): string[] {
  if (!query || isTamilText(query)) return [];
  const q = query.trim().toLowerCase();
  const suggestions: string[] = [];

  if (COMMON_EXACT_MAP[q]) {
    suggestions.push(COMMON_EXACT_MAP[q]);
  }

  const generated = transliterateToTamil(q);
  if (generated && !suggestions.includes(generated)) {
    suggestions.push(generated);
  }

  return suggestions;
}
