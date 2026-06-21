-- ============================================================================
-- The Indic View — shared post reactions (Supabase / Postgres)
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste → Run. Then copy your Project URL and anon key into the theme
-- (default.hbs → window.TIV_SUPABASE, or Ghost Settings → Code injection).
-- ============================================================================

-- 1. Table: one row per post slug holding the shared counts.
create table if not exists public.post_reactions (
    slug       text primary key,
    likes      integer not null default 0,
    dislikes   integer not null default 0,
    updated_at timestamptz not null default now()
);

-- 2. Lock the table down with Row Level Security.
--    Readers may SELECT counts, but may NOT write directly — all writes go
--    through the bounded react() function below.
alter table public.post_reactions enable row level security;

drop policy if exists "public read reactions" on public.post_reactions;
create policy "public read reactions"
    on public.post_reactions
    for select
    to anon
    using (true);

-- 3. Atomic, bounded increment. SECURITY DEFINER lets it bypass RLS for the
--    update, but it only ever applies +1 / -1 to likes or dislikes, so the
--    public anon key cannot set arbitrary values or touch other columns.
create or replace function public.react(p_slug text, p_field text, p_delta integer)
returns public.post_reactions
language plpgsql
security definer
set search_path = public
as $$
declare
    result public.post_reactions;
begin
    if p_field not in ('likes', 'dislikes') then
        raise exception 'invalid field: %', p_field;
    end if;
    if p_delta not in (-1, 1) then
        raise exception 'invalid delta: %', p_delta;
    end if;

    insert into public.post_reactions (slug)
        values (p_slug)
        on conflict (slug) do nothing;

    if p_field = 'likes' then
        update public.post_reactions
            set likes = greatest(0, likes + p_delta), updated_at = now()
            where slug = p_slug
            returning * into result;
    else
        update public.post_reactions
            set dislikes = greatest(0, dislikes + p_delta), updated_at = now()
            where slug = p_slug
            returning * into result;
    end if;

    return result;
end;
$$;

-- 4. Allow the public (anon) role to call the function.
grant execute on function public.react(text, text, integer) to anon;
