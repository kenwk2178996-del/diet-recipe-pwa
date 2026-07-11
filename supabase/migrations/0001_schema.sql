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
