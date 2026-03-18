create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

set search_path = public, extensions;

do $$
begin
    if not exists (
        select 1
        from pg_type
        where typname = 'post_type'
          and typnamespace = 'public'::regnamespace
    ) then
        create type public.post_type as enum ('borrow', 'giveaway', 'sos', 'service');
    end if;

    if not exists (
        select 1
        from pg_type
        where typname = 'post_status'
          and typnamespace = 'public'::regnamespace
    ) then
        create type public.post_status as enum ('active', 'completed', 'cancelled');
    end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

create table if not exists public.users (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text,
    phone text unique,
    avatar_url text,
    location geography(Point, 4326),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.posts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users (id) on delete cascade,
    type public.post_type not null,
    title text not null,
    description text not null,
    image_url text,
    location geography(Point, 4326) not null,
    latitude double precision,
    longitude double precision,
    status public.post_status not null default 'active',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint posts_title_not_blank check (char_length(trim(title)) > 0),
    constraint posts_description_not_blank check (char_length(trim(description)) > 0)
);

create table if not exists public.chats (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts (id) on delete cascade,
    requester_id uuid not null references public.users (id) on delete cascade,
    owner_id uuid not null references public.users (id) on delete cascade,
    created_at timestamptz not null default timezone('utc', now()),
    constraint chats_requester_owner_different check (requester_id <> owner_id),
    constraint chats_unique_requester_per_post unique (post_id, requester_id)
);

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    chat_id uuid not null references public.chats (id) on delete cascade,
    sender_id uuid not null references public.users (id) on delete cascade,
    content text not null,
    created_at timestamptz not null default timezone('utc', now()),
    constraint messages_content_not_blank check (char_length(trim(content)) > 0)
);

create table if not exists public.comments (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete cascade,
    content text not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint comments_content_not_blank check (char_length(trim(content)) > 0)
);

alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists location geography(Point, 4326);
alter table public.users drop column if exists karma_score;
alter table public.users add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.users add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.posts add column if not exists user_id uuid references public.users (id) on delete cascade;
alter table public.posts add column if not exists type public.post_type;
alter table public.posts add column if not exists title text;
alter table public.posts add column if not exists description text;
alter table public.posts add column if not exists image_url text;
alter table public.posts add column if not exists location geography(Point, 4326);
alter table public.posts add column if not exists latitude double precision;
alter table public.posts add column if not exists longitude double precision;
alter table public.posts add column if not exists status public.post_status not null default 'active';
alter table public.posts add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.posts add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
declare
    needs_type_migration boolean;
    needs_status_migration boolean;
    has_legacy_type_column boolean;
    has_legacy_status_column boolean;
    posts_policy record;
    posts_constraint record;
    posts_index record;
