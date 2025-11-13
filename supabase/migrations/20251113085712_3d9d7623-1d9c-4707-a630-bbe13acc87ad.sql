-- Add user_id to clubs table if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'clubs' 
    and column_name = 'user_id'
  ) then
    alter table public.clubs add column user_id uuid references auth.users on delete cascade;
  end if;
end $$;

-- Update clubs RLS policies
drop policy if exists "Enable all operations for everyone" on public.clubs;
drop policy if exists "Users can view own clubs" on public.clubs;
drop policy if exists "Users can insert own clubs" on public.clubs;
drop policy if exists "Users can update own clubs" on public.clubs;
drop policy if exists "Users can delete own clubs" on public.clubs;

create policy "Users can view own clubs"
  on clubs for select
  using (auth.uid() = user_id);

create policy "Users can insert own clubs"
  on clubs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own clubs"
  on clubs for update
  using (auth.uid() = user_id);

create policy "Users can delete own clubs"
  on clubs for delete
  using (auth.uid() = user_id);

-- Update categories RLS policies
drop policy if exists "Enable all operations for everyone" on public.categories;
drop policy if exists "Users can view own categories" on public.categories;
drop policy if exists "Users can insert own categories" on public.categories;
drop policy if exists "Users can update own categories" on public.categories;
drop policy if exists "Users can delete own categories" on public.categories;

create policy "Users can view own categories"
  on categories for select
  using (
    exists (
      select 1 from clubs
      where clubs.id = categories.club_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can insert own categories"
  on categories for insert
  with check (
    exists (
      select 1 from clubs
      where clubs.id = categories.club_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can update own categories"
  on categories for update
  using (
    exists (
      select 1 from clubs
      where clubs.id = categories.club_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can delete own categories"
  on categories for delete
  using (
    exists (
      select 1 from clubs
      where clubs.id = categories.club_id
      and clubs.user_id = auth.uid()
    )
  );

-- Update players RLS policies
drop policy if exists "Enable all operations for everyone" on public.players;
drop policy if exists "Users can view own players" on public.players;
drop policy if exists "Users can insert own players" on public.players;
drop policy if exists "Users can update own players" on public.players;
drop policy if exists "Users can delete own players" on public.players;

create policy "Users can view own players"
  on players for select
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = players.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can insert own players"
  on players for insert
  with check (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = players.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can update own players"
  on players for update
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = players.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can delete own players"
  on players for delete
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = players.category_id
      and clubs.user_id = auth.uid()
    )
  );

-- Update training_sessions RLS policies
drop policy if exists "Enable all operations for everyone" on public.training_sessions;
drop policy if exists "Users can view own training sessions" on public.training_sessions;
drop policy if exists "Users can insert own training sessions" on public.training_sessions;
drop policy if exists "Users can update own training sessions" on public.training_sessions;
drop policy if exists "Users can delete own training sessions" on public.training_sessions;

create policy "Users can view own training sessions"
  on training_sessions for select
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = training_sessions.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can insert own training sessions"
  on training_sessions for insert
  with check (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = training_sessions.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can update own training sessions"
  on training_sessions for update
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = training_sessions.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can delete own training sessions"
  on training_sessions for delete
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = training_sessions.category_id
      and clubs.user_id = auth.uid()
    )
  );

-- Update speed_tests RLS policies
drop policy if exists "Enable all operations for everyone" on public.speed_tests;
drop policy if exists "Users can view own speed tests" on public.speed_tests;
drop policy if exists "Users can insert own speed tests" on public.speed_tests;
drop policy if exists "Users can update own speed tests" on public.speed_tests;
drop policy if exists "Users can delete own speed tests" on public.speed_tests;

create policy "Users can view own speed tests"
  on speed_tests for select
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = speed_tests.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can insert own speed tests"
  on speed_tests for insert
  with check (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = speed_tests.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can update own speed tests"
  on speed_tests for update
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = speed_tests.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can delete own speed tests"
  on speed_tests for delete
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = speed_tests.category_id
      and clubs.user_id = auth.uid()
    )
  );

-- Update strength_tests RLS policies
drop policy if exists "Enable all operations for everyone" on public.strength_tests;
drop policy if exists "Users can view own strength tests" on public.strength_tests;
drop policy if exists "Users can insert own strength tests" on public.strength_tests;
drop policy if exists "Users can update own strength tests" on public.strength_tests;
drop policy if exists "Users can delete own strength tests" on public.strength_tests;

create policy "Users can view own strength tests"
  on strength_tests for select
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = strength_tests.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can insert own strength tests"
  on strength_tests for insert
  with check (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = strength_tests.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can update own strength tests"
  on strength_tests for update
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = strength_tests.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can delete own strength tests"
  on strength_tests for delete
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = strength_tests.category_id
      and clubs.user_id = auth.uid()
    )
  );

-- Update awcr_tracking RLS policies
drop policy if exists "Enable all operations for everyone" on public.awcr_tracking;
drop policy if exists "Users can view own awcr tracking" on public.awcr_tracking;
drop policy if exists "Users can insert own awcr tracking" on public.awcr_tracking;
drop policy if exists "Users can update own awcr tracking" on public.awcr_tracking;
drop policy if exists "Users can delete own awcr tracking" on public.awcr_tracking;

create policy "Users can view own awcr tracking"
  on awcr_tracking for select
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = awcr_tracking.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can insert own awcr tracking"
  on awcr_tracking for insert
  with check (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = awcr_tracking.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can update own awcr tracking"
  on awcr_tracking for update
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = awcr_tracking.category_id
      and clubs.user_id = auth.uid()
    )
  );

create policy "Users can delete own awcr tracking"
  on awcr_tracking for delete
  using (
    exists (
      select 1 from categories
      join clubs on clubs.id = categories.club_id
      where categories.id = awcr_tracking.category_id
      and clubs.user_id = auth.uid()
    )
  );