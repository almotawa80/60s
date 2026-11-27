-- v508 (Khalid 2026-11-27): the arena shows the student's real first + second name, not a rolled nickname.
-- Compound first names keep their second part («عبد الله محمد», «أبو بكر علي»). Bots keep generated names.
create or replace function private.arena_nick(p_sid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
      when array_length(w, 1) is null then 'لاعب'
      when w[1] in ('عبد', 'أبو', 'ابو', 'أم', 'ام') then array_to_string(w[1:3], ' ')
      else array_to_string(w[1:2], ' ') end
  from (select regexp_split_to_array(btrim(coalesce(s.name, '')), '\s+') w from public.students s where s.id = p_sid) z
$$;
