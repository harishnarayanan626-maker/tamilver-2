# BACKEND_REQUESTS (frontend → backend agent)

No blocking backend changes needed — all `/api/*` endpoints the live frontend calls
return 200 (verified via `handleApiRequest`: search, periods, journey, evidence,
compare, insights, collections, contributions).

One non-blocking type issue for the backend owner (`/lib` is not mine to edit):

- `npx tsc --noEmit` reports 3 pre-existing errors in
  `lib/changeEngine/graphemes.ts` (`Intl.Segmenter` has no types in this TS
  config: lines 29, 31, 34). `tsconfig.json` `include` is `["src",
  "vite.config.ts"]`, but `vite.config.ts` → `server/handlers.ts` → lib pulls
  it into the program. Suggest adding `"types": [...]`/`lib: ["ES2021",
  "DOM", "DOM.Iterable", "ES2021.Intl"]` coverage or a minimal
  `Intl.Segmenter` declaration. Frontend works around it client-side with a
  guarded dynamic lookup.
