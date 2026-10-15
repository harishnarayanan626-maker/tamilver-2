# Sorkalam (சொற்காலம்) — Tamil Linguistic Time-Travel Platform

**Sorkalam** is a digital linguistic research platform that traces Tamil words across
2,300+ years of documented literary history — Sangam, Pallava/Bhakti, Chola,
Nayak/Medieval, Colonial, and Modern. It compares Old and Modern Tamil forms,
highlights phonetic/spelling mutations (e.g. *யாண்டு* → *ஆண்டு*), classifies semantic
drift, and presents every claim with citable literary evidence.

> **Sample-data notice:** the bundled corpus (`lib/seedData.ts`, 32 words) is
> **sample data for demonstration**. It needs verification by a qualified Tamil
> scholar before any real scholarly use. See the in-app About page.

## How to run

Requires Node.js 22 and pnpm 10 (see `.mise.toml`).

```bash
pnpm install
pnpm dev      # Vite + API middleware on http://localhost:8443
pnpm build    # production bundle into dist/
pnpm test     # vitest suite (59 tests)
```

The dev server serves the React frontend **and** the backend API (`/api/*`) from the
same origin, so no CORS setup is needed for local development.

## API endpoints

Base URL: `http://localhost:8443`

| Method | Endpoint | Description | Sample curl |
|--------|----------|-------------|-------------|
| GET | `/api/search` | Word search with transliteration + fuzzy match | `curl "http://localhost:8443/api/search?q=kadavul&limit=5"` |
| GET | `/api/periods` | Six historical periods | `curl http://localhost:8443/api/periods` |
| GET | `/api/sources` | Literary sources catalogue | `curl http://localhost:8443/api/sources` |
| GET | `/api/words/:id/journey` | Period-by-period timeline of a word | `curl http://localhost:8443/api/words/w-kadavul/journey` |
| GET | `/api/words/:id/evidence` | Evidences + APA/MLA/Chicago citations (`?period=`) | `curl "http://localhost:8443/api/words/w-yaandu/evidence?period=sangam"` |
| GET | `/api/words/:id/changes` | Recorded spelling/meaning/usage changes | `curl http://localhost:8443/api/words/w-yaandu/changes` |
| GET | `/api/compare` | Change-engine report (`?word=&from=&to=`) | `curl "http://localhost:8443/api/compare?word=யாண்டு&from=sangam&to=modern"` |
| GET | `/api/insights` | Dashboard analytics (most-changed, heatmap) | `curl http://localhost:8443/api/insights` |
| POST | `/api/auth/login` | Login (`{email, password}`) | `curl -X POST http://localhost:8443/api/auth/login -H "Content-Type: application/json" -d '{"email":"scholar@sorkalam.org","password":"scholar123"}'` |
| POST | `/api/auth/register` | Register (`{name, email, password, role?}`) | `curl -X POST http://localhost:8443/api/auth/register -H "Content-Type: application/json" -d '{"name":"Vennila","email":"v@example.com","password":"secret12"}'` |
| GET | `/api/auth/me` | Current session (Bearer token) | `curl http://localhost:8443/api/auth/me -H "Authorization: Bearer <token>"` |
| GET | `/api/contributions` | Scholar contribution queue | `curl http://localhost:8443/api/contributions` |
| POST | `/api/contributions` | Submit evidence contribution | `curl -X POST http://localhost:8443/api/contributions -H "Content-Type: application/json" -d '{"wordText":"கோவில்","periodId":"chola","changeType":"meaning","sourceTitle":"Test","verseText":"test verse text"}'` |
| PATCH | `/api/contributions/:id` | Scholar review (`{status, notes}`) | `curl -X PATCH http://localhost:8443/api/contributions/contrib-2 -H "Content-Type: application/json" -d '{"status":"approved","notes":"Verified against SII II"}'` |
| GET | `/api/collections` | Saved word collections | `curl http://localhost:8443/api/collections` |
| POST | `/api/collections` | Create collection (`{name, description?}`) | `curl -X POST http://localhost:8443/api/collections -H "Content-Type: application/json" -d '{"name":"My words"}'` |
| POST | `/api/collections/:id/items` | Save word into collection (`{wordId, notes?}`) | `curl -X POST http://localhost:8443/api/collections/col-1/items -H "Content-Type: application/json" -d '{"wordId":"w-kadavul","notes":"Thesis ch.2"}'` |
| GET | `/api/collections/:id/export` | Export (`?format=csv\|json\|txt`) | `curl "http://localhost:8443/api/collections/col-1/export?format=csv"` |

## Feature checklist (honest)

Done:
- [x] Live search — 300 ms debounce, English→Tamil transliteration, period/change-type filters, pagination, skeletons, empty/error states, offline recent-search cache
- [x] Word Journey hero — live timeline, era morph of the giant Tamil word, meaning chips, confidence dots
- [x] Letter-level diff strip — grapheme clusters never split
- [x] Evidence drawer — highlighted verse, translation, source/century, verified badge, APA/MLA/Chicago copy + toast
- [x] Compare page — word + from/to periods, spelling diff, drift score, usage summary
- [x] Auth pages — sign in/up/out, protected routes, role badge in header, 401 auto-redirect
- [x] Daily Word of the Era from live insights data, with live verse quote
- [x] Shareable permalinks (`#/word/:id?from=&to=`) with copy button + deep-link boot
- [x] `/` keyboard shortcut focuses search anywhere
- [x] Contribute form — Zod validation with inline errors, multi-period evidence rows, Pending status
- [x] Insights dashboard — recharts donut + bar + drift heatmap (lazy-loaded chunk)
- [x] Accessibility — skip link, timeline arrow-key nav, dialog semantics + Escape, visible focus rings, AA body-text contrast, `prefers-reduced-motion`
- [x] Performance — Journey page + charts code-split, skeleton on every async view
- [x] Tests — 59 passing (`pnpm test`): 26 transliteration pairs, graphemes, spelling diff, citations, auth tokens
- [x] About page with scholar-verification disclaimer

Not done (needs backend track — see `BACKEND_REQUESTS.md`):
- [ ] Real signed JWTs (`server/auth.ts` still uses verifiable-but-forgeable base64 payloads; bit-flip tampering is rejected, crafted payloads are not)
- [ ] Rename/delete collections, edit saved-word notes (no endpoints yet)
- [ ] Client PDF export wiring (jspdf installed, export UI pending)
- [ ] Scholar review-queue UI (PATCH endpoint exists and is tested; screen pending)
- [ ] CORS / body-size limits / per-route rate-limit hardening on the HTTP layer

## Demo script (5 steps for judges)

1. **Search transliteration** — type `kadavul` on Home, press Enter; show the
   `கடவுள்` suggestion chip, filters, and instant cached re-search from Recents.
2. **Word Journey** — open a result; click timeline nodes (or ←/→ keys) and watch
   the giant word morph per era; press Share and paste the permalink in a new tab.
3. **Evidence + cite** — open the evidence drawer, toggle APA/MLA/Chicago, copy a
   citation (toast confirms), note the Verified badge.
4. **Compare + Insights** — compare `யாண்டு` Sangam→Modern (glide-elision diff,
   drift score); open Insights for the donut, bar chart and heatmap.
5. **Contribute + roles** — submit a multi-period contribution (watch inline Zod
   errors, then Pending status); sign in as scholar to see the role badge.

# tamilver-2
