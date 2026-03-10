-- Postgres-backed rate limiting storage + atomic check function.
-- Scope+identifier lets us isolate counters per endpoint/purpose.

create table if not exists public.rate_limits (
    scope text not null,
    identifier text not null,
    window_start timestamptz not null,
    request_count integer not null,
    updated_at timestamptz not null default now(),
    primary key (scope, identifier)
);

create index if not exists rate_limits_window_start_idx on public.rate_limits (window_start);

create or replace function public.rate_limit_check(
    p_scope text,
    p_identifier text,
    p_limit integer,
    p_window_seconds integer
)
returns table(allowed boolean, request_count integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_now timestamptz := now();
    v_window_start timestamptz := v_now - make_interval(secs => p_window_seconds);
    v_count integer;
    v_ws timestamptz;
begin
    insert into public.rate_limits(scope, identifier, window_start, request_count, updated_at)
    values (p_scope, p_identifier, v_now, 1, v_now)
    on conflict (scope, identifier)
    do update set
        request_count = case
            when public.rate_limits.window_start < v_window_start then 1
            else public.rate_limits.request_count + 1
        end,
        window_start = case
            when public.rate_limits.window_start < v_window_start then v_now
            else public.rate_limits.window_start
        end,
        updated_at = v_now
    returning public.rate_limits.request_count, public.rate_limits.window_start
    into v_count, v_ws;

    return query
    select
        (v_count <= p_limit) as allowed,
        v_count as request_count,
        greatest(0, p_window_seconds - extract(epoch from (v_now - v_ws))::int) as retry_after_seconds;
end;
$$;

revoke all on function public.rate_limit_check (text, text, integer, integer)
from public;

grant
execute on function public.rate_limit_check (text, text, integer, integer) to anon,
authenticated;