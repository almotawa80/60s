-- keep_results.sql (v268) — المرحلة ١: حماية نتائج الطلاب
-- 1) حذف التحدي ما يمسح جولات الطلاب (تبقى بدون تحدي، وتنحسب في المستوى والشارات والتقارير)
-- 2) حذف الطالب = إخفاء: يطلع من الصف والترتيب، رمزه يتوقف، وتاريخه يبقى، وتقدر ترجعه
-- 3) كل إجابة تحفظ نسخة من مادة ودرس ومستوى السؤال، حتى لو انعدل السؤال أو انحذف

-- 1) challenges
alter table public.attempts drop constraint attempts_competition_id_fkey;
alter table public.attempts add constraint attempts_competition_id_fkey
  foreign key (competition_id) references public.competitions(id) on delete set null;

-- 2) students: hide instead of delete
alter table public.students alter column class_id drop not null;
alter table public.students add column if not exists deleted_at timestamptz;
alter table public.students add column if not exists del_from uuid;
alter table public.students add column if not exists del_teacher uuid references public.teachers(id) on delete cascade;

create or replace function public.teacher_hide_student(p_student uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare v_cls uuid; v_t uuid;
begin
  select s.class_id, c.teacher_id into v_cls, v_t from public.students s join public.classes c on c.id = s.class_id where s.id = p_student;
  if v_t is null or v_t <> sup.uid_w() then raise exception 'forbidden'; end if;
  update public.students set class_id = null, del_from = v_cls, del_teacher = v_t, deleted_at = now(),
    code = private.new_code() where id = p_student;
  delete from public.student_sessions where student_id = p_student;
  delete from public.push_subs where student_id = p_student;
end $$;

create or replace function public.teacher_hidden_students()
returns jsonb language sql stable security definer set search_path = public, private as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'cls', c.name, 'cid', s.del_from, 'at', s.deleted_at,
    'rounds', (select count(*) from public.attempts a where a.student_id = s.id and a.status = 'finished')) order by s.deleted_at desc), '[]'::jsonb)
  from public.students s left join public.classes c on c.id = s.del_from
  where s.del_teacher = sup.uid() and s.class_id is null $$;

create or replace function public.teacher_restore_student(p_student uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare v_from uuid;
begin
  select del_from into v_from from public.students where id = p_student and del_teacher = sup.uid_w() and class_id is null;
  if not found then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.classes where id = v_from and teacher_id = sup.uid_w()) then raise exception 'class_gone'; end if;
  update public.students set class_id = v_from, del_from = null, del_teacher = null, deleted_at = null where id = p_student;
end $$;

create or replace function public.teacher_purge_student(p_student uuid)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  delete from public.students where id = p_student and del_teacher = sup.uid_w() and class_id is null;
end $$;

grant execute on function public.teacher_hide_student(uuid), public.teacher_hidden_students(), public.teacher_restore_student(uuid), public.teacher_purge_student(uuid) to authenticated;

-- a hidden student can't log in (class is null)
create or replace function public.student_login(p_code text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'private' as $function$
declare v_s public.students; v_c public.classes; v_tok uuid;
begin
  select * into v_s from public.students where code = upper(trim(p_code)) and class_id is not null;
  if not found then raise exception 'invalid_code'; end if;
  select * into v_c from public.classes where id = v_s.class_id;
  insert into public.student_sessions(student_id) values (v_s.id) returning token into v_tok;
  return jsonb_build_object('token', v_tok, 'student', jsonb_build_object('id', v_s.id, 'name', v_s.name),
                            'class', jsonb_build_object('id', v_c.id, 'name', v_c.name, 'style', v_c.style));
end $function$;

-- 3) snapshot of the question on every answer
alter table public.attempt_questions add column if not exists curriculum_id uuid;
alter table public.attempt_questions add column if not exists subject text;
alter table public.attempt_questions add column if not exists lesson text;
alter table public.attempt_questions add column if not exists level text;

create or replace function private.aq_snapshot() returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.question_id is not null and new.lesson is null and new.level is null then
    select q.curriculum_id, coalesce(nullif(q.subject, ''), cu.subject), q.lesson, q.level
      into new.curriculum_id, new.subject, new.lesson, new.level
      from public.questions q left join public.curricula cu on cu.id = q.curriculum_id where q.id = new.question_id;
  end if;
  return new;
end $$;
drop trigger if exists aq_snapshot on public.attempt_questions;
create trigger aq_snapshot before insert on public.attempt_questions for each row execute function private.aq_snapshot();

update public.attempt_questions aq set curriculum_id = q.curriculum_id, subject = coalesce(nullif(q.subject, ''), cu.subject), lesson = q.lesson, level = q.level
  from public.questions q left join public.curricula cu on cu.id = q.curriculum_id
 where q.id = aq.question_id and aq.lesson is null and aq.level is null;

-- check: select count(*) filter (where level is not null) snap, count(*) from public.attempt_questions;
