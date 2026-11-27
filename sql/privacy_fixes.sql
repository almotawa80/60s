-- privacy audit 2026-11-27 (Khalid approved). Run once in the Supabase SQL editor.
-- 1) Global arena: nickname (chosen word-pair, else generated), never the real name. Classmates ranking (stage_rank) keeps real names.
create or replace function private.real_nick(p_sid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
      when array_length(w, 1) is null then 'لاعب'
      when w[1] in ('عبد', 'أبو', 'ابو', 'أم', 'ام') then array_to_string(w[1:3], ' ')
      else array_to_string(w[1:2], ' ') end
  from (select regexp_split_to_array(btrim(coalesce(s.name, '')), '\s+') w from public.students s where s.id = p_sid) z
$$;

create or replace function private.arena_nick(p_sid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select nullif(nick, '') from public.arena_players where student_id = p_sid),
    (select case when s.gender = 'f'
        then (array['نجمة ذكية','فراشة سريعة','قمر الحلبة','بطلة الدقيقة','لؤلؤة العلم','وردة الذكاء','شمس المعرفة','غزالة سريعة'])[1 + abs(hashtext(p_sid::text)) % 8]
        else (array['صقر سريع','فهد ذكي','نجم الحلبة','بطل الدقيقة','ذيب الأسئلة','فارس العلم','برق الحلبة','نسر المعرفة'])[1 + abs(hashtext(p_sid::text)) % 8] end
     from public.students s where s.id = p_sid))
$$;

-- stage_rank = same teacher's classes only, so it keeps real first+second names
do $$ declare d text; begin
  d := pg_get_functiondef('public.stage_rank(uuid)'::regprocedure);
  d := replace(d, 'private.arena_nick(k.id)', 'private.real_nick(k.id)');
  execute d;
end $$;

-- 2) Global arena ranking: no school name
do $$ declare d text; begin
  d := pg_get_functiondef('public.arena_rank(uuid,text)'::regprocedure);
  d := replace(d, E',\r\n        ''school'', nullif(btrim(coalesce(t.settings->>''school'', '''')), '''')', '');
  d := replace(d, E',\n        ''school'', nullif(btrim(coalesce(t.settings->>''school'', '''')), '''')', '');
  if d like '%''school''%' then raise exception 'arena_rank patch did not apply'; end if;
  execute d;
end $$;

-- 3) Students a teacher «deleted» are removed for good after 30 days (teacher can still restore before that)
create or replace function private.hidden_purge() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.students where class_id is null and del_req is null and deleted_at is not null
    and deleted_at < now() - interval '30 days' and name <> 'طالب محذوف';
  get diagnostics n = row_count; return n;
end $$;
revoke all on function private.hidden_purge() from public;
select cron.schedule('mc-hidden-purge', '27 0 * * *', 'select private.hidden_purge()');
