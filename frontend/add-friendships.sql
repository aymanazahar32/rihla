-- Run this in your Supabase SQL Editor

create table if not exists friendships (
  id bigserial primary key,
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamptz not null default now(),
  unique(requester_id, addressee_id)
);

create table if not exists friend_invite_tokens (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table friendships enable row level security;
alter table friend_invite_tokens enable row level security;

create policy "users see own friendships" on friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "users send requests" on friendships
  for insert with check (auth.uid() = requester_id);

create policy "addressee can accept" on friendships
  for update using (auth.uid() = addressee_id);

create policy "users remove friendships" on friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "users manage own tokens" on friend_invite_tokens
  for all using (auth.uid() = user_id);

-- Anyone authenticated can read tokens (needed to accept an invite)
create policy "authenticated read tokens" on friend_invite_tokens
  for select using (auth.role() = 'authenticated');
