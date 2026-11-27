-- Wrong name on class join (Khalid 2026-11-27):
-- 1) the real student taps «هذا اسمي وما دخلت!» on a locked name → teacher gets a notice
-- 2) teacher fixes in one tap: signs out every device on that name, removes the rounds played since then, new personal code
-- 3) one device = one name per class
alter table public.students add column if not exists claim_at timestamptz;

create or replace function public.student_claim(p_join text, p_student uuid) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  update public.students s set claim_at = now()
  from public.classes c
  where s.id = p_student and c.id = s.class_id and c.join_code = upper(trim(p_join)) and c.self_join
    and (s.claim_at is null or s.claim_at < now() - interval '10 minutes');
end $$;

create or replace function public.teacher_name_info(p_student uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare v_since timestamptz;
begin
  if not exists (select 1 from public.students s join public.classes c on c.id = s.class_id where s.id = p_student and c.teacher_id = sup.uid()) then raise exception 'forbidden'; end if;
  select min(created_at) into v_since from public.student_sessions where student_id = p_student;
  return jsonb_build_object('devices', (select count(*) from public.student_sessions where student_id = p_student), 'since', v_since,
    'rounds', (select count(*) from public.attempts where student_id = p_student and v_since is not null and started_at >= v_since),
    'points', (select coalesce(sum(total_points), 0) from public.attempts where student_id = p_student and v_since is not null and started_at >= v_since and kind <> 'practice'));
end $$;

create or replace function public.teacher_name_fix(p_student uuid, p_wipe boolean) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare v_since timestamptz; v_code text; v_n int := 0;
begin
  if not exists (select 1 from public.students s join public.classes c on c.id = s.class_id where s.id = p_student and c.teacher_id = sup.uid_w()) then raise exception 'forbidden'; end if;
  select min(created_at) into v_since from public.student_sessions where student_id = p_student;
  if p_wipe and v_since is not null then
    delete from public.attempts where student_id = p_student and started_at >= v_since; get diagnostics v_n = row_count;
  end if;
  delete from public.student_sessions where student_id = p_student;
  delete from public.push_subs where student_id = p_student;
  v_code := private.new_code();
  update public.students set code = v_code, device = null, claim_at = null where id = p_student;
  return jsonb_build_object('code', v_code, 'wiped', v_n);
end $$;

create or replace function public.teacher_claim_dismiss(p_student uuid) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  update public.students s set claim_at = null from public.classes c where s.id = p_student and c.id = s.class_id and c.teacher_id = sup.uid_w();
end $$;

revoke all on function public.student_claim(text, uuid), public.teacher_name_info(uuid), public.teacher_name_fix(uuid, boolean), public.teacher_claim_dismiss(uuid) from public;
grant execute on function public.student_claim(text, uuid) to anon, authenticated;
grant execute on function public.teacher_name_info(uuid), public.teacher_name_fix(uuid, boolean), public.teacher_claim_dismiss(uuid) to authenticated;

-- one device = one name per class (student_join)
do $$ declare d text; begin
  d := pg_get_functiondef('public.student_join(text, text, uuid, text)'::regprocedure);
  if position('device_taken' in d) = 0 then
    d := replace(d, '  insert into public.student_sessions(student_id) values (v_s.id) returning token into v_tok;',
'  select string_agg(s2.name, '' ، '') into v_name from public.students s2 where s2.class_id = v.id and s2.id <> v_s.id and p_device is not null and s2.device = left(p_device, 64);
  if v_name is not null then raise exception ''device_taken:%'', v_name; end if;
  insert into public.student_sessions(student_id) values (v_s.id) returning token into v_tok;');
    execute d;
  end if;
end $$;

-- teacher notice: «X تقول أحد دخل باسمها»
do $$ declare d text; begin
  d := pg_get_functiondef('public.teacher_notices()'::regprocedure);
  if position('''claims''' in d) = 0 then
    d := replace(d, '''idle'', coalesce(', '''claims'', coalesce((select jsonb_agg(jsonb_build_object(''cid'', s.class_id, ''sid'', s.id, ''name'', s.name, ''at'', s.claim_at)) from public.students s join cls on cls.id = s.class_id where s.claim_at is not null), ''[]''),
    ''idle'', coalesce(');
    execute d;
  end if;
end $$;
