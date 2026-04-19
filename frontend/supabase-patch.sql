-- ═══════════════════════════════════════════════════════════════════════════════
-- Rihla — patch + mock data script
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. ride_requests: add missing columns ────────────────────────────────────
-- The app code reads/writes status, accepted_by, pickup_lat, pickup_lng
-- but the original schema didn't include them.

alter table ride_requests
  add column if not exists status      text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  add column if not exists accepted_by uuid references profiles(id) on delete set null,
  add column if not exists pickup_lat  double precision,
  add column if not exists pickup_lng  double precision;


-- ─── 2. masjids: fix RLS so upsert (insert + select) works for all users ─────
-- The existing SELECT + INSERT policies are fine.
-- Add an UPDATE policy so the conflict-resolution path doesn't silently fail.

drop policy if exists "Anyone can update masjids" on masjids;
create policy "Anyone can update masjids" on masjids for update using (true) with check (true);


-- ─── 3. rides: add missing rating columns (used in ride-detail / my-rides) ───
alter table rides
  add column if not exists rider_rating    int check (rider_rating between 1 and 5),
  add column if not exists rider_comment   text,
  add column if not exists driver_rating   int check (driver_rating between 1 and 5),
  add column if not exists driver_comment  text;


-- ─── 4. ride_participants: add completed flag (used in RideRatingModal) ───────
alter table ride_participants
  add column if not exists rating   int check (rating between 1 and 5),
  add column if not exists comment  text;


-- ─── 5. Extended masjid seed data ────────────────────────────────────────────
-- Includes google_place_id values so GPS-mode masjid clicks resolve to a real
-- DB id without needing to INSERT (no auth required).

insert into masjids (name, address, description, google_place_id, lat, lng, fajr, dhuhr, asr, maghrib, isha, jumuah) values
  ('Islamic Center of Arlington',    '5000 Tarrant Rd, Arlington, TX 76016',         'Central masjid for Arlington & UTA students.', 'ChIJ_RmWFZBiToYRlFIuFwxVmGQ', 32.6953, -97.1681, '5:30 AM', '1:20 PM', '4:45 PM', '8:00 PM', '9:30 PM', '1:15 PM'),
  ('Dar El-Eman Islamic Center',     '1200 E Abram St, Arlington, TX 76010',         'Community masjid near downtown Arlington.',    'ChIJr5sqdBFkToYR6t2DXR3bFoI', 32.7357, -97.0945, '5:35 AM', '1:25 PM', '4:50 PM', '8:05 PM', '9:35 PM', '1:30 PM'),
  ('Tarrant Islamic Association',    '8911 S Collins St, Arlington, TX 76001',        'South Arlington — family programs & Jumu''ah.','ChIJW_-f7DVdToYR-z37kS6gOHM', 32.6288, -97.0886, '5:25 AM', '1:15 PM', '4:40 PM', '7:55 PM', '9:25 PM', '1:00 PM'),
  ('Muslim American Society Dallas', '7820 Abrams Rd, Dallas, TX 75231',              'Large masjid with full program calendar.',     'ChIJp5WM2iGZToYRMqEfh_jBgaY', 32.8687, -96.7386, '5:28 AM', '1:22 PM', '4:47 PM', '8:02 PM', '9:32 PM', '1:20 PM'),
  ('ADAMS Mosque Irving',            '2840 Story Rd, Irving, TX 75038',               'ADAMS Center serving Irving & Las Colinas.',  'ChIJSx5AZCBdToYRqy5j0MCLnpw', 32.8712, -96.9891, '5:32 AM', '1:24 PM', '4:49 PM', '8:04 PM', '9:34 PM', '1:10 PM'),
  ('Grand Prairie Islamic Society',  '2020 W Pioneer Pkwy, Grand Prairie, TX 75051', 'Serves the Grand Prairie Muslim community.',  'ChIJLb8hJtBdToYRVs6n9SLdAxo', 32.7537, -97.0086, '5:31 AM', '1:21 PM', '4:46 PM', '8:01 PM', '9:31 PM', '1:25 PM')
on conflict (google_place_id) do update
  set name       = excluded.name,
      address    = excluded.address,
      lat        = excluded.lat,
      lng        = excluded.lng,
      fajr       = excluded.fajr,
      dhuhr      = excluded.dhuhr,
      asr        = excluded.asr,
      maghrib    = excluded.maghrib,
      isha       = excluded.isha,
      jumuah     = excluded.jumuah;

-- Also update existing rows that have no google_place_id yet
update masjids set google_place_id = 'ChIJ_RmWFZBiToYRlFIuFwxVmGQ'
  where name = 'Islamic Center of Arlington' and google_place_id is null;
update masjids set google_place_id = 'ChIJr5sqdBFkToYR6t2DXR3bFoI'
  where name = 'Dar El-Eman Islamic Center' and google_place_id is null;
update masjids set google_place_id = 'ChIJW_-f7DVdToYR-z37kS6gOHM'
  where name = 'Tarrant Islamic Association' and google_place_id is null;


-- ─── 6. Demo auth users + profiles for mock rides ────────────────────────────
-- Fixed UUIDs so re-running is idempotent.

do $$
declare
  driver1 uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
  driver2 uuid := 'aaaaaaaa-0002-0002-0002-000000000002';
  rider1  uuid := 'aaaaaaaa-0003-0003-0003-000000000003';
