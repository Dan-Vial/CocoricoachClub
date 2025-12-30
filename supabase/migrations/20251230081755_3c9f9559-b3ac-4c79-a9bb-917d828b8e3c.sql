-- Backfill memberships so club owners can access templates/planning/messaging policies
insert into public.club_members (club_id, user_id, role, invited_by)
select c.id, c.user_id, 'admin'::app_role, null
from public.clubs c
on conflict (club_id, user_id) do nothing;

insert into public.category_members (category_id, user_id, role, invited_by)
select cat.id, cl.user_id, 'admin'::app_role, null
from public.categories cat
join public.clubs cl on cl.id = cat.club_id
on conflict (category_id, user_id) do nothing;

-- Auto-add club owner as admin member when a club is created
create or replace function public.add_club_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.club_members (club_id, user_id, role, invited_by)
  values (new.id, new.user_id, 'admin'::app_role, null)
  on conflict (club_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_add_club_owner_membership on public.clubs;
create trigger trg_add_club_owner_membership
after insert on public.clubs
for each row
execute function public.add_club_owner_membership();

-- Auto-add club owner as admin member when a category is created
create or replace function public.add_category_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select user_id into owner_id
  from public.clubs
  where id = new.club_id;

  if owner_id is not null then
    insert into public.category_members (category_id, user_id, role, invited_by)
    values (new.id, owner_id, 'admin'::app_role, null)
    on conflict (category_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_add_category_owner_membership on public.categories;
create trigger trg_add_category_owner_membership
after insert on public.categories
for each row
execute function public.add_category_owner_membership();
