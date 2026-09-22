-- 008_create_stock_adjustments.sql
--
-- An audit trail of every manual stock change (morning stock takes, receiving new
-- deliveries, marking damaged goods). This is separate from stock_reservations
-- (which handles the checkout reserve/commit/release flow automatically).
--
-- Purpose: when stock_quantity changes, this table answers "why" — was it counted
-- this morning, did new stock arrive, was something damaged? This is exactly the
-- kind of clean, reason-coded history a future Zoho Books (or Metabase) sync would
-- need to reconcile inventory correctly, so we're building it now while it's cheap,
-- even though the sync itself is a later phase.

CREATE TABLE stock_adjustments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id         UUID NOT NULL REFERENCES products(id),

    previous_quantity  INTEGER NOT NULL,
    new_quantity       INTEGER NOT NULL,
    difference         INTEGER NOT NULL,  -- new - previous; negative = shrinkage/damage, positive = received stock

    reason             VARCHAR(30) NOT NULL DEFAULT 'stock_take',
    -- allowed: stock_take | received | damaged | correction

    admin_id           UUID REFERENCES admin_users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_adjustment_reason CHECK (reason IN ('stock_take', 'received', 'damaged', 'correction'))
);

CREATE INDEX idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX idx_stock_adjustments_created ON stock_adjustments(created_at);
