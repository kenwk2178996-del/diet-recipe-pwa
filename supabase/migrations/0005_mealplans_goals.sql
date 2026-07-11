-- 献立カレンダー + 目標値 (拡張 §12)
alter table public.users_profile
  add column if not exists goal_kcal int,
  add column if not exists goal_protein_g int,
  add column if not exists goal_fat_g int,
  add column if not exists goal_carb_g int;

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_type text not null,               -- 朝食 / 昼食 / 夕食 / 間食
  recipe_id uuid references public.recipes(id) on delete cascade,
  servings numeric not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists meal_plans_user_date_idx on public.meal_plans(user_id, date);

alter table public.meal_plans enable row level security;
create policy "meal_plans_all" on public.meal_plans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
