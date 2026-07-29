# Sticker library scripts

One-off/rerunnable Node scripts for the EXA sticker library (`exa_stickers`
table + public `stickers` bucket). All read Supabase creds from `.env.local`
and are idempotent (skip by name / existing model_id).

- `exa-model-stickers.js` — **the one you'll rerun.** Mints an official
  sticker for every claimed 4–5★ model (`rating_tier >= 4`, higher = better)
  that doesn't have one yet, from her primary portfolio photo (gold frame for
  the top three 5★ faces). Run after rating new models:
  `node scripts/stickers/exa-model-stickers.js`
- `generate-stickers.js` / `-2.js` / `-3.js` — generated the 39 original
  synthwave brand stickers (packs 1–3, including the animated WebPs). Output
  goes to a `stickers*/` dir next to the script. Use as templates for new
  packs.
- `upload-stickers.js` — bulk-uploads the generated packs with
  names/categories/tags/featured flags. Point its `DIRS` map at the generator
  output dirs before running.

Categories must match the picker tabs in
`src/components/live-wall/StickerPicker.tsx`: `reactions`, `celebrations`,
`love`, `fire`, `miami`, `models`, `effects`.
