alter table public.addresses enable row level security;

create policy "Authenticated users can view their own addresses"
  on public.addresses
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated users can create their own addresses"
  on public.addresses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated users can update their own addresses"
  on public.addresses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users can delete their own addresses"
  on public.addresses
  for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all privileges on table public.addresses from authenticated;

grant select on table public.addresses to authenticated;

grant insert (
  user_id, label, recipient_name, phone, address_line1, address_line2,
  landmark, city, state, pincode, latitude, longitude, is_default
) on table public.addresses to authenticated;

grant update (
  label, recipient_name, phone, address_line1, address_line2, landmark,
  city, state, pincode, latitude, longitude, is_default
) on table public.addresses to authenticated;

grant delete on table public.addresses to authenticated;
