-- Noah Supabase schema
-- Run in the Supabase SQL editor (Database → SQL → New query) to bootstrap.
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  grade_level text,
  voice_preference text,
  speaking_speed real,
  mastery_threshold int,
  timer_seconds int,
  theme text,
  sentences_read int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists children_user_id_idx on children(user_id);

create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  word text not null,
  status text not null default 'new', -- new | learning | mastered
  sessions_seen_count int default 0,
  mastery_correct_count int default 0,
  total_attempts int default 0,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  mastered_at timestamptz,
  unique (child_id, word)
);
create index if not exists words_child_id_idx on words(child_id);
create index if not exists words_user_id_idx on words(user_id);
create index if not exists words_status_idx on words(child_id, status);

create table if not exists reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  book_id uuid,
  book_title text,
  raw_text text,
  cleaned_text text,
  new_words_count int default 0,
  total_words_count int default 0,
  image_urls text[] default '{}',
  created_at timestamptz default now()
);
create index if not exists sessions_child_id_idx on reading_sessions(child_id);
create index if not exists sessions_user_id_idx on reading_sessions(user_id);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references children(id) on delete cascade,
  title text not null,
  author text,
  grade_level text,
  cover_image_url text,
  custom_cover_url text,
  source_type text default 'custom', -- custom | preset
  is_preset bool default false,
  is_beta bool default false,
  words text[] default '{}',
  word_count int default 0,
  unlock_count int default 0,
  amazon_url text,
  bookshop_url text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists books_user_id_idx on books(user_id);
create index if not exists books_child_id_idx on books(child_id);

create table if not exists child_book_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  added_at timestamptz default now(),
  unlocked_words text[] default '{}',
  unique (child_id, book_id)
);
create index if not exists progress_child_id_idx on child_book_progress(child_id);

-- Row-level security: each user only sees their own rows.
alter table children enable row level security;
alter table words enable row level security;
alter table reading_sessions enable row level security;
alter table books enable row level security;
alter table child_book_progress enable row level security;

drop policy if exists "own children" on children;
create policy "own children" on children for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own words" on words;
create policy "own words" on words for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own sessions" on reading_sessions;
create policy "own sessions" on reading_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own books" on books;
create policy "own books" on books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own progress" on child_book_progress;
create policy "own progress" on child_book_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_children_updated on children;
create trigger trg_children_updated before update on children
  for each row execute function set_updated_at();

drop trigger if exists trg_books_updated on books;
create trigger trg_books_updated before update on books
  for each row execute function set_updated_at();
