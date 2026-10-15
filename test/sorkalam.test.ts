/**
 * Sorkalam frontend-QA test suite.
 * Covers: romanized transliteration pairs, Tamil grapheme segmentation
 * (uyirmei / pulli-mei / conjuncts), spelling diffs, citation formatting,
 * and auth token behaviour (valid, expired, tampered).
 */

import { describe, it, expect } from "vitest";
import {
  transliterateToTamil,
  isTamilText,
  getTransliterationSuggestions,
} from "../lib/transliterate";
import { splitTamilGraphemes, analyzeGrapheme } from "../lib/changeEngine/graphemes";
import { computeTamilSpellingDiff } from "../lib/changeEngine/spellingDiff";
import { formatCitations } from "../lib/citations";
import { generateToken, verifyToken, type AuthUser } from "../server/auth";

describe("Romanized → Tamil transliteration (exact dictionary pairs)", () => {
  const pairs: Array<[string, string]> = [
    ["kadavul", "கடவுள்"],
    ["katavul", "கடவுள்"],
    ["yaandu", "யாண்டு"],
    ["yantu", "யாண்டு"],
    ["aandu", "ஆண்டு"],
    ["antu", "ஆண்டு"],
    ["aram", "அறம்"],
    ["agam", "அகம்"],
    ["akam", "அகம்"],
    ["puram", "புறம்"],
    ["kalam", "களம்"],
    ["naadu", "நாடு"],
    ["oor", "ஊர்"],
    ["kovil", "கோவில்"],
    ["koyil", "கோயில்"],
    ["palli", "பள்ளி"],
    ["tamil", "தமிழ்"],
    ["thamizh", "தமிழ்"],
    ["sol", "சொல்"],
    ["col", "சொல்"],
    ["nool", "நூல்"],
    ["arasan", "அரசன்"],
    ["mazhai", "மழை"],
    ["vaan", "வான்"],
    ["thai", "தாய்"],
    ["tantai", "தந்தை"],
  ];

  it.each(pairs)("converts %s → %s", (roman, tamil) => {
    expect(transliterateToTamil(roman)).toBe(tamil);
  });

  it("passes Tamil script through unchanged", () => {
    expect(transliterateToTamil("கடவுள்")).toBe("கடவுள்");
  });

  it("detects Tamil vs roman input", () => {
    expect(isTamilText("தமிழ்")).toBe(true);
    expect(isTamilText("tamil")).toBe(false);
  });

  it("suggests Tamil forms for English queries", () => {
    expect(getTransliterationSuggestions("kadavul")).toContain("கடவுள்");
    expect(getTransliterationSuggestions("தமிழ்")).toEqual([]);
  });
});

describe("Tamil grapheme segmentation", () => {
  it("keeps uyirmei (consonant + vowel sign) intact", () => {
    expect(splitTamilGraphemes("சொல்")).toEqual(["சொ", "ல்"]);
    expect(analyzeGrapheme("சொ").type).toBe("uyirmei");
    expect(splitTamilGraphemes("கா")).toEqual(["கா"]);
  });

  it("classifies pure pulli consonants as mei", () => {
    expect(splitTamilGraphemes("க்")).toEqual(["க்"]);
    expect(analyzeGrapheme("க்").type).toBe("mei");
    expect(analyzeGrapheme("க்").baseConsonant).toBe("க");
  });

  it("keeps conjuncts (க்ஷ, ஸ்ரீ) as single clusters", () => {
    expect(splitTamilGraphemes("க்ஷ")).toEqual(["க்ஷ"]);
    expect(splitTamilGraphemes("ஸ்ரீ")).toEqual(["ஸ்ரீ"]);
  });

  it("segments independent vowels as uyir", () => {
    expect(analyzeGrapheme("அ").type).toBe("uyir");
    expect(analyzeGrapheme("ஆ").type).toBe("uyir");
  });
});

describe("Tamil spelling diff (யாண்டு → ஆண்டு)", () => {
  it("detects the initial-glide elision with grapheme-intact tokens", () => {
    const result = computeTamilSpellingDiff("யாண்டு", "ஆண்டு");
    expect(result.hasSpellingChange).toBe(true);
    expect(result.oldGraphemes).toEqual(["யா", "ண்", "டு"]);
    expect(result.newGraphemes).toEqual(["ஆ", "ண்", "டு"]);
    expect(result.distance).toBeGreaterThan(0);
    expect(result.similarityScore).toBeLessThan(1);
    // Every token references whole graphemes only — never a split vowel sign.
    for (const tok of result.diff) {
      if (tok.oldChar !== undefined) expect(result.oldGraphemes).toContain(tok.oldChar);
      if (tok.newChar !== undefined) expect(result.newGraphemes).toContain(tok.newChar);
    }
  });
});

describe("Scholarly citation formatting", () => {
  const source = {
    title: "Puṟanāṉūṟu",
    titleTa: "புறநானூறு",
    author: "Kaṇiyaṉ Pūṅkuṉṟaṉār",
    periodName: "Sangam",
    century: "c. 200 BCE",
    type: "poem",
    verseNo: "192",
    lineRef: "4",
  };

  it("formats APA with author, century and title", () => {
    const { apa } = formatCitations(source);
    expect(apa).toContain("Kaṇiyaṉ Pūṅkuṉṟaṉār");
    expect(apa).toContain("c. 200 BCE");
    expect(apa).toContain("Puṟanāṉūṟu");
  });

  it("formats MLA with author and title", () => {
    const { mla } = formatCitations(source);
    expect(mla).toContain("Kaṇiyaṉ Pūṅkuṉṟaṉār");
    expect(mla).toContain("Puṟanāṉūṟu");
  });

  it("formats Chicago with title and century", () => {
    const { chicago } = formatCitations(source);
    expect(chicago).toContain("Puṟanāṉūṟu");
    expect(chicago).toContain("c. 200 BCE");
  });
});

describe("Auth tokens (valid, expired, tampered)", () => {
  const user: AuthUser = {
    id: "usr-test-1",
    name: "Test Researcher",
    email: "researcher@sorkalam.org",
    role: "researcher",
    institution: "Test University",
  };

  function payloadOf(token: string) {
    const base64 = token.replace("sorkalam_jwt_", "");
    return JSON.parse(Buffer.from(base64, "base64url").toString());
  }

  function tokenWith(payload: Record<string, unknown>) {
    return `sorkalam_jwt_${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
  }

  it("round-trips a valid token back to the user", () => {
    const token = generateToken(user);
    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(user.id);
    expect(verified?.role).toBe("researcher");
  });

  it("rejects an expired token", () => {
    const payload = payloadOf(generateToken(user));
    payload.exp = Math.floor(Date.now() / 1000) - 60; // expired 1 minute ago
    expect(verifyToken(tokenWith(payload))).toBeNull();
  });

  it("rejects a bit-flipped (tampered) token", () => {
    const token = generateToken(user);
    const body = token.replace("sorkalam_jwt_", "");
    const flipped = body.slice(0, 10) + (body[10] === "A" ? "B" : "A") + body.slice(11);
    expect(verifyToken(`sorkalam_jwt_${flipped}`)).toBeNull();
  });

  it("rejects tokens without the expected prefix", () => {
    expect(verifyToken("bearer abc123")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });
});
