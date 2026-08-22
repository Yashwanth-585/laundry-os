-- ============================================================================
-- FUNCTIONAL ADDITIONS
-- 1. Rider per-item verification (photos + condition) at pickup/delivery
-- 2. Customer complaint / support tickets
-- 3. Store credits (admin-configured %, 45-day expiry, awarded on delivery)
-- 4. Cash on Delivery (COD) payment method
-- ============================================================================

/* ============================================================================
   1. COD SUPPORT ON ORDERS
============================================================================ */

alter table public.orders
    add column if not exists payment_method text not null default 'RAZORPAY'
        check (payment_method in ('RAZORPAY', 'COD'));

alter table public.orders
    add column if not exists cod_collected_at timestamptz;

alter table public.orders
    add column if not exists cod_collected_by uuid references auth.users (id);

alter table public.orders
    add column if not exists credits_applied numeric(10, 2) not null default 0;

-- Razorpay order id is not applicable for COD orders.
alter table public.orders
    alter column razorpay_order_id drop not null;

/* ============================================================================
   2. ITEM VERIFICATION (rider photos/condition at pickup + delivery)
============================================================================ */

create table if not exists public.delivery_task_item_reports (
    id uuid primary key default gen_random_uuid(),
    delivery_task_id uuid not null references public.delivery_tasks (id) on delete cascade,
    order_item_id uuid not null references public.order_items (id) on delete cascade,
    task_type text not null check (task_type in ('PICKUP', 'DROP')),
    condition text not null check (condition in ('GOOD', 'DAMAGED', 'MISSING')),
    note text,
    photo_urls text[] not null default '{}',
    reported_by uuid not null references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint delivery_task_item_reports_unique_per_task_stage
        unique (delivery_task_id, order_item_id)
);

create index if not exists delivery_task_item_reports_task_idx
    on public.delivery_task_item_reports (delivery_task_id);

alter table public.delivery_task_item_reports enable row level security;

-- Rider can manage reports for tasks assigned to them.
create policy "Riders can view their own item reports"
    on public.delivery_task_item_reports
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.delivery_tasks dt
            join public.delivery_partners dp on dp.id = dt.delivery_partner_id
            where dt.id = delivery_task_item_reports.delivery_task_id
              and dp.profile_id = auth.uid()
        )
    );

create policy "Riders can create item reports for their tasks"
    on public.delivery_task_item_reports
    for insert
    to authenticated
    with check (
        reported_by = auth.uid()
        and exists (
            select 1
            from public.delivery_tasks dt
            join public.delivery_partners dp on dp.id = dt.delivery_partner_id
            where dt.id = delivery_task_item_reports.delivery_task_id
              and dp.profile_id = auth.uid()
        )
    );

create policy "Riders can update their own item reports"
    on public.delivery_task_item_reports
    for update
    to authenticated
    using (
        exists (
            select 1
            from public.delivery_tasks dt
            join public.delivery_partners dp on dp.id = dt.delivery_partner_id
            where dt.id = delivery_task_item_reports.delivery_task_id
              and dp.profile_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from public.delivery_tasks dt
            join public.delivery_partners dp on dp.id = dt.delivery_partner_id
            where dt.id = delivery_task_item_reports.delivery_task_id
              and dp.profile_id = auth.uid()
        )
    );

-- Customers can view reports tied to their own orders.
create policy "Customers can view item reports on their orders"
    on public.delivery_task_item_reports
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.delivery_tasks dt
            join public.orders o on o.id = dt.order_id
            where dt.id = delivery_task_item_reports.delivery_task_id
              and o.customer_id = auth.uid()
        )
    );

-- Admins can view everything (role check via profiles).
create policy "Admins can view all item reports"
    on public.delivery_task_item_reports
    for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    );

/* ============================================================================
   3. SUPPORT / COMPLAINT TICKETS
============================================================================ */

create table if not exists public.support_tickets (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references auth.users (id) on delete cascade,
    order_id uuid references public.orders (id) on delete set null,
    order_item_id uuid references public.order_items (id) on delete set null,
    issue_type text not null check (issue_type in ('MISSING_ITEM', 'DAMAGED_ITEM', 'OTHER')),
    description text not null,
    photo_urls text[] not null default '{}',
    status text not null default 'OPEN'
        check (status in ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
    admin_notes text,
    resolution text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    resolved_at timestamptz,
    resolved_by uuid references auth.users (id),

    constraint support_tickets_description_not_blank check (btrim(description) <> '')
);

create index if not exists support_tickets_customer_idx on public.support_tickets (customer_id);
create index if not exists support_tickets_order_idx on public.support_tickets (order_id);

alter table public.support_tickets enable row level security;

create policy "Customers can view their own tickets"
    on public.support_tickets
    for select
    to authenticated
    using (customer_id = auth.uid());

create policy "Customers can create their own tickets"
    on public.support_tickets
    for insert
    to authenticated
    with check (customer_id = auth.uid());

create policy "Admins can view all tickets"
    on public.support_tickets
    for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    );

