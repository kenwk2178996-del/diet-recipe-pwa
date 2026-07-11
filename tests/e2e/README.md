# E2E notes

`auth.spec.ts` runs against the dev server with no credentials and verifies the
public surface (redirect + auth UI) — it passes without a live Supabase project.

The authenticated journeys in spec §11 (2–17: RLS isolation, URL/AI ingest, CRUD,
search, quota) require a seeded Supabase project + Anthropic key. They are provided
as `authenticated.spec.ts.template`; copy to `.spec.ts` and set TEST_EMAIL /
TEST_PASSWORD in the environment to enable. See docs/KNOWN_LIMITATIONS.md.
