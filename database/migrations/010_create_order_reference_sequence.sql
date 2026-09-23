-- 010_create_order_reference_sequence.sql
--
-- Fixes a real bug: order references were generated as COUNT(*) + 1001, which
-- collides once any order is ever deleted (the count drops, but old reference
-- numbers still exist). A sequence only ever increases, regardless of deletions.

CREATE SEQUENCE order_reference_seq START WITH 1001;

-- Align the sequence with whatever the highest existing reference actually is,
-- so it continues cleanly rather than restarting at 1001 and re-colliding.
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_reference FROM 'SS-(\d+)') AS INTEGER)), 1000)
  INTO max_num
  FROM orders;

  PERFORM setval('order_reference_seq', max_num + 1, false);
END $$;
