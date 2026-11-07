-- 預設家人名單（照順序顯示）。上線後可在網頁「繳費狀況 → 成員管理」改名稱、新增成員、設定每月應繳金額。
-- monthly_due = 0 表示金額不固定：只看有沒有繳，不計差額。
insert into public.meal_members (name, monthly_due) values
  ('爸爸', 0),
  ('媽媽', 0),
  ('姐姐', 0),
  ('弟弟', 0);
