-- v324: box after the sticker collection is complete gives +30 level XP instead of nothing
alter table public.student_boxes add column if not exists xp int not null default 0;

create or replace function private.student_xp(p_sid uuid)
returns integer language sql stable security definer set search_path to 'public', 'private' as $$
  select coalesce((select 10 * count(*) from public.attempt_questions aq join public.attempts a on a.id = aq.attempt_id
                    where a.student_id = p_sid and aq.is_correct), 0)::int
       + coalesce((select 5 * count(*) from public.attempts where student_id = p_sid and status = 'finished'), 0)::int
       + coalesce((select sum(xp) from public.student_boxes where student_id = p_sid), 0)::int
$$;

create or replace function public.student_open_box(p_token uuid)
returns jsonb language plpgsql security definer set search_path to 'public', 'private' as $$
declare v_sid uuid; v_day date; v_left text[]; v_prize text; v_xp int := 0;
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
  else
    v_xp := 30;
  end if;
  insert into public.student_boxes(student_id, earned_on, prize, xp) values (v_sid, v_day, v_prize, v_xp) on conflict do nothing;
  return jsonb_build_object('ok', true, 'prize', v_prize, 'xp', v_xp, 'xp_total', private.student_xp(v_sid),
    'count', (select cardinality(stickers) from public.students where id = v_sid), 'total', cardinality(private.sticker_pool()));
end $$;
