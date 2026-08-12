create extension if not exists "pgcrypto";
create extension if not exists "postgis";

create type public.app_role as enum ('CUSTOMER','FUEL_PARTNER','DELIVERY_AGENT','OPERATIONS_ADMIN','SUPER_ADMIN');
create type public.fuel_type as enum ('PETROL','DIESEL');
create type public.request_status as enum ('CREATED','SEARCHING','ASSIGNED','PARTNER_ACCEPTED','DISPATCHED','EN_ROUTE','ARRIVED','DELIVERING','OTP_PENDING','COMPLETED','CANCELLED','FAILED','EXPIRED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
create table public.fuel_partners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id),
  business_name text not null,
  is_online boolean not null default false,
  reliability_score numeric(5,2) not null default 0.8 check (reliability_score between 0 and 1),
  service_radius_km numeric(6,2) not null default 15 check (service_radius_km > 0),
  operating_start time,
  operating_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.fuel_partner_locations (
  partner_id uuid primary key references public.fuel_partners(id) on delete cascade,
  location geography(Point, 4326) not null,
  accuracy_m numeric(8,2),
  recorded_at timestamptz not null default now()
);
create index fuel_partner_locations_gix on public.fuel_partner_locations using gist (location);
create table public.fuel_inventory (
  partner_id uuid not null references public.fuel_partners(id) on delete cascade,
  fuel_type public.fuel_type not null,
  available_litres numeric(8,2) not null default 0 check (available_litres >= 0),
  price_per_litre numeric(8,2) not null check (price_per_litre > 0),
  updated_at timestamptz not null default now(),
  primary key (partner_id, fuel_type)
);
create table public.delivery_agents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id),
  is_online boolean not null default false,
  current_location geography(Point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index delivery_agents_location_gix on public.delivery_agents using gist (current_location);
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.fuel_partners(id),
  agent_id uuid references public.delivery_agents(id),
  registration_number text not null unique,
  capacity_litres numeric(8,2) not null check (capacity_litres > 0),
  created_at timestamptz not null default now()
);
create table public.service_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  boundary geography(Polygon, 4326),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.fuel_requests (
  id uuid primary key default gen_random_uuid(),
  request_scope_key text not null,
  customer_id uuid references public.profiles(id),
  contact_phone text not null,
  customer_name text,
  fuel_type public.fuel_type not null,
  quantity_litres numeric(8,2) not null check (quantity_litres > 0 and quantity_litres <= 20),
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  customer_location geography(Point, 4326) not null,
  priority text not null default 'NORMAL' check (priority in ('NORMAL','HIGH')),
  request_channel text not null default 'WEB' check (request_channel in ('WEB','SMS','VOICE','OPS')),
  status public.request_status not null default 'CREATED',
  assigned_partner_id uuid references public.fuel_partners(id),
  assigned_partner_name text,
  assigned_partner_score numeric(12,6),
  assigned_partner_eta_minutes numeric(8,2),
  assigned_at timestamptz,
  idempotency_key text not null,
  estimated_total numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_scope_key, idempotency_key)
);
create index fuel_requests_status_created_idx on public.fuel_requests(status, created_at);
create index fuel_requests_customer_idx on public.fuel_requests(customer_id);
create index fuel_requests_scope_idx on public.fuel_requests(request_scope_key);
create table public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.fuel_requests(id) on delete cascade,
  from_status public.request_status,
  to_status public.request_status not null,
  actor_id uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default now()
);
create index request_status_history_request_idx on public.request_status_history(request_id, created_at desc);
create table public.dispatch_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.fuel_requests(id) on delete cascade,
  partner_id uuid not null references public.fuel_partners(id),
  score numeric(12,6) not null,
  eta_minutes numeric(8,2),
  status text not null default 'OFFERED' check (status in ('OFFERED','ACCEPTED','REJECTED','TIMED_OUT','RELEASED')),
  offered_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (request_id, partner_id)
);
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.fuel_requests(id),
  partner_id uuid not null references public.fuel_partners(id),
  agent_id uuid references public.delivery_agents(id),
  vehicle_id uuid references public.vehicles(id),
  started_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.delivery_tracking (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  agent_id uuid not null references public.delivery_agents(id),
  location geography(Point, 4326) not null,
  recorded_at timestamptz not null default now()
);
create index delivery_tracking_delivery_time_idx on public.delivery_tracking(delivery_id, recorded_at desc);
create table public.delivery_otps (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null unique references public.deliveries(id) on delete cascade,
  otp_hash text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id),
  event text not null,
  title text not null,
  body text not null,
  channel text not null check (channel in ('PUSH','SMS','EMAIL','IN_APP')),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.fuel_requests(id) on delete set null,
  direction text not null check (direction in ('INBOUND','OUTBOUND')),
  from_number text,
  to_number text,
  body text not null,
  provider_message_id text,
  status text not null check (status in ('RECEIVED','QUEUED','SENT','DELIVERED','FAILED')),
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index sms_messages_provider_message_idx on public.sms_messages(provider_message_id) where provider_message_id is not null;
create table public.voice_calls (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.fuel_requests(id) on delete set null,
  from_number text,
  to_number text,
  provider_call_id text unique,
  ivr_state text,
  status text not null check (status in ('RINGING','IN_PROGRESS','COMPLETED','FAILED','MISSED')),
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.fuel_requests(id) on delete cascade,
  provider_payment_id text unique,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'INR',
  status text not null check (status in ('PENDING','PAID','FAILED','REFUNDED')),
  is_mock boolean not null default false,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.fuel_requests(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete set null,
  channel text not null check (channel in ('WEB','SMS','VOICE','EMAIL')),
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')),
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.fuel_requests(id) on delete set null,
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','RESOLVED','CLOSED')),
  summary text not null,
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  resource text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.fuel_requests enable row level security;
alter table public.notifications enable row level security;
create policy "profiles_self_read" on public.profiles for select using (id = auth.uid());
create policy "requests_customer_read" on public.fuel_requests for select using (customer_id = auth.uid());
create policy "notifications_recipient_read" on public.notifications for select using (recipient_id = auth.uid());

insert into public.settings(key, value) values
  ('initial_radius_km', '10'), ('max_radius_km', '15'), ('dispatch_timeout_seconds', '60'),
  ('sla_minutes', '45'), ('cancellation_window_minutes', '5')
on conflict (key) do nothing;

create or replace function public.create_fuel_request(
  p_request_scope_key text,
  p_customer_id uuid,
  p_contact_phone text,
  p_customer_name text,
  p_fuel_type public.fuel_type,
  p_quantity_litres numeric,
  p_latitude numeric,
  p_longitude numeric,
  p_priority text,
  p_request_channel text,
  p_idempotency_key text,
  p_estimated_total numeric
) returns public.fuel_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.fuel_requests;
begin
  insert into public.fuel_requests (
    request_scope_key,
    customer_id,
    contact_phone,
    customer_name,
    fuel_type,
    quantity_litres,
    latitude,
    longitude,
    customer_location,
    priority,
    request_channel,
    idempotency_key,
    estimated_total
  ) values (
    p_request_scope_key,
    p_customer_id,
    p_contact_phone,
    nullif(trim(p_customer_name), ''),
    p_fuel_type,
    p_quantity_litres,
    p_latitude,
    p_longitude,
    st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography,
    p_priority,
    p_request_channel,
    p_idempotency_key,
    p_estimated_total
  )
  on conflict (request_scope_key, idempotency_key) do update
    set updated_at = now()
  returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.transition_fuel_request(
  p_request_id uuid,
  p_from_status public.request_status,
  p_to_status public.request_status,
  p_actor_id uuid default null,
  p_reason text default null,
  p_actor_role public.app_role default null
) returns public.fuel_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.fuel_requests;
  v_allowed boolean := false;
begin
  v_allowed := case
    when p_from_status = 'CREATED' and p_to_status = 'SEARCHING' then true
    when p_from_status = 'SEARCHING' and p_to_status in ('ASSIGNED','FAILED','EXPIRED','CANCELLED') then true
    when p_from_status = 'ASSIGNED' and p_to_status in ('PARTNER_ACCEPTED','SEARCHING','FAILED','CANCELLED') then true
    when p_from_status = 'PARTNER_ACCEPTED' and p_to_status in ('DISPATCHED','FAILED','CANCELLED') then true
    when p_from_status = 'DISPATCHED' and p_to_status in ('EN_ROUTE','FAILED','CANCELLED') then true
    when p_from_status = 'EN_ROUTE' and p_to_status in ('ARRIVED','FAILED','CANCELLED') then true
    when p_from_status = 'ARRIVED' and p_to_status in ('DELIVERING','FAILED','CANCELLED') then true
    when p_from_status = 'DELIVERING' and p_to_status in ('OTP_PENDING','FAILED') then true
    when p_from_status = 'OTP_PENDING' and p_to_status = 'COMPLETED' then coalesce(p_actor_role in ('DELIVERY_AGENT','OPERATIONS_ADMIN','SUPER_ADMIN'), false)
    else false
  end;

  if not v_allowed then
    raise exception 'Invalid request transition from % to %', p_from_status, p_to_status;
  end if;

  update public.fuel_requests
  set status = p_to_status,
      assigned_partner_id = case when p_to_status = 'SEARCHING' then null else assigned_partner_id end,
      assigned_partner_name = case when p_to_status = 'SEARCHING' then null else assigned_partner_name end,
      assigned_partner_score = case when p_to_status = 'SEARCHING' then null else assigned_partner_score end,
      assigned_partner_eta_minutes = case when p_to_status = 'SEARCHING' then null else assigned_partner_eta_minutes end,
      assigned_at = case when p_to_status = 'SEARCHING' then null else assigned_at end,
      updated_at = now()
  where id = p_request_id
    and status = p_from_status
  returning * into v_request;

  if not found then
    raise exception 'Unable to transition request % from % to %', p_request_id, p_from_status, p_to_status;
  end if;

  insert into public.request_status_history (
    request_id,
    from_status,
    to_status,
    actor_id,
    reason
  ) values (
    p_request_id,
    p_from_status,
    p_to_status,
    p_actor_id,
    p_reason
  );

  insert into public.audit_logs (
    actor_id,
    action,
    resource,
    resource_id,
    metadata
  ) values (
    p_actor_id,
    'REQUEST_STATUS_TRANSITION',
    'fuel_requests',
    p_request_id,
    jsonb_build_object(
      'from_status', p_from_status,
      'to_status', p_to_status,
      'actor_role', p_actor_role,
      'reason', p_reason
    )
  );

  return v_request;
end;
$$;

create or replace function public.assign_fuel_request(
  p_request_id uuid,
  p_partner_id uuid,
  p_partner_name text,
  p_partner_score numeric,
  p_partner_eta_minutes numeric,
  p_actor_id uuid default null,
  p_reason text default null,
  p_actor_role public.app_role default null
) returns public.fuel_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.fuel_requests;
begin
  update public.fuel_requests
  set status = 'ASSIGNED',
      assigned_partner_id = p_partner_id,
      assigned_partner_name = p_partner_name,
      assigned_partner_score = p_partner_score,
      assigned_partner_eta_minutes = p_partner_eta_minutes,
      assigned_at = now(),
      updated_at = now()
  where id = p_request_id
    and status = 'SEARCHING'
  returning * into v_request;

  if not found then
    raise exception 'Unable to assign request % because it is not SEARCHING', p_request_id;
  end if;

  insert into public.request_status_history (
    request_id,
    from_status,
    to_status,
    actor_id,
    reason
  ) values (
    p_request_id,
    'SEARCHING',
    'ASSIGNED',
    p_actor_id,
    p_reason
  );

  insert into public.audit_logs (
    actor_id,
    action,
    resource,
    resource_id,
    metadata
  ) values (
    p_actor_id,
    'REQUEST_ASSIGNED',
    'fuel_requests',
    p_request_id,
    jsonb_build_object(
      'partner_id', p_partner_id,
      'partner_name', p_partner_name,
      'partner_score', p_partner_score,
      'partner_eta_minutes', p_partner_eta_minutes,
      'actor_role', p_actor_role,
      'reason', p_reason
    )
  );

  return v_request;
end;
$$;
