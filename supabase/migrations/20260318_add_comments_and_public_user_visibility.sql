-- Add comments table and policies for public feed/comment display names.

create table if not exists public.comments (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete cascade,
    content text not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint comments_content_not_blank check (char_length(trim(content)) > 0)
);

alter table public.comments add column if not exists post_id uuid references public.posts (id) on delete cascade;
alter table public.comments add column if not exists user_id uuid references public.users (id) on delete cascade;
alter table public.comments add column if not exists content text;
alter table public.comments add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.comments add column if not exists updated_at timestamptz not null default timezone('utc', now());

create index if not exists comments_post_created_idx on public.comments (post_id, created_at asc);

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
before update on public.comments
for each row
execute function public.set_updated_at();

alter table public.comments enable row level security;

drop policy if exists "Users are viewable by authenticated members" on public.users;
drop policy if exists "Users are viewable by feed visitors" on public.users;
create policy "Users are viewable by feed visitors"
on public.users
for select
to anon, authenticated
using (true);

drop policy if exists "Comments are public for active posts" on public.comments;
create policy "Comments are public for active posts"
on public.comments
for select
to anon, authenticated
using (
    exists (
        select 1
        from public.posts
        where posts.id = comments.post_id
          and (posts.status = 'active' or auth.uid() = posts.user_id)
    )
);

drop policy if exists "Users can create comments as themselves" on public.comments;
create policy "Users can create comments as themselves"
on public.comments
for insert
to authenticated
with check (
    auth.uid() = user_id
    and exists (
        select 1
        from public.posts
        where posts.id = comments.post_id
          and posts.status = 'active'
    )
);

drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments"
on public.comments
for delete
to authenticated
using (auth.uid() = user_id);
