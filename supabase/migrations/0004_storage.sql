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
