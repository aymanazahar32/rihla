-- Run this in your Supabase project: SQL Editor → New query
-- Drop and recreate tables for a clean slate (comment out drops if you want to preserve data)

-- ─── 1. Profiles ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id                      uuid primary key references auth.users on delete cascade,
  name                    text not null,
  user_type               text check (user_type in ('rider', 'driver', 'organization')),
  gender                  text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  age                     int,
  university              text,
  student_id_number       text,
  -- driver fields
  license_plate           text,
  vin_number              text,
  drivers_license_number  text,
  car_make                text,
  car_model               text,
  car_color               text,
  -- org fields
  organization_name       text,
  -- verification
  id_verified             boolean not null default false,
  driver_history_checked  boolean not null default false,
  profile_completed       boolean not null default false,
  created_at              timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read all profiles"  on profiles for select using (true);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- ─── 2. Events ────────────────────────────────────────────────────────────────
create table if not exists events (
  id          serial primary key,
  name        text not null,
  location    text not null,
  date_time   timestamptz not null,
  category    text not null default 'General',
  description text,
  image_url   text,
  created_at  timestamptz default now()
);
alter table events enable row level security;
create policy "Anyone can read events" on events for select using (true);

-- ─── 3. Masjids ───────────────────────────────────────────────────────────────
create table if not exists masjids (
  id          serial primary key,
  name        text not null,
  address     text not null,
  description text,
  image_url   text,
  fajr        text,
  dhuhr       text,
  asr         text,
  maghrib     text,
  isha        text,
  jumuah      text,
  created_at  timestamptz default now()
);
alter table masjids enable row level security;
create policy "Anyone can read masjids" on masjids for select using (true);

-- ─── 4. Errands ───────────────────────────────────────────────────────────────
create table if not exists errands (
  id             serial primary key,
  title          text not null,
  description    text,
  category       text not null default 'Errands',
  location       text not null,
  scheduled_time timestamptz not null,
  created_at     timestamptz default now()
);
alter table errands enable row level security;
create policy "Anyone can read errands" on errands for select using (true);

-- ─── 5. Rides ─────────────────────────────────────────────────────────────────
create table if not exists rides (
  id                  serial primary key,
  context_type        text not null check (context_type in ('event', 'masjid', 'errand')),
  event_id            int references events on delete cascade,
  masjid_id           int references masjids on delete cascade,
  errand_id           int references errands on delete cascade,
  prayer_name         text,
  driver_id           uuid not null references profiles on delete cascade,
  departure_location  text not null,
  departure_time      timestamptz not null,
  seats_total         int not null,
  seats_available     int not null,
  notes               text,
  incentive_label     text,
  status              text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed')),
  -- live tracking
  current_lat         double precision,
  current_lng         double precision,
  destination_lat     double precision,
  destination_lng     double precision,
  eta_minutes         int,
  progress_percent    int default 0,
  created_at          timestamptz default now()
);
alter table rides enable row level security;
create policy "Anyone can read rides"       on rides for select using (true);
create policy "Drivers can insert rides"    on rides for insert with check (auth.uid() = driver_id);
create policy "Drivers can update own rides" on rides for update using (auth.uid() = driver_id);
create policy "Drivers can delete own rides" on rides for delete using (auth.uid() = driver_id);

-- ─── 6. Ride participants ──────────────────────────────────────────────────────
create table if not exists ride_participants (
  ride_id    int references rides on delete cascade,
  user_id    uuid references profiles on delete cascade,
  created_at timestamptz default now(),
  primary key (ride_id, user_id)
);
alter table ride_participants enable row level security;
create policy "Anyone can read participants" on ride_participants for select using (true);
create policy "Users can join rides"         on ride_participants for insert with check (auth.uid() = user_id);
create policy "Users can leave rides"        on ride_participants for delete using (auth.uid() = user_id);

-- ─── 7. Ride requests ─────────────────────────────────────────────────────────
create table if not exists ride_requests (
  id               serial primary key,
  context_type     text not null check (context_type in ('event', 'masjid', 'errand')),
  event_id         int references events on delete cascade,
  masjid_id        int references masjids on delete cascade,
  errand_id        int references errands on delete cascade,
  prayer_name      text,
  requester_id     uuid not null references profiles on delete cascade,
  pickup_location  text not null,
  desired_time     timestamptz not null,
  notes            text,
  created_at       timestamptz default now()
);
alter table ride_requests enable row level security;
create policy "Anyone can read ride requests"    on ride_requests for select using (true);
create policy "Users can insert own requests"    on ride_requests for insert with check (auth.uid() = requester_id);
create policy "Users can delete own requests"    on ride_requests for delete using (auth.uid() = requester_id);

-- ─── 8. RPC functions for seat count ──────────────────────────────────────────
create or replace function decrement_seat(ride_id int)
returns void language plpgsql security definer as $$
begin
  update rides set seats_available = seats_available - 1
  where id = ride_id and seats_available > 0;
end;
$$;

create or replace function increment_seat(ride_id int)
returns void language plpgsql security definer as $$
begin
  update rides set seats_available = seats_available + 1
  where id = ride_id;
end;
$$;

-- ─── 9. Sample data ───────────────────────────────────────────────────────────
insert into events (name, location, date_time, category, description) values
  ('MSA Iftaar Dinner', 'Student Union Ballroom', now() + interval '5 days', 'Food', 'Open community iftaar dinner. Everyone welcome.'),
  ('Islamic Awareness Week Kickoff', 'Main Quad', now() + interval '9 days', 'Tech', 'Talks, booths, and networking for the campus Muslim community.'),
  ('Charity Basketball Tournament', 'Rec Center Court B', now() + interval '12 days', 'Sports', 'Raise funds for local families. Sign up or come cheer!')
on conflict do nothing;

insert into masjids (name, address, description, fajr, dhuhr, asr, maghrib, isha, jumuah) values
  ('Dar Al-Hijrah', '3159 Row St, Falls Church, VA 22044', 'One of the largest mosques in the DC metro area.', '5:15 AM', '1:15 PM', '4:30 PM', '7:45 PM', '9:15 PM', '1:30 PM'),
  ('ADAMS Center', '46903 Sugarland Rd, Sterling, VA 20164', 'All Dulles Area Muslim Society — family-friendly masjid.', '5:20 AM', '1:20 PM', '4:35 PM', '7:50 PM', '9:20 PM', '1:00 PM')
on conflict do nothing;

insert into errands (title, description, category, location, scheduled_time) values
  ('Costco run', 'Bulk grocery trip — splitting cart space with others.', 'Groceries', 'Costco Warehouse, Fairfax VA', now() + interval '2 days'),
  ('Airport drop-off', 'Heading to IAD Friday morning, room for 2 more.', 'Travel', 'Dulles International Airport', now() + interval '4 days'),
  ('Halal market run', 'Weekly trip to Al-Manar Supermarket.', 'Shopping', '7106 Leesburg Pike, Falls Church VA', now() + interval '3 days')
on conflict do nothing;
