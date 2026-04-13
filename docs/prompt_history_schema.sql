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

create table if not exists public.prompt_histories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  selections jsonb not null default '{}'::jsonb,
  prompt_output text not null default '',
  sentence_text text,
  translated_text text,
  english_sentence_text text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists prompt_histories_user_created_at_idx
  on public.prompt_histories (user_id, created_at desc);

drop trigger if exists trg_set_prompt_histories_timestamp on public.prompt_histories;
create trigger trg_set_prompt_histories_timestamp
before update on public.prompt_histories
for each row
execute function public.set_timestamp();

alter table public.prompt_histories enable row level security;

revoke all on public.prompt_histories from anon, authenticated;

comment on table public.prompt_histories is 'Bloom Prompt History 테이블';
