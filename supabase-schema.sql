-- Parties
create table parties (
  id uuid primary key default gen_random_uuid(),
  host_id text not null,
  birthday_person_name text not null,
  birthday_person_photo text,
  party_title text not null,
  party_date date not null,
  theme text not null default 'gondolieri',
  adult_count int not null default 0,
  kid_count int not null default 0,
  invite_code text unique not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'ended')),
  host_notes text,
  created_at timestamptz default now()
);

-- Guests
create table guests (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references parties(id) on delete cascade not null,
  name text not null,
  email text not null,
  photo text,
  role_name text,
  role_description text,
  mission_title text,
  mission_instructions text,
  mission_difficulty text check (mission_difficulty in ('easy', 'medium', 'hard')),
  proof_required boolean not null default false,
  proof_type text check (proof_type in ('photo', 'video')),
  mission_status text not null default 'in_progress' check (mission_status in ('in_progress', 'submitted', 'approved')),
  submission_url text,
  submission_note text,
  memory_appreciation text,
  memory_favorite_moment text,
  memory_future_prediction text,
  is_host boolean not null default false,
  created_at timestamptz default now(),
  unique(party_id, email)
);

-- Children (attached to a guest/parent)
create table children (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references guests(id) on delete cascade not null,
  party_id uuid references parties(id) on delete cascade not null,
  name text not null,
  age int not null,
  role_name text,
  role_description text,
  created_at timestamptz default now()
);

-- Bonus missions
create table bonus_missions (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references parties(id) on delete cascade not null,
  title text not null,
  instructions text not null,
  assigned_to text not null default 'all' check (assigned_to in ('all', 'selected', 'one')),
  guest_ids uuid[] default '{}',
  proof_required boolean not null default false,
  created_at timestamptz default now()
);

-- Birthday newspaper
create table birthday_newspapers (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references parties(id) on delete cascade not null unique,
  title text not null,
  generated_content jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz default now()
);

-- Storage bucket for uploads
insert into storage.buckets (id, name, public) values ('party-media', 'party-media', true);

-- RLS: enable row level security
alter table parties enable row level security;
alter table guests enable row level security;
alter table children enable row level security;
alter table bonus_missions enable row level security;
alter table birthday_newspapers enable row level security;

-- Open policies for now (tighten before going public)
create policy "allow all" on parties for all using (true) with check (true);
create policy "allow all" on guests for all using (true) with check (true);
create policy "allow all" on children for all using (true) with check (true);
create policy "allow all" on bonus_missions for all using (true) with check (true);
create policy "allow all" on birthday_newspapers for all using (true) with check (true);
create policy "allow all uploads" on storage.objects for all using (bucket_id = 'party-media') with check (bucket_id = 'party-media');
