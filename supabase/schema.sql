-- SurakshaMap Supabase Database Schema
-- Run this script once in your Supabase Dashboard -> SQL Editor.

create extension if not exists "pgcrypto";

-- 1. User Profiles (synced with Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'citizen' check (role in ('citizen', 'admin')),
  avatar_url text not null default '/src/assets/images/avatar_citizen_profile_1794641736396.jpg',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger to automatically create a profile row on auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role', 'citizen'),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      '/src/assets/images/avatar_citizen_profile_1794641736396.jpg'
    )
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Hazard Reports
create table if not exists public.hazard_reports (
  id text primary key,
  title text not null,
  category text not null,
  description text not null,
  severity text not null check (severity in ('Low', 'Medium', 'High', 'Critical')),
  status text not null default 'Pending' check (status in ('Pending', 'Verified', 'Resolved', 'Rejected')),
  lat double precision not null,
  lng double precision not null,
  address text not null,
  photo_url text,
  reported_at timestamptz not null default now(),
  reported_by text not null,
  reporter_id text not null,
  confirmations integer not null default 1,
  not_present_reports integer not null default 0,
  confirmed_by_user_ids jsonb not null default '[]'::jsonb,
  not_present_by_user_ids jsonb not null default '[]'::jsonb,
  trust_score integer not null default 75,
  ai_verification jsonb
);

alter table public.hazard_reports enable row level security;

drop policy if exists "Hazard reports are publicly readable" on public.hazard_reports;
create policy "Hazard reports are publicly readable"
  on public.hazard_reports for select
  using (true);

drop policy if exists "Authenticated or public community reporting" on public.hazard_reports;
create policy "Authenticated or public community reporting"
  on public.hazard_reports for insert
  with check (true);

drop policy if exists "Community confirmations and moderation updates" on public.hazard_reports;
create policy "Community confirmations and moderation updates"
  on public.hazard_reports for update
  using (true);

drop policy if exists "Reporters and admins can delete hazard reports" on public.hazard_reports;
create policy "Reporters and admins can delete hazard reports"
  on public.hazard_reports for delete
  using (true);

-- 3. Notifications
create table if not exists public.notifications (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  hazard_id text,
  severity text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Notifications readable" on public.notifications;
create policy "Notifications readable"
  on public.notifications for select
  using (user_id is null or auth.uid() = user_id);

drop policy if exists "Notifications insertable" on public.notifications;
create policy "Notifications insertable"
  on public.notifications for insert
  with check (true);

drop policy if exists "Notifications updatable" on public.notifications;
create policy "Notifications updatable"
  on public.notifications for update
  using (user_id is null or auth.uid() = user_id);

drop policy if exists "Notifications deletable" on public.notifications;
create policy "Notifications deletable"
  on public.notifications for delete
  using (user_id is null or auth.uid() = user_id);

-- 4. User Settings
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light',
  nearby_alerts boolean not null default true,
  critical_alerts boolean not null default true,
  verified_updates boolean not null default true,
  location_permission text not null default 'prompt',
  share_approximate_location boolean not null default true,
  anonymous_reporting boolean not null default false,
  alert_radius_km integer not null default 5,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Users read own settings" on public.user_settings;
create policy "Users read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users upsert own settings" on public.user_settings;
create policy "Users upsert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own settings" on public.user_settings;
create policy "Users update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- 5. Contact Messages
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can submit contact messages" on public.contact_messages;
create policy "Anyone can submit contact messages"
  on public.contact_messages for insert
  with check (true);
