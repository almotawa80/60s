-- v341: memory mini-games as public «ذاكرة» questions. The client plays payload {kind:'game', g, lv} and submits 0 (won) / 1 (lost).
insert into public.questions(owner_id, qtype, level, body, options, correct_index, status, source, payload)
select null, 'memory', v.level, v.body, '["نجحت","ما نجحت"]'::jsonb, 0, 'approved', 'game', jsonb_build_object('kind', 'game', 'g', v.g, 'lv', v.lv)
from (values
 ('squares',1,'easy','لعبة المربعات · ٣ مربعات'),('squares',2,'easy','لعبة المربعات · ٤ مربعات'),('squares',3,'medium','لعبة المربعات · شبكة أكبر'),
 ('squares',4,'medium','لعبة المربعات · ٥ مربعات'),('squares',5,'hard','لعبة المربعات · ٦ مربعات'),('squares',6,'hard','لعبة المربعات · ٧ مربعات'),
 ('seq',1,'easy','لعبة التسلسل · ٣ خطوات'),('seq',2,'medium','لعبة التسلسل · ٤ خطوات'),('seq',3,'hard','لعبة التسلسل · ٥ خطوات'),('seq',4,'hard','لعبة التسلسل · ٦ خطوات'),
 ('pairs',1,'medium','لعبة الأزواج · ٣ أزواج'),('pairs',2,'hard','لعبة الأزواج · ٤ أزواج'),
 ('where',1,'easy','وين كان؟ · ٣ أشكال'),('where',2,'medium','وين كان؟ · ٤ أشكال'),('where',3,'medium','وين كان؟ · ٥ أشكال'),('where',4,'hard','وين كان؟ · ٦ أشكال'),
 ('cups',1,'easy','لعبة الكوب · بطيء'),('cups',2,'medium','لعبة الكوب · متوسط'),('cups',3,'hard','لعبة الكوب · سريع'),('cups',4,'hard','لعبة الكوب · أسرع')
) v(g, lv, level, body)
where not exists (select 1 from public.questions q where q.source = 'game' and q.payload->>'g' = v.g and (q.payload->>'lv')::int = v.lv);
