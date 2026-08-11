create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  recipient_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  landmark text,
  city text not null,
  state text not null,
  pincode text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint addresses_label_not_blank check (btrim(label) <> ''),
  constraint addresses_recipient_name_not_blank check (btrim(recipient_name) <> ''),
  constraint addresses_phone_not_blank check (btrim(phone) <> ''),
  constraint addresses_address_line1_not_blank check (btrim(address_line1) <> ''),
  constraint addresses_city_not_blank check (btrim(city) <> ''),
  constraint addresses_state_not_blank check (btrim(state) <> ''),
  constraint addresses_pincode_format check (pincode ~ '^[1-9][0-9]{5}$'),
  constraint addresses_latitude_range check (latitude between -90 and 90),
  constraint addresses_longitude_range check (longitude between -180 and 180),
  constraint addresses_coordinates_paired check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  )
);

create unique index addresses_one_default_per_user_idx
  on public.addresses (user_id)
  where is_default;
