-- 12 new memory game rows (3 games x 4 levels). Run only with client v436+.
insert into public.questions(owner_id,qtype,level,body,options,correct_index,payload,status,source)
select null,'memory',lv,body,'["نجحت","ما نجحت"]'::jsonb,0,jsonb_build_object('kind','game','g',g,'lv',n),'approved','game' from (values
('diff',1,'easy','وش تغيّر؟ · ٣ أشكال'),('diff',2,'medium','وش تغيّر؟ · ٤ أشكال'),('diff',3,'medium','وش تغيّر؟ · ٥ أشكال'),('diff',4,'hard','وش تغيّر؟ · ٦ أشكال'),
('path',1,'easy','لعبة الطريق · ٤ خطوات'),('path',2,'medium','لعبة الطريق · ٥ خطوات'),('path',3,'hard','لعبة الطريق · ٦ خطوات'),('path',4,'hard','لعبة الطريق · ٧ خطوات'),
('digits',1,'easy','الرقم الطويل · ٣ أرقام'),('digits',2,'medium','الرقم الطويل · ٤ أرقام'),('digits',3,'hard','الرقم الطويل · ٥ أرقام'),('digits',4,'hard','الرقم الطويل · ٦ أرقام')) v(g,n,lv,body)
where not exists (select 1 from public.questions q where q.qtype='memory' and q.owner_id is null and q.payload->>'g'=v.g and (q.payload->>'lv')::int=v.n);
