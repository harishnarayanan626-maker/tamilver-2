# Sorkalam (சொற்காலம்) — Architecture & Implementation Plan

## 1. System Overview
**Sorkalam** is a digital linguistic research platform designed to trace Tamil words across 2,300+ years of documented literary history (Sangam, Pallava/Bhakti, Chola, Nayak/Medieval, Colonial, and Modern). It systematically compares Old Tamil and Modern Tamil lemmata, identifies phonetic/spelling mutations (e.g. *yāṇṭu* → *āṇṭu*), detects semantic drift (narrowing, broadening, shift, stability), and monitors usage frequency changes with scholarly citations.

---

## 2. Directory Layout
```
├── lib/
│   ├── changeEngine/
│   │   ├── graphemes.ts        # Tamil Unicode grapheme cluster segmentation (Intl.Segmenter + pulli/uyirmei)
│   │   ├── spellingDiff.ts     # Wagner-Fischer grapheme alignment & letter-level diff (insert/delete/replace)
│   │   ├── semanticDrift.ts    # Sentence embedding cosine similarity & semantic drift classifier
│   │   ├── usageShift.ts       # Frequency delta, POS transition & register change tracker
│   │   └── index.ts            # Orchestrator: runs all analyzers and produces ChangeRecord[]
│   ├── transliterate.ts        # English romanized to Tamil script phonetic converter (e.g. kadavul -> கடவுள்)
│   ├── citations.ts            # APA, MLA & Chicago citation formatter for Tamil literary works
│   ├── validation.ts           # Zod validation schemas for all requests and responses
│   └── seedData.ts             # 30+ canonical Tamil words with multi-period forms & verified evidences
├── server/
│   ├── db.ts                   # Supabase / PostgreSQL client + high-fidelity local store fallback
│   ├── rateLimiter.ts          # Token bucket rate limiting middleware
│   ├── cache.ts                # Search and journey LRU response cache
│   ├── auth.ts                 # Role-based access control (student, researcher, scholar, admin)
│   └── handlers.ts             # Core API route controller logic
├── prisma/
│   ├── schema.prisma           # Prisma schema for PostgreSQL with pg_trgm & unaccent
│   └── seed.ts                 # Database seeder script
├── schema.sql                  # Raw PostgreSQL DDL with GIN Trigram indexes & B-tree indexes
├── test/
│   └── changeEngine.test.ts    # Vitest unit test suite covering Tamil grapheme edge cases & drift
├── src/
│   ├── App.tsx                 # Full-featured API-connected UI shell (Parchment & Ink aesthetic)
│   ├── index.css               # Tailwind CSS v4 styling + parchment, gold & indigo design tokens
│   └── main.tsx                # React 19 entrypoint
├── app/api/                    # Next.js 14 App Router API routes (for Next.js deployment)
│   ├── search/route.ts
│   ├── words/[id]/journey/route.ts
│   ├── words/[id]/evidence/route.ts
│   ├── words/[id]/changes/route.ts
│   ├── compare/route.ts
│   ├── insights/route.ts
│   ├── contributions/route.ts
│   └── collections/route.ts
├── .env.example                # Environment variable templates for Supabase, DB & Embeddings
└── README.md                   # Full documentation and curl examples
```

---

## 3. Implementation Phases
1. **Schema & Environment**: Define PostgreSQL schema (`schema.sql` + `prisma/schema.prisma`), `.env.example`, and seed data with 30+ Tamil words.
2. **Change Engine & Test Suite**: Build Tamil grapheme splitter, edit distance calculation, semantic drift classifier, and usage shift engine. Verify with unit tests in `vitest`.
3. **API & Server Layer**: Connect endpoints for search (with Tamil transliteration + fuzzy matching), word journey timeline, evidence with APA/MLA citations, comparison engine, insights analytics, scholar contributions workflow, and collections export.
4. **Interactive Frontend Shell**: Connect `src/App.tsx` directly to the live backend with instant search, interactive timeline, evidence drawer, visual compare diffs, insights heatmap, workspace export, and role switcher.
5. **Validation & Verification**: Run tests, verify live server responses, validate edge cases, and provide an OpenAPI/curl guide.
