-- Admin app (Khalid 2026-11-27): ratings (teachers + students) and the bank tab.
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('t','s')),
  teacher_id uuid references public.teachers(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text check (comment is null or length(comment) <= 500),
  created_at timestamptz not null default now()
);
alter table public.ratings enable row level security;

create or replace function public.teacher_rate(p_stars int, p_comment text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into public.ratings(kind, teacher_id, stars, comment) values ('t', auth.uid(), greatest(1, least(5, p_stars)), nullif(left(trim(p_comment), 500), ''));
end $$;

create or replace function public.student_rate(p_token uuid, p_stars int, p_comment text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'bad_token'; end if;
  insert into public.ratings(kind, student_id, stars, comment) values ('s', v_sid, greatest(1, least(5, p_stars)), nullif(left(trim(p_comment), 500), ''));
end $$;

create or replace function public.admin_ratings(p_kind text) returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not exists(select 1 from private.admins where user_id = auth.uid()) then '[]'::jsonb else coalesce((
    select jsonb_agg(x order by x.created_at desc) from (
      select r.stars, r.comment, r.created_at,
        case when r.kind = 't' then t.display_name else s.name || coalesce(' · ' || c.name, '') end who
      from public.ratings r
      left join public.teachers t on t.id = r.teacher_id
      left join public.students s on s.id = r.student_id
      left join public.classes c on c.id = s.class_id
      where r.kind = p_kind order by r.created_at desc limit 300) x), '[]'::jsonb) end
$$;

create or replace function public.admin_bank() returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not exists(select 1 from private.admins where user_id = auth.uid()) then null else jsonb_build_object(
    'cus', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'subject', c.subject, 'grade', c.grade, 'stage', c.stage,
        'n', coalesce(z.n, 0), 'les', coalesce(z.les, 0), 'thin', coalesce(z.thin, 0)) order by c.grade, c.subject)
      from public.curricula c
      left join lateral (select sum(k)::int n, count(*)::int les, count(*) filter (where k < 8)::int thin from (
        select count(*) k from public.questions q where q.curriculum_id = c.id and q.owner_id is null and q.status = 'approved' group by q.lesson) y) z on true
      where c.owner_id is null), '[]'::jsonb),
    'gen', (select jsonb_agg(jsonb_build_object('id', 'gen:' || g.t, 'name', g.name, 'ic', g.ic,
        'n', (select count(*) from public.questions q where q.curriculum_id is null and q.owner_id is null and q.status = 'approved' and q.qtype::text = g.t)) order by g.o)
      from (values (1, 'general', 'معلومات عامة', '🌍'), (2, 'quick', 'سرعة بديهة', '⚡'), (3, 'memory', 'ذاكرة', '🧠')) g(o, t, name, ic))) end
$$;

create or replace function public.admin_bank_cu(p_cu text) returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not exists(select 1 from private.admins where user_id = auth.uid()) then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('id', q.id, 'lesson', q.lesson, 'body', q.body, 'options', q.options, 'correct_index', q.correct_index, 'payload', q.payload)
      order by q.lesson nulls last, q.created_at)
    from public.questions q
    where q.owner_id is null and q.status = 'approved'
      and case when p_cu like 'gen:%' then q.curriculum_id is null and q.qtype::text = substr(p_cu, 5) else q.curriculum_id::text = p_cu end), '[]'::jsonb) end
$$;

revoke all on function public.teacher_rate(int, text), public.student_rate(uuid, int, text), public.admin_ratings(text), public.admin_bank(), public.admin_bank_cu(text) from public, anon;
grant execute on function public.teacher_rate(int, text), public.admin_ratings(text), public.admin_bank(), public.admin_bank_cu(text) to authenticated;
grant execute on function public.student_rate(uuid, int, text) to anon, authenticated;
