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
