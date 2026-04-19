-- Run this once in Supabase SQL Editor after applying supabase-schema.sql.
-- Required for LiveMap to receive live driver location updates.

alter table rides replica identity full;
alter publication supabase_realtime add table rides;
