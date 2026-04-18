-- Run this in your Supabase project: SQL Editor → New query

-- 1. Profiles (mirrors auth.users with extra fields)
create table if not exists profiles (
  id        uuid primary key references auth.users on delete cascade,
  name      text not null,
  role      text not null check (role in ('driver', 'passenger')),
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read all profiles" on profiles for select using (true);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- 2. Events
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
-- Only insert via service role (admin) for now

-- 3. Rides
create table if not exists rides (
  id                 serial primary key,
  event_id           int not null references events on delete cascade,
  driver_id          uuid not null references profiles on delete cascade,
  departure_location text not null,
  departure_time     timestamptz not null,
  seats_total        int not null,
  seats_available    int not null,
  notes              text,
  incentive_label    text,
  created_at         timestamptz default now()
);
alter table rides enable row level security;
create policy "Anyone can read rides" on rides for select using (true);
create policy "Drivers can insert rides" on rides for insert with check (auth.uid() = driver_id);
create policy "Drivers can delete own rides" on rides for delete using (auth.uid() = driver_id);

-- 4. Ride participants
create table if not exists ride_participants (
  ride_id    int references rides on delete cascade,
  user_id    uuid references profiles on delete cascade,
  created_at timestamptz default now(),
  primary key (ride_id, user_id)
);
alter table ride_participants enable row level security;
create policy "Anyone can read participants" on ride_participants for select using (true);
create policy "Users can join rides" on ride_participants for insert with check (auth.uid() = user_id);
create policy "Users can leave rides" on ride_participants for delete using (auth.uid() = user_id);

-- 5. RPC functions for seat count (avoids race conditions)
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

-- 6. Seed some sample events (optional — delete if you want to add your own)
insert into events (name, location, date_time, category, description) values
  ('Jumah at Dar Al-Hijrah', 'Dar Al-Hijrah Islamic Center, Falls Church VA', now() + interval '3 days', 'Religious', 'Weekly Friday prayer. Khutbah starts at 1:15 PM.'),
  ('Community Iftaar Dinner', 'ADAMS Center, Sterling VA', now() + interval '7 days', 'Community', 'Open community iftaar. Bring your family.'),
  ('Islamic Conference 2025', 'Dulles Expo Center, Chantilly VA', now() + interval '14 days', 'Education', 'Annual regional conference with scholars and workshops.');
