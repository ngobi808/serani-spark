-- 004_create_order_items.sql
-- unit_price_kes is snapshotted at order time so later price changes never
-- rewrite historical order totals (important for Metabase revenue accuracy).

CREATE TABLE order_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id       UUID NOT NULL REFERENCES products(id),

    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_kes   NUMERIC(12,2) NOT NULL,     -- snapshot of selling_price_kes at order time
    unit_cost_kes    NUMERIC(12,2),               -- snapshot of cost_price_kes at order time (admin-only reporting)

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
