-- 005: Sequential invoice numbers, issued only for confirmed payments.
--
-- Problem: order_number was `BSW1000000 + userId`, i.e. NOT sequential — every
-- order of a user (initial purchase, auto-repurchase, failed attempts) got the
-- SAME number, and failed payments consumed one too.
--
-- New design:
--   * orders.order_number is NULL until the payment is confirmed.
--   * At confirmation, a number is allocated from the invoice_counter table
--     (SELECT ... FOR UPDATE inside the confirm transaction) → strictly
--     sequential, gap-free, race-free, and it rolls back with the payment.
--   * Format: BSW + 1000000 + running sequence → BSW1000001, BSW1000002, ...

-- 1. Allow order_number to be NULL (unconfirmed payments have no invoice)
SET @col_nullable = (
  SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_number'
);
SET @ddl = IF(@col_nullable = 'NO',
  'ALTER TABLE orders MODIFY order_number VARCHAR(50) NULL',
  'SELECT ''orders.order_number already nullable'' AS info');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Single-row counter that invoice numbers are allocated from
CREATE TABLE IF NOT EXISTS invoice_counter (
  id TINYINT NOT NULL PRIMARY KEY CHECK (id = 1),
  next_seq INT NOT NULL DEFAULT 1
) ENGINE=InnoDB;
INSERT IGNORE INTO invoice_counter (id, next_seq) VALUES (1, 1);

-- 3. One-time renumber (only runs when the old userId-derived format is present):
--    * failed / processing orders never got real payments → strip their numbers
--    * confirmed orders (pending/shipped/delivered) get fresh sequential
--      numbers ordered by id, and the counter continues after them
--    (PREPARE takes a single statement, so each step is guarded separately)
SET @old_format = (
  SELECT COUNT(*) FROM orders
  WHERE order_number REGEXP '^BSW1000000[0-9]{2}$'
);

SET @ddl = IF(@old_format > 0,
  'UPDATE orders SET order_number = NULL WHERE status IN (''failed'', ''processing'')',
  'SELECT ''renumber skipped'' AS info');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @seq := 0;
SET @ddl = IF(@old_format > 0,
  'UPDATE orders SET order_number = CONCAT(''BSW'', 1000000 + (@seq := @seq + 1))
   WHERE status IN (''pending'', ''shipped'', ''delivered'') ORDER BY id',
  'SELECT ''renumber skipped'' AS info');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF(@old_format > 0,
  'UPDATE invoice_counter SET next_seq = (
     SELECT COALESCE(MAX(CAST(SUBSTRING(order_number, 4) AS UNSIGNED)) - 1000000, 0) + 1
     FROM orders WHERE order_number IS NOT NULL
   ) WHERE id = 1',
  'SELECT ''renumber skipped'' AS info');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;