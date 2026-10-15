/**
 * Sorkalam Change Engine Unit Tests
 * Rigorously validates Tamil grapheme segmentation, pulli preservation, uyirmei handling,
 * Wagner-Fischer letter-level diffs, semantic drift vector classification, and usage shift analysis.
 */

import { describe, it, expect } from "vitest";
import { splitTamilGraphemes, analyzeGrapheme } from "../lib/changeEngine/graphemes";
import { computeTamilSpellingDiff } from "../lib/changeEngine/spellingDiff";
import { computeSemanticDrift } from "../lib/changeEngine/semanticDrift";
import { computeUsageChange } from "../lib/changeEngine/usageShift";
import { transliterateToTamil, isTamilText } from "../lib/transliterate";

describe("Tamil Grapheme Segmentation Engine", () => {
  it("correctly segments pure consonants with pulli (மெய்)", () => {
    const text = "க்";
    const graphemes = splitTamilGraphemes(text);
    expect(graphemes).toEqual(["க்"]);
    const analysis = analyzeGrapheme(graphemes[0]);
    expect(analysis.type).toBe("mei");
    expect(analysis.baseConsonant).toBe("க");
  });

  it("correctly segments compound syllables (உயிர்மெய்)", () => {
    const text = "சொல்";
    const graphemes = splitTamilGraphemes(text);
    expect(graphemes).toEqual(["சொ", "ல்"]);
    expect(analyzeGrapheme(graphemes[0]).type).toBe("uyirmei");
    expect(analyzeGrapheme(graphemes[1]).type).toBe("mei");
  });

  it("handles classical Tamil word 'யாண்டு' accurately", () => {
    const graphemes = splitTamilGraphemes("யாண்டு");
    // 'யா', 'ண்', 'டு'
    expect(graphemes).toEqual(["யா", "ண்", "டு"]);
    expect(graphemes.length).toBe(3);
  });

  it("handles modern Tamil word 'ஆண்டு' accurately", () => {
    const graphemes = splitTamilGraphemes("ஆண்டு");
    // 'ஆ', 'ண்', 'டு'
    expect(graphemes).toEqual(["ஆ", "ண்", "டு"]);
    expect(graphemes.length).toBe(3);
    expect(analyzeGrapheme(graphemes[0]).type).toBe("uyir");
  });

  it("handles Aytham letter (ஃ)", () => {
    const graphemes = splitTamilGraphemes("அஃது");
    expect(graphemes).toEqual(["அ", "ஃ", "து"]);
    expect(analyzeGrapheme(graphemes[1]).type).toBe("aytham");
  });
});

describe("Spelling Mutation & Grapheme Edit Distance", () => {
  it("detects 'யாண்டு' → 'ஆண்டு' letter-by-letter mutation", () => {
    const result = computeTamilSpellingDiff("யாண்டு", "ஆண்டு");
    expect(result.hasSpellingChange).toBe(true);
    expect(result.oldGraphemes).toEqual(["யா", "ண்", "டு"]);
    expect(result.newGraphemes).toEqual(["ஆ", "ண்", "டு"]);

    // Matches 'ண்' and 'டு', with mutation on position 0
    const matchTokens = result.diff.filter((d) => d.type === "match");
    expect(matchTokens.length).toBe(2);

    expect(result.similarityScore).toBeGreaterThan(0.5);
    expect(result.descriptionEn.toLowerCase()).toContain("glide elision");
  });

  it("returns 1.0 similarity for unchanged words", () => {
    const result = computeTamilSpellingDiff("தமிழ்", "தமிழ்");
    expect(result.hasSpellingChange).toBe(false);
    expect(result.similarityScore).toBe(1.0);
    expect(result.distance).toBe(0);
  });

  it("handles vowel length change with partial substitution cost", () => {
    // 'கல்' vs 'கால்' (vowel lengthened: 'க' -> 'கா')
    const result = computeTamilSpellingDiff("கல்", "கால்");
    expect(result.hasSpellingChange).toBe(true);
    expect(result.distance).toBe(0.5); // 0.5 cost for same consonant base
  });
});

describe("Semantic Drift Classifier", () => {
  it("classifies 'கடவுள்' as semantic shift", async () => {
    const result = await computeSemanticDrift(
      "கடவுள்",
      "one who transcends limits",
      "வரம்பு கடந்து உள்ளவர்",
      "personal divine lord",
      "இறைவன்"
    );
    expect(result.classification).toBe("shift");
    expect(result.driftScore).toBeGreaterThan(0.5);
    expect(result.classificationTa).toBe("பொருள் இடப்பெயர்ச்சி");
  });

  it("classifies 'பள்ளி' as semantic narrowing", async () => {
    const result = await computeSemanticDrift(
      "பள்ளி",
      "place of rest, bed, hermitage",
      "துயிலிடம், படுக்கை",
      "institution for education",
      "கல்வி நிலையம்"
    );
    expect(result.classification).toBe("narrowing");
    expect(result.classificationTa).toBe("பொருள் சுருங்குதல்");
  });

  it("classifies 'சொல்' as stable", async () => {
    const result = await computeSemanticDrift(
      "சொல்",
      "word, speech, linguistic utterance",
      "சொல், மொழி",
      "word, vocabulary item",
      "சொல், வார்த்தை"
    );
    expect(result.classification).toBe("stable");
    expect(result.driftScore).toBeLessThan(0.3);
  });
});

describe("Usage Shift Engine", () => {
  const fromP = { id: "sangam", name: "Sangam", nameTa: "சங்க காலம்" };
  const toP = { id: "modern", name: "Modern", nameTa: "நவீன காலம்" };

  it("flags rise in frequency", () => {
    const result = computeUsageChange(fromP, toP, 40, 85, "noun", "noun");
    expect(result.classification).toBe("rise");
    expect(result.frequencyDelta).toBe(45);
  });

  it("flags decline in frequency for archaic words", () => {
    const result = computeUsageChange(fromP, toP, 85, 20, "noun", "noun");
    expect(result.classification).toBe("decline");
    expect(result.frequencyDelta).toBe(-65);
  });

  it("flags grammatical role shift if POS changes", () => {
    const result = computeUsageChange(fromP, toP, 60, 65, "verb", "noun");
    expect(result.classification).toBe("role_change");
    expect(result.posChanged).toBe(true);
  });
});

describe("Phonetic Transliteration Engine", () => {
  it("converts 'kadavul' to 'கடவுள்'", () => {
    expect(transliterateToTamil("kadavul")).toBe("கடவுள்");
  });

  it("converts 'yaandu' to 'யாண்டு'", () => {
    expect(transliterateToTamil("yaandu")).toBe("யாண்டு");
  });

  it("converts 'aram' to 'அறம்'", () => {
    expect(transliterateToTamil("aram")).toBe("அறம்");
  });

  it("detects Tamil script Unicode", () => {
    expect(isTamilText("தமிழ்")).toBe(true);
    expect(isTamilText("tamil")).toBe(false);
  });
});
