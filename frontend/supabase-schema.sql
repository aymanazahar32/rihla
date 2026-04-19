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
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now()
);
alter table events add column if not exists created_by uuid references profiles(id) on delete set null;
alter table events enable row level security;
create policy "Anyone can read events" on events for select using (true);

drop policy if exists "Organizations can insert events" on events;
create policy "Organizations can insert events" on events for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.user_type = 'organization')
);

drop policy if exists "Organizations can update own events" on events;
create policy "Organizations can update own events" on events for update using (
  created_by = auth.uid()
  and exists (select 1 from profiles p where p.id = auth.uid() and p.user_type = 'organization')
);

-- ─── 3. Masjids ───────────────────────────────────────────────────────────────
create table if not exists masjids (
  id          serial primary key,
  name        text not null,
  address     text not null,
  description text,
  image_url   text,
  lat         double precision,
  lng         double precision,
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

-- ─── 6b. Ride messages (driver ↔ passengers) ─────────────────────────────────
create table if not exists ride_messages (
  id          bigint generated by default as identity primary key,
  ride_id     int not null references rides(id) on delete cascade,
  sender_id   uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz default now()
);
create index if not exists ride_messages_ride_id_idx on ride_messages(ride_id);
alter table ride_messages enable row level security;

drop policy if exists "Ride thread read" on ride_messages;
drop policy if exists "Ride thread write" on ride_messages;

-- Driver, passengers, or any signed-in user for scheduled rides (ask the driver before booking).
create policy "Ride thread read" on ride_messages for select using (
  exists (select 1 from rides r where r.id = ride_messages.ride_id and r.driver_id = auth.uid())
  or exists (select 1 from ride_participants rp where rp.ride_id = ride_messages.ride_id and rp.user_id = auth.uid())
  or (
    auth.uid() is not null
    and exists (select 1 from rides r where r.id = ride_messages.ride_id and r.status = 'scheduled')
  )
);

-- Driver, passengers, or any signed-in non-driver on a scheduled ride (pre-book questions).
create policy "Ride thread write" on ride_messages for insert with check (
  sender_id = auth.uid()
  and (
    exists (select 1 from rides r where r.id = ride_messages.ride_id and r.driver_id = auth.uid())
    or exists (select 1 from ride_participants rp where rp.ride_id = ride_messages.ride_id and rp.user_id = auth.uid())
    or (
      exists (
        select 1 from rides r
        where r.id = ride_messages.ride_id
          and r.status = 'scheduled'
          and r.driver_id is distinct from auth.uid()
      )
    )
  )
);

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

-- ─── 7b. Ride request messages (requester ↔ verified drivers) ────────────────
create table if not exists ride_request_messages (
  id          bigint generated by default as identity primary key,
  ride_request_id int not null references ride_requests(id) on delete cascade,
  sender_id   uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz default now()
);
create index if not exists ride_request_messages_req_id_idx on ride_request_messages(ride_request_id);
alter table ride_request_messages enable row level security;

drop policy if exists "Request thread read" on ride_request_messages;
drop policy if exists "Request thread write" on ride_request_messages;

create policy "Request thread read" on ride_request_messages for select using (
  exists (
    select 1 from ride_requests rr
    where rr.id = ride_request_messages.ride_request_id
      and rr.requester_id = auth.uid()
  )
  or exists (
    select 1 from ride_requests rr
    join profiles p on p.id = auth.uid()
    where rr.id = ride_request_messages.ride_request_id
      and p.user_type = 'driver'
      and p.id_verified is true
      and p.driver_history_checked is true
  )
);

create policy "Request thread write" on ride_request_messages for insert with check (
  sender_id = auth.uid()
  and (
    exists (
      select 1 from ride_requests rr
      where rr.id = ride_request_messages.ride_request_id
        and rr.requester_id = auth.uid()
    )
    or exists (
      select 1 from ride_requests rr
      join profiles p on p.id = auth.uid()
      where rr.id = ride_request_messages.ride_request_id
        and p.user_type = 'driver'
        and p.id_verified is true
        and p.driver_history_checked is true
    )
  )
);

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
  ('MSA Community Iftaar', 'UTA E.H. Hereford University Center', now() + interval '5 days', 'Food', 'Open iftaar for students and Arlington neighbors.'),
  ('Islamic Awareness Week', 'UTA Library Mall', now() + interval '9 days', 'Community', 'Booths, speakers, and meet your Muslim classmates.'),
  ('Charity Basketball Night', 'UTA Maverick Activities Center', now() + interval '12 days', 'Sports', 'Fundraiser games — cheer or play!')
on conflict do nothing;

insert into masjids (name, address, description, lat, lng, fajr, dhuhr, asr, maghrib, isha, jumuah) values
  ('Islamic Center of Arlington', '5000 Tarrant Rd, Arlington, TX 76016', 'Central masjid for Arlington & UTA students — salah rides hub.', 32.6953, -97.1681, '5:30 AM', '1:20 PM', '4:45 PM', '8:00 PM', '9:30 PM', '1:15 PM'),
  ('Dar El-Eman Islamic Center', '1200 E Abram St, Arlington, TX 76010', 'Community masjid near downtown Arlington.', 32.7357, -97.0945, '5:35 AM', '1:25 PM', '4:50 PM', '8:05 PM', '9:35 PM', '1:30 PM'),
  ('Tarrant Islamic Association', '8911 S Collins St, Arlington, TX 76001', 'South Arlington — family programs & Friday prayer.', 32.6288, -97.0886, '5:25 AM', '1:15 PM', '4:40 PM', '7:55 PM', '9:25 PM', '1:00 PM')
on conflict do nothing;

insert into errands (title, description, category, location, scheduled_time) values
  ('Kroger / Halal groceries', 'Weekly staples & halal meat run near Cooper St.', 'Groceries', 'Kroger, 2215 S Fielder Rd, Arlington, TX', now() + interval '2 days'),
  ('UTA campus pickup', 'Carpool from College Park to The Parks mall.', 'Shopping', 'University of Texas at Arlington campus', now() + interval '3 days'),
  ('DFW airport drop-off', 'Early morning ride share to DFW Terminal D.', 'Travel', 'Dallas/Fort Worth International Airport', now() + interval '4 days')
on conflict do nothing;

-- ─── Optional dev reset: remove user-generated rows (run manually in SQL editor).
-- Keeps auth.users and seed events/masjids/errands. Uncomment as needed.
-- delete from ride_request_messages;
-- delete from ride_messages;
-- delete from ride_participants;
-- delete from rides;
-- delete from ride_requests;
-- delete from profiles;

-- ─── Supabase Realtime ─────────────────────────────────────────────────────────
-- Required for LiveMap to receive live driver location updates via postgres_changes.
-- Without REPLICA IDENTITY FULL, Realtime only sends the PK — field values are missing.
alter table rides replica identity full;
alter publication supabase_realtime add table rides;
