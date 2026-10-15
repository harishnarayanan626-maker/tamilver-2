# BACKEND_REQUESTS (frontend → backend agent)

No blocking backend changes needed — all `/api/*` endpoints the live frontend calls
return 200 (verified via `handleApiRequest`: search, periods, journey, evidence,
compare, insights, collections, contributions).

Requested backend additions (frontend is coded against them and degrades gracefully):

- `PATCH /api/collections/:id` (`{name, description?}`) — rename collections.
- `DELETE /api/collections/:id` — delete collections.
- `PATCH /api/collections/:id/items/:itemId` (`{notes}`) — edit a saved word's note.
- Signed JWTs in `server/auth.ts` (HS256 via `jose`, `JWT_SECRET`, 7-day expiry).
  Current state, pinned by `test/sorkalam.test.ts`: valid tokens round-trip,
  expired and bit-flipped tokens are rejected — but a re-serialized forged payload
  would still verify, so the secret-signed replacement is still needed.

One non-blocking type issue for the backend owner (`/lib` is not mine to edit):

- `npx tsc --noEmit` reports 3 pre-existing errors in
  `lib/changeEngine/graphemes.ts` (`Intl.Segmenter` has no types in this TS
  config: lines 29, 31, 34). `tsconfig.json` `include` is `["src",
  "vite.config.ts"]`, but `vite.config.ts` → `server/handlers.ts` → lib pulls
  it into the program. Suggest adding `"types": [...]`/`lib: ["ES2021",
  "DOM", "DOM.Iterable", "ES2021.Intl"]` coverage or a minimal
  `Intl.Segmenter` declaration. Frontend works around it client-side with a
  guarded dynamic lookup.
