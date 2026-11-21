-- v171 «صندوق بكرة» 🎁 + «هدف الصف» 🎯
-- Box: each day with an official (or knockout) round earns a box that opens after the NEXT day's round.
-- Inside: a new sticker (12 rare emoji). Owned stickers can also be used as the avatar. No points, no money.
alter table public.students add column if not exists stickers text[] not null default '{}';

create table if not exists public.student_boxes (
  student_id uuid not null references public.students(id) on delete cascade,
  earned_on date not null,
  opened_at timestamptz not null default now(),
  prize text,
  primary key (student_id, earned_on)
);
alter table public.student_boxes enable row level security; -- no policies: only via RPC

create or replace function private.sticker_pool() returns text[] language sql immutable as $$
  select array['🐲','🦖','👑','💎','🌈','🛸','🦈','🐙','🦋','🍀','🎯','🔮']
$$;

alter table public.students drop constraint if exists students_avatar_chk;
alter table public.students add constraint students_avatar_chk check (avatar is null or avatar = any (array['🦁','🐯','🐼','🦊','🐨','🐸','🦉','🦅','🐬','🐢','🦄','🐉','🚀','⚽','🏆','⭐','🐲','🦖','👑','💎','🌈','🛸','🦈','🐙','🦋','🍀','🎯','🔮']));

create or replace function public.student_set_avatar(p_token uuid, p_av text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'bad_token'; end if;
  if p_av = any (private.sticker_pool()) and not exists (select 1 from public.students where id = v_sid and p_av = any (stickers)) then raise exception 'locked'; end if;
  update public.students set avatar = nullif(p_av, '') where id = v_sid;
  return nullif(p_av, '');
end $$;

-- the box waiting to be opened: latest earlier play day with no box row yet (only once today's round is done)
create or replace function private.box_ready(p_sid uuid) returns date
language sql stable security definer set search_path = public, private as $$
  select max(a.play_date) from public.attempts a
   where a.student_id = p_sid and a.status = 'finished' and a.kind in ('official','knockout')
     and a.play_date < private.today_kw()
     and not exists (select 1 from public.student_boxes b where b.student_id = p_sid and b.earned_on = a.play_date)
     and exists (select 1 from public.attempts t where t.student_id = p_sid and t.status = 'finished' and t.kind in ('official','knockout') and t.play_date = private.today_kw())
     and a.play_date >= private.today_kw() - 30
$$;

create or replace function public.student_daily(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare v_sid uuid; v_cls uuid; t date := private.today_kw(); v_size int; v_played int; v_stars int; v_today boolean; v_st text[];
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'bad_token'; end if;
  select class_id, stickers into v_cls, v_st from public.students where id = v_sid;
  select count(*) into v_size from public.students where class_id = v_cls and coalesce(approved, true);
  select count(distinct a.student_id) into v_played from public.attempts a join public.students s on s.id = a.student_id
   where s.class_id = v_cls and a.play_date = t and a.status = 'finished' and a.kind in ('official','knockout');
  select count(*) into v_stars from (
    select a.play_date from public.attempts a join public.students s on s.id = a.student_id
     where s.class_id = v_cls and a.play_date >= t - 60 and a.status = 'finished' and a.kind in ('official','knockout')
     group by a.play_date having count(distinct a.student_id) >= ceil(greatest(v_size, 1) * 0.8)) x;
  v_today := exists (select 1 from public.attempts where student_id = v_sid and play_date = t and status = 'finished' and kind in ('official','knockout'));
  return jsonb_build_object(
    'box', jsonb_build_object('ready', private.box_ready(v_sid) is not null, 'locked', v_today),
    'stickers', to_jsonb(v_st), 'pool', to_jsonb(private.sticker_pool()),
    'goal', jsonb_build_object('played', v_played, 'size', v_size, 'need', ceil(greatest(v_size, 1) * 0.8)::int, 'stars', v_stars));
end $$;

create or replace function public.student_open_box(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare v_sid uuid; v_day date; v_left text[]; v_prize text;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'bad_token'; end if;
  v_day := private.box_ready(v_sid);
  if v_day is null then return jsonb_build_object('ok', false); end if;
  select array_agg(e) into v_left from unnest(private.sticker_pool()) e
   where not exists (select 1 from public.students s where s.id = v_sid and e = any (s.stickers));
  if v_left is not null then
    v_prize := v_left[1 + floor(random() * array_length(v_left, 1))::int];
    update public.students set stickers = array_append(stickers, v_prize) where id = v_sid;
  end if;
  insert into public.student_boxes(student_id, earned_on, prize) values (v_sid, v_day, v_prize) on conflict do nothing;
  return jsonb_build_object('ok', true, 'prize', v_prize, 'count', (select cardinality(stickers) from public.students where id = v_sid), 'total', cardinality(private.sticker_pool()));
end $$;

revoke all on function public.student_daily(uuid) from public;
revoke all on function public.student_open_box(uuid) from public;
grant execute on function public.student_daily(uuid) to anon, authenticated;
grant execute on function public.student_open_box(uuid) to anon, authenticated;

select 'ok' as done;
