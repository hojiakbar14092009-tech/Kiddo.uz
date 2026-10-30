-- Phase 31: the wardrobe grows (categories sport, science, space, explorer,
-- creative, traditional, tech, smart, seasonal). The server's price list
-- must match src/features/shop/outfits.ts (serverPrices.test.ts compares).
-- Every item is open to every child; age only changes what is shown first.
insert into public.shop_items (kind, item, price) values
  ('outfit', 'sunglasses', 18), ('outfit', 'headband', 12), ('outfit', 'whistle', 14),
  ('outfit', 'goggles', 20), ('outfit', 'headset', 22), ('outfit', 'explorer-hat', 20),
  ('outfit', 'compass', 16), ('outfit', 'beret', 16), ('outfit', 'doppi', 25),
  ('outfit', 'headphones', 24), ('outfit', 'tie', 14), ('outfit', 'winter-hat', 15)
on conflict (kind, item) do update set price = excluded.price;