begin

  -- Insert into auth.users (bypasses normal auth flow; for demo only)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, confirmation_token, email_change_confirm_status)
  values
    (driver1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo.driver1@uta.edu', '', now(), now(), now(), '', 0),
    (driver2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo.driver2@uta.edu', '', now(), now(), now(), '', 0),
    (rider1,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo.rider1@uta.edu',  '', now(), now(), now(), '', 0)
  on conflict (id) do nothing;

  -- Profiles
  insert into profiles (id, name, user_type, gender, profile_completed,
    id_verified, driver_history_checked, car_make, car_model, car_color, license_plate)
  values
    (driver1, 'Ahmed Al-Rashid', 'driver', 'male', true, true, true,
     'Toyota', 'Camry', 'Silver', 'TX-DEMO1'),
    (driver2, 'Yusuf Ibrahim',   'driver', 'male', true, true, true,
     'Honda',  'Civic', 'White',  'TX-DEMO2'),
    (rider1,  'Fatimah Nasser',  'rider',  'female', true, true, false,
     null, null, null, null)
  on conflict (id) do update
    set name                  = excluded.name,
        user_type             = excluded.user_type,
        gender                = excluded.gender,
        profile_completed     = excluded.profile_completed,
        id_verified           = excluded.id_verified,
        driver_history_checked = excluded.driver_history_checked,
        car_make              = excluded.car_make,
        car_model             = excluded.car_model,
        car_color             = excluded.car_color,
        license_plate         = excluded.license_plate;

end $$;


-- ─── 7. Mock rides ────────────────────────────────────────────────────────────
-- Rides for each masjid, spread across upcoming prayer slots.

do $$
declare
  driver1  uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
  driver2  uuid := 'aaaaaaaa-0002-0002-0002-000000000002';
  ica_id   int;
  dee_id   int;
  tia_id   int;
begin
  select id into ica_id from masjids where name = 'Islamic Center of Arlington' limit 1;
  select id into dee_id from masjids where name = 'Dar El-Eman Islamic Center'  limit 1;
  select id into tia_id from masjids where name = 'Tarrant Islamic Association'  limit 1;

  insert into rides
    (context_type, masjid_id, prayer_name, driver_id,
     departure_location, departure_time, seats_total, seats_available, status, notes)
  values
    -- ICA rides
    ('masjid', ica_id, 'Isha',    driver1, 'UTA Campus (Parking Lot 9)', now() + interval '5 hours',   4, 3, 'scheduled', 'Leaving from the library side. Text when ready.'),
    ('masjid', ica_id, 'Fajr',    driver1, 'Vandergriff Park',           now() + interval '14 hours',  3, 2, 'scheduled', 'Punctual departure — please be on time.'),
    ('masjid', ica_id, 'Jumu''ah',driver2, 'UTA Engineering Lot',        now() + interval '2 days',    4, 4, 'scheduled', 'Jumu''ah carpool, back by 2:30 PM insha''Allah.'),
    -- Dar El-Eman rides
    ('masjid', dee_id, 'Maghrib', driver2, 'Collins St & Park Row',      now() + interval '3 hours',   3, 2, 'scheduled', null),
    ('masjid', dee_id, 'Dhuhr',   driver1, 'UTA Stadium Lot',            now() + interval '1 day',     4, 3, 'scheduled', 'Quick trip — back within the hour.'),
    -- TIA rides
    ('masjid', tia_id, 'Isha',    driver2, 'Grand Prairie Transit Center',now() + interval '6 hours',  4, 2, 'scheduled', 'Stopping at Buc-ee''s on the way back.'),
    ('masjid', tia_id, 'Jumu''ah',driver1, 'UTA Parking Garage South',   now() + interval '3 days',   4, 4, 'scheduled', null)
  on conflict do nothing;

end $$;


-- ─── 8. Mock ride requests ───────────────────────────────────────────────────

do $$
declare
  rider1  uuid := 'aaaaaaaa-0003-0003-0003-000000000003';
  ica_id  int;
  dee_id  int;
begin
  select id into ica_id from masjids where name = 'Islamic Center of Arlington' limit 1;
  select id into dee_id from masjids where name = 'Dar El-Eman Islamic Center'  limit 1;

  insert into ride_requests
    (context_type, masjid_id, prayer_name, requester_id,
     pickup_location, desired_time, status, notes)
  values
    ('masjid', ica_id, 'Isha',    rider1, 'UTA Recreation Center',      now() + interval '5 hours',  'pending', 'Happy to split gas.'),
    ('masjid', ica_id, 'Fajr',    rider1, 'Palo Duro Canyon Hall (UTA)', now() + interval '13 hours', 'pending', null),
    ('masjid', dee_id, 'Maghrib', rider1, 'W Mitchell St stop',         now() + interval '3 hours',  'pending', 'Only need a ride there, can get back on my own.')
  on conflict do nothing;

end $$;


-- ─── 9. Realtime (re-run safe) ───────────────────────────────────────────────
alter table rides replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table rides;
  exception when others then
    null; -- already in publication
  end;
end $$;


-- ─── Done ─────────────────────────────────────────────────────────────────────
-- To verify:
--   select count(*) from masjids;          -- should be >= 6
--   select count(*) from rides;            -- should be >= 7
--   select count(*) from ride_requests;    -- should be >= 3
--   select column_name from information_schema.columns
--     where table_name = 'ride_requests';  -- should include status, accepted_by, pickup_lat, pickup_lng
