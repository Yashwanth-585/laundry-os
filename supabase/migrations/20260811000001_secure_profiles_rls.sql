alter table public.profiles enable row level security;

create policy "Authenticated users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Authenticated users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on table public.profiles from authenticated;

grant update (full_name, phone, avatar_url)
  on table public.profiles
  to authenticated;
