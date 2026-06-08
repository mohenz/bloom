create table if not exists public.story_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists story_groups_user_id_idx on public.story_groups (user_id);

create table if not exists public.story_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  group_id uuid references public.story_groups(id) on delete set null,
  parent_id uuid references public.story_documents(id) on delete set null,
  name text not null,
  content text not null default '',
  path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists story_documents_user_id_idx on public.story_documents (user_id);
create index if not exists story_documents_group_id_idx on public.story_documents (group_id);
create index if not exists story_documents_parent_id_idx on public.story_documents (parent_id);
create index if not exists story_documents_sort_order_idx on public.story_documents (group_id, sort_order);

create table if not exists public.story_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  source_id uuid not null references public.story_documents(id) on delete cascade,
  target_id uuid not null references public.story_documents(id) on delete cascade,
  link_type text not null default 'reference',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists story_references_user_id_idx on public.story_references (user_id);
create index if not exists story_references_source_id_idx on public.story_references (source_id);
create index if not exists story_references_target_id_idx on public.story_references (target_id);

-- Timestamps triggers
drop trigger if exists trg_set_story_groups_timestamp on public.story_groups;
create trigger trg_set_story_groups_timestamp
before update on public.story_groups
for each row
execute function public.set_timestamp();

drop trigger if exists trg_set_story_documents_timestamp on public.story_documents;
create trigger trg_set_story_documents_timestamp
before update on public.story_documents
for each row
execute function public.set_timestamp();

-- RLS Enable
alter table public.story_groups enable row level security;
alter table public.story_documents enable row level security;
alter table public.story_references enable row level security;

-- Revoke default public access
revoke all on public.story_groups from anon, authenticated;
revoke all on public.story_documents from anon, authenticated;
revoke all on public.story_references from anon, authenticated;

comment on table public.story_groups is 'Bloom 스토리 그룹(프로젝트/시리즈) 테이블';
comment on table public.story_documents is 'Bloom 스토리 문서 테이블';
comment on table public.story_references is 'Bloom 스토리 문서 간 연결 참조 테이블';
