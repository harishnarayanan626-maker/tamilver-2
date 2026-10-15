/**
 * Verification script for Sorkalam API routes
 */
import { handleApiRequest } from "../server/handlers";

async function verify() {
  console.log("🔍 Verifying Sorkalam API routes internally...\n");

  // 1. Search with English transliteration 'kadavul'
  const searchRes = await handleApiRequest({
    method: "GET",
    path: "/api/search",
    query: { q: "kadavul", period: "all", changeType: "all" },
    headers: {},
  });
  console.log(`[1] GET /api/search?q=kadavul -> Status ${searchRes.status}, Total: ${searchRes.body.data.total}`);
  if (searchRes.status !== 200 || searchRes.body.data.total === 0) throw new Error("Search failed");

  // 2. Journey for 'w-yaandu'
  const journeyRes = await handleApiRequest({
    method: "GET",
    path: "/api/words/w-yaandu/journey",
    query: {},
    headers: {},
  });
  console.log(`[2] GET /api/words/w-yaandu/journey -> Status ${journeyRes.status}, Eras: ${journeyRes.body.data.timeline.length}`);
  if (journeyRes.status !== 200 || journeyRes.body.data.timeline.length !== 6) throw new Error("Journey failed");

  // 3. Evidence for 'w-yaandu'
  const evidenceRes = await handleApiRequest({
    method: "GET",
    path: "/api/words/w-yaandu/evidence",
    query: { period: "sangam" },
    headers: {},
  });
  console.log(`[3] GET /api/words/w-yaandu/evidence?period=sangam -> Status ${evidenceRes.status}, Count: ${evidenceRes.body.data.count}`);
  console.log(`    APA Citation: ${evidenceRes.body.data.evidences[0]?.citations.apa}`);
  if (evidenceRes.status !== 200) throw new Error("Evidence failed");

  // 4. Compare 'ஆண்டு' across Sangam and Modern
  const compareRes = await handleApiRequest({
    method: "GET",
    path: "/api/compare",
    query: { word: "ஆண்டு", from: "sangam", to: "modern" },
    headers: {},
  });
  console.log(`[4] GET /api/compare?word=ஆண்டு -> Status ${compareRes.status}, HasSpellingChange: ${compareRes.body.data.spelling.hasSpellingChange}`);
  console.log(`    Diff explanation: ${compareRes.body.data.spelling.descriptionEn}`);
  if (compareRes.status !== 200) throw new Error("Compare failed");

  // 5. Insights
  const insightsRes = await handleApiRequest({
    method: "GET",
    path: "/api/insights",
    query: {},
    headers: {},
  });
  console.log(`[5] GET /api/insights -> Status ${insightsRes.status}, Most changed count: ${insightsRes.body.data.mostChangedWords.length}`);
  if (insightsRes.status !== 200) throw new Error("Insights failed");

  // 6. Submit contribution
  const contribRes = await handleApiRequest({
    method: "POST",
    path: "/api/contributions",
    query: {},
    body: {
      wordText: "கோவில்",
      periodId: "chola",
      changeType: "meaning",
      sourceTitle: "தஞ்சைப் பெரிய கோயில் கல்வெட்டு",
      verseText: "ஸ்ரீராஜராஜதேவர் எடுப்பிச்ச திருக்கற்றளி ஸ்ரீராஜராஜீஸ்வரம்...",
      century: "11th century CE",
    },
    headers: {},
  });
  console.log(`[6] POST /api/contributions -> Status ${contribRes.status}, New ID: ${contribRes.body.data.id}`);
  if (contribRes.status !== 201) throw new Error("Contribution failed");

  // 7. Scholar review contribution
  const reviewRes = await handleApiRequest({
    method: "PATCH",
    path: `/api/contributions/${contribRes.body.data.id}`,
    query: {},
    body: {
      status: "approved",
      notes: "Verified by scholar Prof. Thamizhchelvan.",
    },
    headers: {},
  });
  console.log(`[7] PATCH /api/contributions/:id -> Status ${reviewRes.status}, Status now: ${reviewRes.body.data.status}`);
  if (reviewRes.status !== 200 || reviewRes.body.data.status !== "approved") throw new Error("Review failed");

  // 8. Collections and CSV export
  const exportRes = await handleApiRequest({
    method: "GET",
    path: "/api/collections/col-1/export",
    query: { format: "csv" },
    headers: {},
  });
  console.log(`[8] GET /api/collections/col-1/export?format=csv -> Status ${exportRes.status}`);
  console.log(`    CSV Header preview:\n    ${exportRes.body.split("\n")[0]}`);
  if (exportRes.status !== 200) throw new Error("Export failed");

  console.log("\n🎉 ALL 8 API ROUTE FLOWS VERIFIED SUCCESSFULLY WITHOUT ERRORS!\n");
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
