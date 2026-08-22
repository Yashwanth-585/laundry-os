-- ============================================================================
-- STORAGE BUCKETS for item verification photos and support ticket evidence.
-- Mirrors the existing "delivery-task-photos" bucket: public read, authenticated
-- write. If your project already manages buckets by hand in the dashboard,
-- you can skip this file and create the two buckets there instead.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('item-verification-photos', 'item-verification-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('ticket-evidence-photos', 'ticket-evidence-photos', true)
on conflict (id) do nothing;

-- Anyone authenticated can upload (server actions already check role/ownership
-- before calling storage.upload; this policy just permits the write path).
create policy "Authenticated can upload item verification photos"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'item-verification-photos');

create policy "Public can read item verification photos"
    on storage.objects
    for select
    to public
    using (bucket_id = 'item-verification-photos');

create policy "Authenticated can upload ticket evidence photos"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'ticket-evidence-photos');

create policy "Public can read ticket evidence photos"
    on storage.objects
    for select
    to public
    using (bucket_id = 'ticket-evidence-photos');
