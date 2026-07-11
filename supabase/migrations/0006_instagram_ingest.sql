-- Instagram import metadata. Additive-only.
alter table public.recipes
  add column if not exists original_source_url text,
  add column if not exists normalized_source_url text,
  add column if not exists instagram_post_id text,
  add column if not exists import_method text,
  add column if not exists source_fetched_at timestamptz,
  add column if not exists ai_estimated_fields text[] not null default '{}',
  add column if not exists analysis_confidence numeric check (analysis_confidence is null or (analysis_confidence >= 0 and analysis_confidence <= 1)),
  add column if not exists source_raw_text text;

create index if not exists recipes_user_instagram_post_idx
  on public.recipes(user_id, instagram_post_id)
  where instagram_post_id is not null;

create index if not exists recipes_user_normalized_source_idx
  on public.recipes(user_id, normalized_source_url)
  where normalized_source_url is not null;