begin
    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'posts'
          and column_name = 'type'
          and udt_schema = 'pg_catalog'
          and udt_name in ('text', 'varchar', 'bpchar')
    ) into needs_type_migration;

    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'posts'
          and column_name = 'status'
          and udt_schema = 'pg_catalog'
          and udt_name in ('text', 'varchar', 'bpchar')
    ) into needs_status_migration;

    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'posts'
          and column_name = 'type_legacy_text'
    ) into has_legacy_type_column;

    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'posts'
          and column_name = 'status_legacy_text'
    ) into has_legacy_status_column;

    if needs_type_migration or needs_status_migration then
        for posts_policy in
            select policyname
            from pg_policies
            where schemaname = 'public'
              and tablename = 'posts'
        loop
            execute format('drop policy if exists %I on public.posts', posts_policy.policyname);
        end loop;

        for posts_constraint in
            select con.conname
            from pg_constraint con
            where con.conrelid = 'public.posts'::regclass
              and con.contype = 'c'
              and pg_get_constraintdef(con.oid) ~* '\\m(type|status)\\M'
        loop
            execute format('alter table public.posts drop constraint if exists %I', posts_constraint.conname);
        end loop;

        for posts_index in
            select indexname
            from pg_indexes
            where schemaname = 'public'
              and tablename = 'posts'
              and indexdef ~* '\\m(type|status)\\M'
        loop
            execute format('drop index if exists public.%I', posts_index.indexname);
        end loop;
    end if;

    if needs_type_migration then
        begin
            alter table public.posts
                alter column "type" type public.post_type
                using lower(trim("type"))::public.post_type;
        exception
            when undefined_function then
                if not has_legacy_type_column then
                    alter table public.posts rename column "type" to type_legacy_text;
                    has_legacy_type_column := true;
                end if;

                alter table public.posts add column if not exists "type" public.post_type;

                update public.posts
                set "type" = lower(trim(type_legacy_text))::public.post_type
                where "type" is null
                  and type_legacy_text is not null;

                alter table public.posts
                    alter column "type" set not null;
        end;
    end if;

    if needs_status_migration then
        begin
            alter table public.posts
                alter column status drop default;

            alter table public.posts
                alter column status type public.post_status
                using lower(trim(status))::public.post_status;

            alter table public.posts
                alter column status set default 'active'::public.post_status;
        exception
            when undefined_function then
                if not has_legacy_status_column then
                    alter table public.posts rename column status to status_legacy_text;
                    has_legacy_status_column := true;
                end if;

                alter table public.posts add column if not exists status public.post_status;

                update public.posts
                set status = coalesce(
                    lower(trim(status_legacy_text))::public.post_status,
                    'active'::public.post_status
                )
                where status is null;

                alter table public.posts
                    alter column status set default 'active'::public.post_status;

                alter table public.posts
                    alter column status set not null;
        end;
    end if;
end
$$;

do $$
begin
        -- Repair legacy fallback columns if an older migration left them with NOT NULL.
        if exists (
                select 1
                from information_schema.columns
                where table_schema = 'public'
                    and table_name = 'posts'
                    and column_name = 'type_legacy_text'
        ) then
                alter table public.posts alter column type_legacy_text drop not null;

                update public.posts
                set type_legacy_text = coalesce(type_legacy_text, "type"::text)
                where type_legacy_text is null
                    and "type" is not null;
        end if;

        if exists (
                select 1
                from information_schema.columns
                where table_schema = 'public'
                    and table_name = 'posts'
                    and column_name = 'status_legacy_text'
        ) then
                alter table public.posts alter column status_legacy_text drop not null;

                update public.posts
                set status_legacy_text = coalesce(status_legacy_text, status::text)
                where status_legacy_text is null
                    and status is not null;
        end if;
end
$$;

alter table public.chats add column if not exists post_id uuid references public.posts (id) on delete cascade;
alter table public.chats add column if not exists requester_id uuid references public.users (id) on delete cascade;
alter table public.chats add column if not exists owner_id uuid references public.users (id) on delete cascade;
alter table public.chats add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.messages add column if not exists chat_id uuid references public.chats (id) on delete cascade;
alter table public.messages add column if not exists sender_id uuid references public.users (id) on delete cascade;
alter table public.messages add column if not exists content text;
alter table public.messages add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.comments add column if not exists post_id uuid references public.posts (id) on delete cascade;
alter table public.comments add column if not exists user_id uuid references public.users (id) on delete cascade;
alter table public.comments add column if not exists content text;
alter table public.comments add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.comments add column if not exists updated_at timestamptz not null default timezone('utc', now());

