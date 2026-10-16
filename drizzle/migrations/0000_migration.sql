create type public.app_role as enum ('admin','user');
create type public.plan_tier as enum ('1m','3m');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- first signed-up user becomes admin
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.handle_first_admin();

create table public.inventory (
  tier plan_tier primary key,
  stock integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.inventory to anon, authenticated;
grant update on public.inventory to authenticated;
grant all on public.inventory to service_role;
alter table public.inventory enable row level security;
create policy "public read stock" on public.inventory for select to anon, authenticated using (true);
create policy "admin update stock" on public.inventory for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.inventory(tier, stock) values ('1m', 84), ('3m', 42);

create table public.license_keys (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  tier plan_tier not null,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_guild text
);
grant select, insert, delete on public.license_keys to authenticated;
grant all on public.license_keys to service_role;
alter table public.license_keys enable row level security;
create policy "admin all keys" on public.license_keys for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.license_keys(code, tier) values ('UDZ5RCM97ZEA','1m'),('BST3K9QX2MLP','3m');

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  key_code text not null,
  tier plan_tier not null,
  guild_id text not null,
  guild_name text,
  nickname text,
  boosts integer not null default 14,
  ip_hash text,
  created_at timestamptz not null default now()
);
grant select on public.redemptions to authenticated;
grant all on public.redemptions to service_role;
alter table public.redemptions enable row level security;
create policy "admin read logs" on public.redemptions for select to authenticated using (public.has_role(auth.uid(),'admin'));