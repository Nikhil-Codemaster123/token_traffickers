-- Mock centrix: run this once in Supabase → SQL Editor, then run seed.sql.
-- All data is synthetic. RLS is ON with no policies: only the server (service role key) can read or write.

create table if not exists partners (
  partner_id       text primary key,
  name             text not null,
  category         text not null,                -- heating, internet, energy, ...
  trades           text[] default '{}',
  fuels            text[] default '{}',          -- heating firms: gas, oil
  postcodes        text[] default '{}',
  response_time_h  int,
  rating           numeric,
  callout_fee_eur  numeric,
  hourly_rate_eur  numeric,
  job_channel      text default 'whatsapp',       -- Reltix: craftsmen get jobs mostly via WhatsApp
  offer_channel    text default 'email',          -- Reltix: lengthy offers go via email
  phone            text,
  email            text
);

create table if not exists properties (
  property_id            text primary key,
  address                text not null,
  postcode               text not null,
  city                   text not null,
  building_year          int,
  heating                text check (heating in ('central', 'per_flat')),
  fuel                   text check (fuel in ('gas', 'oil', 'district', 'heat_pump')),
  energy_certificate     jsonb,
  maintenance_partner_id text references partners(partner_id)
);

create table if not exists units (
  unit_id      text primary key,
  property_id  text references properties(property_id),
  floor        int,
  size_sqm     numeric,
  rooms        int,
  meters       jsonb default '[]'::jsonb,
  access_notes text                               -- released to a craftsman only after Accept, on the appointment day
);

create table if not exists contacts (
  contact_id text primary key,
  name       text not null,
  role       text check (role in ('owner', 'tenant', 'caretaker')),
  email      text,
  phone      text,
  language   text default 'de',
  unit_id    text references units(unit_id),
  move_in    date,
  move_out   date
);

create table if not exists contracts (
  contract_id        text primary key,
  type               text check (type in ('lease', 'management', 'service', 'framework')),
  property_id        text references properties(property_id),
  unit_id            text references units(unit_id),
  contact_id         text references contacts(contact_id),
  partner_id         text references partners(partner_id),
  rent_cold_eur      numeric,
  approval_limit_eur numeric,                    -- management contracts: repairs the manager may approve alone
  start_date         date,
  end_date           date,
  terms              jsonb default '{}'::jsonb
);

create table if not exists availability (
  slot_id    text primary key,
  partner_id text references partners(partner_id),
  slot_start timestamptz not null,
  slot_end   timestamptz not null,
  booked     boolean default false
);

create table if not exists cases (
  case_id            text primary key default ('case_' || substr(md5(random()::text), 1, 8)),
  property_id        text references properties(property_id),
  unit_id            text references units(unit_id),
  contact_id         text references contacts(contact_id),
  scope              text check (scope in ('unit', 'building')) default 'unit',
  category           text not null,
  urgency            text check (urgency in ('low', 'normal', 'high', 'emergency')) default 'normal',
  status             text default 'new',         -- new, partner_picked, dispatched, awaiting_approval, scheduled, completed, closed, reopened, stopped, emergency
  symptoms           text,
  summary            text,
  safety_flags       text[] default '{}',
  availability_note  text,
  reporters          text[] default '{}',        -- contact_ids of everyone who reported this case
  partner_id         text references partners(partner_id),
  pick_reasons       text[] default '{}',
  estimated_cost_eur numeric,
  approval           text,                       -- auto, manager, owner, pending
  slot_id            text references availability(slot_id),
  appointment_start  timestamptz,
  appointment_end    timestamptz,
  job_token          text unique,
  job_card           jsonb,
  result             jsonb,                      -- what is written back to centrix when the loop closes
  created_at         timestamptz default now(),
  closed_at          timestamptz
);

create table if not exists documents (
  document_id text primary key default ('doc_' || substr(md5(random()::text), 1, 8)),
  case_id     text references cases(case_id) on delete cascade,
  type        text check (type in ('photo', 'invoice', 'offer')),
  file_url    text,
  number      text,
  amount_eur  numeric,
  billed_to   text check (billed_to in ('reltix', 'owner')),
  created_at  timestamptz default now()
);

create table if not exists consents (
  consent_id  text primary key default ('cons_' || substr(md5(random()::text), 1, 8)),
  contact_id  text references contacts(contact_id),
  case_id     text references cases(case_id) on delete cascade,
  data_shared text[] not null,
  legal_basis text default 'lease',              -- our assumption: the signed lease covers sharing what a repair needs
  given_at    timestamptz default now(),
  channel     text default 'voice'
);

create table if not exists events (
  event_id    bigint generated always as identity primary key,
  property_id text,
  unit_id     text,
  case_id     text,
  type        text not null,
  actor       text check (actor in ('tenant', 'agent', 'partner', 'manager', 'owner', 'system')),
  channel     text,
  text        text,
  occurred_at timestamptz default now()
);

create index if not exists events_case_idx on events (case_id, occurred_at);
create index if not exists cases_property_idx on cases (property_id, status);

alter table partners     enable row level security;
alter table properties   enable row level security;
alter table units        enable row level security;
alter table contacts     enable row level security;
alter table contracts    enable row level security;
alter table availability enable row level security;
alter table cases        enable row level security;
alter table documents    enable row level security;
alter table consents     enable row level security;
alter table events       enable row level security;

-- File storage for photos and invoices (public URLs keep the demo simple; synthetic data only)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;
