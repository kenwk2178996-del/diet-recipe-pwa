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
