create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id public.game_id not null,
  level_number integer not null,
  mistake_category text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  explanation text not null,
  hint text not null,
  next_question text not null,
  model text not null,
  created_at timestamptz not null default now(),
  foreign key (game_id, level_number)
    references public.game_levels(game_id, level_number)
);
create index ai_insights_student_game_idx on public.ai_insights(user_id, game_id, created_at desc);
alter table public.ai_insights enable row level security;
create policy ai_insights_select_own on public.ai_insights for select using (auth.uid() = user_id);
create policy ai_insights_insert_own on public.ai_insights for insert with check (auth.uid() = user_id);
