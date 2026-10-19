-- Phase 2 foundation: identity-linked learning data and server-owned progress.

create extension if not exists pgcrypto;

create type public.game_id as enum ('physics', 'robo_maze');
create type public.progress_status as enum ('locked', 'unlocked', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'student' check (role = 'student'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_levels (
  id uuid primary key default gen_random_uuid(),
  game_id public.game_id not null,
  level_number integer not null check (level_number between 1 and 35),
  title text not null,
  instruction text not null,
  configuration jsonb not null default '{}'::jsonb,
  is_bonus boolean not null default false,
  bonus_number integer,
  created_at timestamptz not null default now(),
  unique (game_id, level_number),
  check ((is_bonus = false and bonus_number is null) or (is_bonus = true and bonus_number between 1 and 5))
);

create table public.level_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id public.game_id not null,
  level_number integer not null check (level_number between 1 and 35),
  status public.progress_status not null default 'locked',
  completed_at timestamptz,
  best_result jsonb,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id, level_number),
  foreign key (game_id, level_number) references public.game_levels(game_id, level_number)
);

create table public.level_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id public.game_id not null,
  level_number integer not null check (level_number between 1 and 35),
  result text not null check (result in ('success', 'collision', 'miss', 'invalid', 'abandoned')),
  mistake_code text,
  attempt_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (game_id, level_number) references public.game_levels(game_id, level_number)
);

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id public.game_id,
  level_number integer check (level_number between 1 and 35),
  role text not null check (role in ('student', 'tutor')),
  content text not null check (length(content) between 1 and 12000),
  created_at timestamptz not null default now()
);

create table public.bonus_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id public.game_id not null,
  bonus_number integer not null check (bonus_number between 1 and 5),
  problem_statement text,
  hypothesis text,
  plan text,
  solution_attempt text,
  reflection text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id, bonus_number)
);

create index level_attempts_user_game_idx on public.level_attempts(user_id, game_id, level_number);
create index tutor_messages_user_created_idx on public.tutor_messages(user_id, created_at);

alter table public.profiles enable row level security;
alter table public.game_levels enable row level security;
alter table public.level_progress enable row level security;
alter table public.level_attempts enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.bonus_submissions enable row level security;

create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy game_levels_select_authenticated on public.game_levels for select to authenticated using (true);

create policy progress_select_own on public.level_progress for select using (auth.uid() = user_id);
create policy attempts_select_own on public.level_attempts for select using (auth.uid() = user_id);
create policy tutor_select_own on public.tutor_messages for select using (auth.uid() = user_id);

create policy bonus_select_own on public.bonus_submissions for select using (auth.uid() = user_id);
create policy bonus_insert_own on public.bonus_submissions for insert with check (auth.uid() = user_id);
create policy bonus_update_own on public.bonus_submissions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