create policy "Admins can update all tickets"
    on public.support_tickets
    for update
    to authenticated
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    )
    with check (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    );

/* ============================================================================
   4. STORE CREDITS
============================================================================ */

create table if not exists public.credit_settings (
    id smallint primary key default 1 check (id = 1),
    percentage numeric(5, 2) not null default 0 check (percentage >= 0 and percentage <= 100),
    updated_at timestamptz not null default now(),
    updated_by uuid references auth.users (id)
);

insert into public.credit_settings (id, percentage)
values (1, 0)
on conflict (id) do nothing;

alter table public.credit_settings enable row level security;

-- Everyone signed in can read the current percentage (shown at checkout).
create policy "Authenticated users can read credit settings"
    on public.credit_settings
    for select
    to authenticated
    using (true);

-- Only admins can change it (enforced again at the app layer with the service role).
create policy "Admins can update credit settings"
    on public.credit_settings
    for update
    to authenticated
    using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    )
    with check (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    );

create table if not exists public.customer_credits (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references auth.users (id) on delete cascade,
    order_id uuid not null references public.orders (id) on delete cascade,
    amount numeric(10, 2) not null check (amount >= 0),
    used_amount numeric(10, 2) not null default 0 check (used_amount >= 0),
    percentage_applied numeric(5, 2) not null,
    status text not null default 'ACTIVE' check (status in ('ACTIVE', 'USED', 'EXPIRED')),
    issued_at timestamptz not null default now(),
    expires_at timestamptz not null,

    constraint customer_credits_one_per_order unique (order_id),
    constraint customer_credits_used_not_over_amount check (used_amount <= amount)
);

create index if not exists customer_credits_customer_idx on public.customer_credits (customer_id);

alter table public.customer_credits enable row level security;

create policy "Customers can view their own credits"
    on public.customer_credits
    for select
    to authenticated
    using (customer_id = auth.uid());

-- No direct insert/update/delete from clients: credits are awarded by the
-- trigger below (security definer) and redeemed via the checkout server
-- action using the service role.

/* ----------------------------------------------------------------------
   Award credits automatically when an order transitions to DELIVERED.
   Uses the percentage configured in credit_settings at the time of
   delivery, with a 45-day expiry from the order (delivery) date.
---------------------------------------------------------------------- */

create or replace function public.award_order_credits()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
    v_percentage numeric(5, 2);
    v_amount numeric(10, 2);
begin
    if new.status = 'DELIVERED' and (old.status is distinct from 'DELIVERED') then
        select percentage into v_percentage
        from public.credit_settings
        where id = 1;

        if v_percentage is not null and v_percentage > 0 then
            v_amount := round(new.total_amount * v_percentage / 100, 2);

            if v_amount > 0 then
                insert into public.customer_credits (
                    customer_id, order_id, amount, percentage_applied, expires_at
                )
                values (
                    new.customer_id, new.id, v_amount, v_percentage, now() + interval '45 days'
                )
                on conflict (order_id) do nothing;
            end if;
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_award_order_credits on public.orders;

create trigger trg_award_order_credits
    after update on public.orders
    for each row execute function public.award_order_credits();

/* ----------------------------------------------------------------------
   Redeem credits against an order. Called from the checkout server
   action (with the service role) so the discount amount can never be
   forged by the client. Only ACTIVE, non-expired credits are usable,
   oldest-expiring first.
---------------------------------------------------------------------- */

create or replace function public.redeem_customer_credits(
    p_customer_id uuid,
    p_amount numeric
)
returns numeric
language plpgsql
security definer set search_path = ''
as $$
declare
    v_remaining numeric := p_amount;
    v_redeemed numeric := 0;
    v_row record;
    v_take numeric;
begin
    if p_amount <= 0 then
        return 0;
    end if;

    for v_row in
        select id, amount, used_amount
        from public.customer_credits
        where customer_id = p_customer_id
          and status = 'ACTIVE'
          and expires_at > now()
          and used_amount < amount
        order by expires_at asc
        for update
    loop
        exit when v_remaining <= 0;

        v_take := least(v_remaining, v_row.amount - v_row.used_amount);

        update public.customer_credits
        set used_amount = used_amount + v_take,
            status = case
                when used_amount + v_take >= amount then 'USED'
                else status
            end
        where id = v_row.id;

        v_remaining := v_remaining - v_take;
        v_redeemed := v_redeemed + v_take;
    end loop;

    return v_redeemed;
end;
$$;

-- Read-only helper: a customer's currently available (active, unexpired) balance.
create or replace function public.get_available_credit_balance(p_customer_id uuid)
returns numeric
language sql
security definer set search_path = ''
stable
as $$
    select coalesce(sum(amount - used_amount), 0)
    from public.customer_credits
    where customer_id = p_customer_id
      and status = 'ACTIVE'
      and expires_at > now();
$$;

grant execute on function public.get_available_credit_balance(uuid) to authenticated;
