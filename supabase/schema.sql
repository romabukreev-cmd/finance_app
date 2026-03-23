-- Финансы MVP: базовая схема для Supabase/PostgreSQL

create extension if not exists pgcrypto;

do $$ begin
  create type public.account_type as enum ('asset', 'debt');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.category_kind as enum ('income', 'expense');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_type as enum ('income', 'expense', 'transfer');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.transfer_direction as enum ('out', 'in');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 1),
  type public.account_type not null,
  start_balance numeric(14,2) not null default 0,
  start_date date not null default current_date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  kind public.category_kind not null,
  is_system boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists accounts_user_name_unique
  on public.accounts (user_id, lower(name));

create unique index if not exists categories_user_kind_name_unique
  on public.categories (user_id, kind, lower(name));

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_date date not null,
  type public.transaction_type not null,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  signed_amount numeric(14,2) not null,
  transfer_id uuid,
  transfer_direction public.transfer_direction,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (
      type = 'income'
      and signed_amount > 0
      and category_id is not null
      and transfer_id is null
      and transfer_direction is null
    ) or (
      type = 'expense'
      and signed_amount < 0
      and category_id is not null
      and transfer_id is null
      and transfer_direction is null
    ) or (
      type = 'transfer'
      and category_id is null
      and transfer_id is not null
      and transfer_direction is not null
      and (
        (transfer_direction = 'out' and signed_amount < 0) or
        (transfer_direction = 'in' and signed_amount > 0)
      )
    )
  )
);

create unique index if not exists transactions_transfer_pair_unique
  on public.transactions (user_id, transfer_id, transfer_direction)
  where type = 'transfer';

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);

create index if not exists transactions_user_type_idx
  on public.transactions (user_id, type);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_accounts_updated_at on public.accounts;
create trigger trg_accounts_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create or replace function public.ensure_other_categories(p_user_id uuid)
returns void as $$
begin
  insert into public.categories (user_id, name, kind, is_system)
  select p_user_id, 'Прочее', 'income', true
  where not exists (
    select 1
    from public.categories c
    where c.user_id = p_user_id
      and c.kind = 'income'
      and lower(c.name) = 'прочее'
  );

  insert into public.categories (user_id, name, kind, is_system)
  select p_user_id, 'Прочее', 'expense', true
  where not exists (
    select 1
    from public.categories c
    where c.user_id = p_user_id
      and c.kind = 'expense'
      and lower(c.name) = 'прочее'
  );
end;
$$ language plpgsql security definer;

create or replace function public.reassign_transactions_to_other_before_delete()
returns trigger as $$
declare
  other_category_id uuid;
begin
  if old.is_system then
    raise exception 'Системную категорию удалять нельзя';
  end if;

  select id
    into other_category_id
    from public.categories
   where user_id = old.user_id
     and kind = old.kind
     and is_system = true
   limit 1;

  if other_category_id is null then
    insert into public.categories (user_id, name, kind, is_system)
    values (old.user_id, 'Прочее', old.kind, true)
    returning id into other_category_id;
  end if;

  update public.transactions
     set category_id = other_category_id
   where category_id = old.id;

  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_categories_reassign_before_delete on public.categories;
create trigger trg_categories_reassign_before_delete
before delete on public.categories
for each row execute function public.reassign_transactions_to_other_before_delete();

create or replace view public.account_balances as
select
  a.id,
  a.user_id,
  a.name,
  a.type,
  a.start_balance,
  a.start_date,
  coalesce(sum(t.signed_amount), 0) as operations_sum,
  a.start_balance + coalesce(sum(t.signed_amount), 0) as current_balance
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy if not exists "accounts_select_own"
  on public.accounts for select using (auth.uid() = user_id);
create policy if not exists "accounts_insert_own"
  on public.accounts for insert with check (auth.uid() = user_id);
create policy if not exists "accounts_update_own"
  on public.accounts for update using (auth.uid() = user_id);
create policy if not exists "accounts_delete_own"
  on public.accounts for delete using (auth.uid() = user_id);

create policy if not exists "categories_select_own"
  on public.categories for select using (auth.uid() = user_id);
create policy if not exists "categories_insert_own"
  on public.categories for insert with check (auth.uid() = user_id);
create policy if not exists "categories_update_own"
  on public.categories for update using (auth.uid() = user_id);
create policy if not exists "categories_delete_own"
  on public.categories for delete using (auth.uid() = user_id);

create policy if not exists "transactions_select_own"
  on public.transactions for select using (auth.uid() = user_id);
create policy if not exists "transactions_insert_own"
  on public.transactions for insert with check (auth.uid() = user_id);
create policy if not exists "transactions_update_own"
  on public.transactions for update using (auth.uid() = user_id);
create policy if not exists "transactions_delete_own"
  on public.transactions for delete using (auth.uid() = user_id);
