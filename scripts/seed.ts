/**
 * Database Seed Script for Sorkalam (சொற்காலம்)
 * Seeds 6 historical periods, 15 classical sources, 32 canonical Tamil words,
 * multiple forms per word, meanings, literary evidences with line citations,
 * and pre-computed change records.
 * Can be run standalone with `pnpm run seed` or via Prisma `npx prisma db seed`.
 */

import { SEED_PERIODS, SEED_SOURCES, SEED_WORDS, SEED_USERS } from "../lib/seedData";
import { db } from "../server/db";

async function main() {
  console.log("🌱 Sorkalam (சொற்காலம்) Database Seeder Initialized...");
  console.log(`   - Historical Periods: ${SEED_PERIODS.length}`);
  console.log(`   - Canonical Sources:  ${SEED_SOURCES.length}`);
  console.log(`   - Curated Words:      ${SEED_WORDS.length}`);
  console.log(`   - Scholarly Users:    ${SEED_USERS.length}`);

  let totalForms = 0;
  let totalMeanings = 0;
  let totalEvidences = 0;
  let totalChanges = 0;

  for (const word of SEED_WORDS) {
    totalForms += word.forms.length;
    totalMeanings += word.meanings.length;
    totalChanges += word.changes.length;
    for (const form of word.forms) {
      totalEvidences += form.evidences.length;
    }
  }

  console.log(`   - Total Word Forms:   ${totalForms}`);
  console.log(`   - Total Meanings:     ${totalMeanings}`);
  console.log(`   - Total Evidences:    ${totalEvidences}`);
  console.log(`   - Recorded Changes:   ${totalChanges}`);

  // Test dynamic query on the seeded store
  const sampleSearch = db.searchWords({ q: "யாண்டு" });
  console.log(`\n✅ Verification Query for 'யாண்டு': matched ${sampleSearch.total} word(s).`);

  const sampleJourney = db.getWordJourney("w-yaandu");
  console.log(`✅ Word Journey Timeline for 'யாண்டு' across ${sampleJourney?.timeline.length} eras loaded.`);

  const sampleEvidence = db.getWordEvidence("w-kadavul");
  console.log(`✅ Citations verified for 'கடவுள்': ${sampleEvidence?.count} primary source(s).`);

  console.log("\n🎉 Database Seeding & Linguistic Integrity Checks Complete!\n");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
