-- Ensure category slugs used by the frontend exist in public.categories
-- so provider_services FK inserts succeed.
insert into public.categories (slug, name_en, name_my, sort_order) values
  ('home-repair','Home Repair','အိမ်ပြုပြင်',100),
  ('aircon-utilities','Aircon & Utilities','အဲကွန်း နှင့် ဝန်ဆောင်မှု',101),
  ('pest-control','Pest Control','ပိုးသတ်',102),
  ('installation','Installation','တပ်ဆင်',103)
on conflict (slug) do nothing;
