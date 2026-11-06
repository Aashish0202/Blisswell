-- 007: snapshot of the purchased design's image on each order, so editing or
-- renaming a product design later never changes what past orders show.
--
-- Run once on production BEFORE restarting the backend. (If skipped, the
-- backend adds the column + backfill itself on startup via
-- Order.ensureDesignSnapshot(); running this first is equivalent.)
--
-- Design out-of-stock needs no schema change: it is an `out_of_stock` flag
-- inside the existing products.designs JSON.

-- 1. New column (fails with "Duplicate column name" if already applied — safe to ignore)
ALTER TABLE orders ADD COLUMN design_image VARCHAR(500) NULL AFTER design_name;

-- 2. Backfill existing design orders with the design's current first image
--    (the best record available for orders placed before this change).
UPDATE orders o
JOIN products p ON p.id = o.product_id
SET o.design_image = JSON_UNQUOTE(JSON_EXTRACT(
      p.designs,
      REPLACE(JSON_UNQUOTE(JSON_SEARCH(p.designs, 'one', o.design_name, NULL, '$[*].name')), '.name', '.images[0]')
    ))
WHERE o.design_name IS NOT NULL
  AND o.design_image IS NULL
  AND p.designs IS NOT NULL
  AND JSON_SEARCH(p.designs, 'one', o.design_name, NULL, '$[*].name') IS NOT NULL;

-- 3. Check: design orders and how many now have an image snapshot
SELECT COUNT(*) AS design_orders, SUM(design_image IS NOT NULL) AS with_snapshot
FROM orders WHERE design_name IS NOT NULL;
