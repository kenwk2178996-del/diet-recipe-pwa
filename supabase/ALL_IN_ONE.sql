-- Diet Recipe PWA :: 全マイグレーション結合版。Supabase SQL Editor に丸ごと貼って実行。
-- ============================================================
-- Diet Recipe PWA — schema (spec §5). Additive-only; never drop columns.
-- ============================================================
create extension if not exists "pgcrypto";

-- Enums ------------------------------------------------------
do $$ begin
  create type recipe_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nutrition_source as enum ('page', 'calculated', 'ai_estimated', 'user_input');
exception when duplicate_object then null; end $$;

-- users_profile ---------------------------------------------
create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  ai_monthly_limit int not null default 100,
  created_at timestamptz not null default now()
);

-- recipes ----------------------------------------------------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  main_image_url text,
  cook_time_min int,
  servings int,
  source_url text,
  source_site text,
  source_sns text,
  source_author text,
  is_favorite boolean not null default false,
  rating int check (rating between 0 and 5),
  memo text,
  cooked_count int not null default 0,
  last_cooked_at timestamptz,
  status recipe_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recipes_user_idx on public.recipes(user_id);
create index if not exists recipes_fav_idx on public.recipes(user_id, is_favorite);
create index if not exists recipes_created_idx on public.recipes(user_id, created_at desc);

-- ingredients ------------------------------------------------
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  amount numeric,
  unit text,
  note text,
  group_name text,
  sort_order int not null default 0
);
create index if not exists ingredients_recipe_idx on public.ingredients(recipe_id);

-- steps ------------------------------------------------------
create table if not exists public.steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_no int not null,
  content text not null,
  heat_time_min int,
  temperature text,
  note text
);
create index if not exists steps_recipe_idx on public.steps(recipe_id);

-- nutrition --------------------------------------------------
create table if not exists public.nutrition (
  recipe_id uuid primary key references public.recipes(id) on delete cascade,
  kcal numeric,
  protein_g numeric,
  fat_g numeric,
  carb_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  salt_g numeric,
  source nutrition_source not null default 'ai_estimated'
);

-- tags -------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  unique (user_id, name)
);
create index if not exists tags_user_idx on public.tags(user_id);

create table if not exists public.recipe_tags (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

-- ai_logs ----------------------------------------------------
create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text,
  input_kind text,
  tokens_in int,
  tokens_out int,
  success boolean not null default true,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists ai_logs_user_month_idx on public.ai_logs(user_id, created_at);

-- updated_at trigger ----------------------------------------
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_recipes_updated on public.recipes;
create trigger trg_recipes_updated before update on public.recipes
  for each row execute function public.set_updated_at();

-- monthly AI usage helper -----------------------------------
create or replace function public.ai_calls_this_month(uid uuid)
returns int language sql stable as $$
  select count(*)::int from public.ai_logs
  where user_id = uid and success = true
    and created_at >= date_trunc('month', now());
$$;
-- ============================================================
-- Row Level Security (spec §5, §9). Every table: user_id-scoped only.
-- ============================================================
alter table public.users_profile enable row level security;
alter table public.recipes       enable row level security;
alter table public.ingredients   enable row level security;
alter table public.steps         enable row level security;
alter table public.nutrition     enable row level security;
alter table public.tags          enable row level security;
alter table public.recipe_tags   enable row level security;
alter table public.ai_logs       enable row level security;

-- users_profile: owner only
create policy "profile_select" on public.users_profile for select using (id = auth.uid());
create policy "profile_upsert" on public.users_profile for insert with check (id = auth.uid());
create policy "profile_update" on public.users_profile for update using (id = auth.uid());

-- recipes: owner only
create policy "recipes_all" on public.recipes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- child tables: access allowed only when parent recipe belongs to the user
create policy "ingredients_all" on public.ingredients for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

create policy "steps_all" on public.steps for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

create policy "nutrition_all" on public.nutrition for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

-- tags: owner only
create policy "tags_all" on public.tags for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "recipe_tags_all" on public.recipe_tags for all
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

-- ai_logs: owner reads; inserts happen server-side (service role bypasses RLS)
create policy "ai_logs_select" on public.ai_logs for select using (user_id = auth.uid());
create policy "ai_logs_insert" on public.ai_logs for insert with check (user_id = auth.uid());
-- Auto-create a profile row + seed default tags on signup.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users_profile (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  insert into public.tags (user_id, name, category) values
    (new.id,'高タンパク','栄養'),(new.id,'低脂質','栄養'),(new.id,'低糖質','栄養'),
    (new.id,'低カロリー','栄養'),(new.id,'食物繊維','栄養'),(new.id,'筋トレ向け','栄養'),
    (new.id,'朝食','食事区分'),(new.id,'昼食','食事区分'),(new.id,'夕食','食事区分'),
    (new.id,'間食','食事区分'),(new.id,'お弁当','食事区分'),(new.id,'作り置き','食事区分'),
    (new.id,'電子レンジ','調理法'),(new.id,'フライパン','調理法'),(new.id,'炊飯器','調理法'),
    (new.id,'オーブン','調理法'),(new.id,'火を使わない','調理法'),
    (new.id,'5分以内','時間'),(new.id,'10分以内','時間'),(new.id,'15分以内','時間'),(new.id,'時短','時間'),
    (new.id,'鶏むね肉','食材'),(new.id,'卵','食材'),(new.id,'豆腐','食材'),(new.id,'オートミール','食材'),
    (new.id,'魚','食材'),(new.id,'豚肉','食材'),(new.id,'野菜','食材')
  on conflict (user_id, name) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
-- Storage bucket for recipe images. Private; owner-scoped by path prefix <uid>/...
insert into storage.buckets (id, name, public)
values ('recipe-images','recipe-images', false)
on conflict (id) do nothing;

create policy "recipe_images_read" on storage.objects for select
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recipe_images_write" on storage.objects for insert
  with check (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recipe_images_delete" on storage.objects for delete
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);