create index if not exists users_location_gix on public.users using gist (location);
create index if not exists posts_location_gix on public.posts using gist (location);
create index if not exists posts_user_status_created_idx on public.posts (user_id, status, created_at desc);
create index if not exists chats_owner_idx on public.chats (owner_id, created_at desc);
create index if not exists chats_requester_idx on public.chats (requester_id, created_at desc);
create index if not exists messages_chat_created_idx on public.messages (chat_id, created_at desc);
create index if not exists comments_post_created_idx on public.comments (post_id, created_at asc);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
before update on public.comments
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.users (id, display_name, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data ->> 'avatar_url'
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.comments enable row level security;

drop policy if exists "Users are viewable by authenticated members" on public.users;
drop policy if exists "Users are viewable by feed visitors" on public.users;
create policy "Users are viewable by feed visitors"
on public.users
for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Active posts are public and owners see all" on public.posts;
create policy "Active posts are public and owners see all"
on public.posts
for select
to anon, authenticated
using (status = 'active' or auth.uid() = user_id);

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
on public.posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
on public.posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
on public.posts
for delete
to authenticated
using (auth.uid() = user_id);

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'post-images',
    'post-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Post images are publicly readable" on storage.objects;
create policy "Post images are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'post-images');

drop policy if exists "Authenticated users can upload post images" on storage.objects;
create policy "Authenticated users can upload post images"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authenticated users can update their post images" on storage.objects;
create policy "Authenticated users can update their post images"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authenticated users can delete their post images" on storage.objects;
create policy "Authenticated users can delete their post images"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Chat participants can read chats" on public.chats;
create policy "Chat participants can read chats"
on public.chats
for select
to authenticated
using (auth.uid() in (requester_id, owner_id));

drop policy if exists "Requester can create a chat for a post" on public.chats;
create policy "Requester can create a chat for a post"
on public.chats
for insert
to authenticated
with check (
    auth.uid() = requester_id
    and exists (
        select 1
        from public.posts
        where posts.id = post_id
          and posts.user_id = owner_id
    )
);

drop policy if exists "Chat participants can read messages" on public.messages;
create policy "Chat participants can read messages"
on public.messages
for select
to authenticated
using (
    exists (
        select 1
        from public.chats
        where chats.id = chat_id
          and auth.uid() in (chats.requester_id, chats.owner_id)
    )
);

drop policy if exists "Chat participants can send messages" on public.messages;
create policy "Chat participants can send messages"
on public.messages
for insert
to authenticated
with check (
    auth.uid() = sender_id
    and exists (
        select 1
        from public.chats
        where chats.id = chat_id
          and auth.uid() in (chats.requester_id, chats.owner_id)
    )
);

create or replace function public.get_nearby_posts(
    user_lat double precision,
    user_lng double precision,
    radius_meters integer default 1000
)
returns table (
    id uuid,
    user_id uuid,
    type public.post_type,
    title text,
    description text,
    image_url text,
    status public.post_status,
    created_at timestamptz,
    latitude double precision,
    longitude double precision,
    distance_meters double precision
)
language sql
stable
set search_path = public, extensions
as $$
    select
        posts.id,
        posts.user_id,
        posts.type::public.post_type,
        posts.title,
        posts.description,
        posts.image_url,
        posts.status::public.post_status,
        posts.created_at,
        posts.latitude,
        posts.longitude,
        st_distance(
            posts.location,
            st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
        ) as distance_meters
    from public.posts
        where posts.status::public.post_status = 'active'::public.post_status
      and st_dwithin(
          posts.location,
          st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography,
          radius_meters
      )
    order by distance_meters asc, posts.created_at desc;
$$;

grant execute on function public.get_nearby_posts(double precision, double precision, integer) to anon, authenticated;

create or replace function public.create_post_with_location(
    post_type public.post_type,
    post_title text,
    post_description text,
    post_image_url text default null,
    post_lat double precision default null,
    post_lng double precision default null
)
returns public.posts
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
    created_post public.posts;
begin
    if auth.uid() is null then
        raise exception 'Authentication required to create a post.';
    end if;

    if post_lat is null or post_lng is null then
        raise exception 'Latitude and longitude are required.';
    end if;

    insert into public.posts (
        user_id,
        type,
        title,
        description,
        image_url,
        location,
        latitude,
        longitude
    )
    values (
        auth.uid(),
        post_type,
        trim(post_title),
        trim(post_description),
        post_image_url,
        st_setsrid(st_makepoint(post_lng, post_lat), 4326)::geography,
        post_lat,
        post_lng
    )
    returning * into created_post;

    return created_post;
end;
$$;

grant execute on function public.create_post_with_location(public.post_type, text, text, text, double precision, double precision) to authenticated;