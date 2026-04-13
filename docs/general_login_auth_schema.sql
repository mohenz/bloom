create extension if not exists pgcrypto;

create or replace function public.set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.normalize_app_user_email()
returns trigger
language plpgsql
as $$
begin
  new.email = lower(trim(new.email));
  return new;
end;
$$;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  display_name text,
  status text not null default 'active' check (status in ('active', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists app_users_email_lower_idx
  on public.app_users (lower(email));

drop trigger if exists trg_normalize_app_user_email on public.app_users;
create trigger trg_normalize_app_user_email
before insert or update on public.app_users
for each row
execute function public.normalize_app_user_email();

drop trigger if exists trg_set_app_users_timestamp on public.app_users;
create trigger trg_set_app_users_timestamp
before update on public.app_users
for each row
execute function public.set_timestamp();

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  last_accessed_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  user_agent text,
  ip_address text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists auth_sessions_user_id_idx
  on public.auth_sessions (user_id);

create index if not exists auth_sessions_expires_at_idx
  on public.auth_sessions (expires_at);

drop trigger if exists trg_set_auth_sessions_timestamp on public.auth_sessions;
create trigger trg_set_auth_sessions_timestamp
before update on public.auth_sessions
for each row
execute function public.set_timestamp();

alter table public.app_users enable row level security;
alter table public.auth_sessions enable row level security;

revoke all on public.app_users from anon, authenticated;
revoke all on public.auth_sessions from anon, authenticated;

comment on table public.app_users is 'Bloom 일반 로그인 사용자 테이블';
comment on table public.auth_sessions is 'Bloom 일반 로그인 세션 테이블';

-- 초기 관리자 계정 예시
-- 아래 password_hash 는 scripts/generate-password-hash.mjs 로 생성한 값을 넣으세요.
--
-- insert into public.app_users (email, password_hash, display_name)
-- values (
--   'admin@example.com',
--   'scrypt$16384$8$1$<salt>$<hash>',
--   'Bloom Admin'
-- );
