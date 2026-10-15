/**
 * Usage Change & Frequency Transition Engine
 * Analyzes frequency score trajectories, part-of-speech (POS) evolutions,
 * and collocation shifts across historical periods.
 */

export type UsageShiftType = "rise" | "decline" | "role_change" | "stable";

export interface UsageChangeResult {
  fromPeriod: string;
  toPeriod: string;
  fromFrequency: number;
  toFrequency: number;
  frequencyDelta: number;
  fromPos: string;
  toPos: string;
  posChanged: boolean;
  classification: UsageShiftType;
  classificationTa: string;
  classificationEn: string;
  explanationTa: string;
  explanationEn: string;
  trajectory: Array<{ periodId: string; score: number }>;
}

export function computeUsageChange(
  fromPeriod: { id: string; name: string; nameTa: string },
  toPeriod: { id: string; name: string; nameTa: string },
  fromFreq: number,
  toFreq: number,
  fromPos: string = "noun",
  toPos: string = "noun",
  allPeriodScores?: Array<{ periodId: string; score: number }>
): UsageChangeResult {
  const delta = Number((toFreq - fromFreq).toFixed(2));
  const posChanged = fromPos.toLowerCase() !== toPos.toLowerCase();

  let classification: UsageShiftType = "stable";
  let explanationTa = "பயன்பாட்டு விகிதமும் இலக்கண அமைப்பும் சீராகத் தொடர்கின்றன.";
  let explanationEn = "Usage frequency and grammatical role remained consistent across periods.";

  if (posChanged) {
    classification = "role_change";
    explanationTa = `இலக்கணப் பங்கு மாற்றம்: '${fromPos}' என்பதிலிருந்து '${toPos}' ஆக உருமாறியுள்ளது.`;
    explanationEn = `Grammatical role transition: Shifted from ${fromPos} to ${toPos}.`;
  } else if (delta >= 15) {
    classification = "rise";
    explanationTa = `வழக்கு வளர்ச்சி (+${delta}%): இலக்கியச் சூழலிலிருந்து மக்கள் புழக்கத்திற்குப் பரவலாக விரிவடைந்தது.`;
    explanationEn = `Usage surge (+${delta}%): Expanded from specialized literary corpus into widespread contemporary usage.`;
  } else if (delta <= -15) {
    classification = "decline";
    explanationTa = `வழக்கொழிவு / சுருக்கம் (${delta}%): செவ்வியல் செய்யுள் நடையுடன் நின்று, அன்றாட வழக்கில் அருகியது.`;
    explanationEn = `Usage decline (${delta}%): Confined primarily to classical poetry and archaic epigraphic registers.`;
  }

  const classificationTaMap: Record<UsageShiftType, string> = {
    rise: "பயன்பாட்டு வளர்ச்சி",
    decline: "பயன்பாட்டுக் குறைவு",
    role_change: "இலக்கணப் பங்கு மாற்றம்",
    stable: "பயன்பாட்டு நிலைப்பு",
  };

  const classificationEnMap: Record<UsageShiftType, string> = {
    rise: "Usage Expansion (Rise)",
    decline: "Usage Contraction (Decline)",
    role_change: "Functional Role Shift",
    stable: "Usage Stability",
  };

  return {
    fromPeriod: fromPeriod.name,
    toPeriod: toPeriod.name,
    fromFrequency: fromFreq,
    toFrequency: toFreq,
    frequencyDelta: delta,
    fromPos,
    toPos,
    posChanged,
    classification,
    classificationTa: classificationTaMap[classification],
    classificationEn: classificationEnMap[classification],
    explanationTa,
    explanationEn,
    trajectory: allPeriodScores || [
      { periodId: fromPeriod.id, score: fromFreq },
      { periodId: toPeriod.id, score: toFreq },
    ],
  };
}
