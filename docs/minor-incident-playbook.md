# Minor Incident Playbook

**Trigger:** credible evidence that an account holder is under 18 — a verified
document DOB under 18 at ID review, a substantiated report, or any other
reliable source. Do these steps in order; don't improvise mid-incident.

This is written calmly in advance (2026-07-15) so the response is policy, not
judgment calls under pressure.

## 1. Contain (immediately, before anything else)

- Hide the model row: `is_approved = false` (removes public profile, listing,
  search, RLS visibility to others).
- Suspend the actor (blocks messaging and spending — the same suspension used
  by moderation).
- Do **not** delete anything yet.

## 2. Refund the paying fans

- Pull every ledger row where fans paid this model (tips, content unlocks,
  paid messages, calls) from `coin_transactions` by the model's `actor_id`.
- Reverse them with the existing refund machinery (refunds claw back coins;
  fan balances may go negative by design — that is fine and intended).
- The model's coin balance goes to zero. A minor must never be paid out, and
  the platform does not keep money fans paid to a minor.

## 3. Purge the content

- Unpublish and delete the model's content items and their storage objects
  (content-media bucket, blurred previews, avatars).
- Chat media sent by the account: delete from the chat-media bucket.
- This step is deliberately *after* refunds so the ledger evidence is
  processed before the content disappears.

## 4. Record

Keep (permanently, admin-only):
- The verification record: extracted facts only — legal name, DOB, country,
  reviewer, timestamps. (Document images are already deleted at review time
  per retention policy; do not retain images beyond the decision.)
- A short incident note: how it was discovered, dates, ledger totals refunded,
  content counts purged, who executed each step.

Do not email the account holder a "rejection" — if contact is needed, a
neutral note that the account requires proof of age is the ceiling.

## Notes

- If money was withdrawn before discovery: document amounts and dates; this
  escalates to a conversation with the payment processor and counsel — do not
  attempt silent fixes.
- Precedent: the 2026-07-15 audit (memory: `project_age_verification_state`)
  found one minor account (never monetized — contained at step 1 only, no
  refunds/purge needed at owner's decision).
