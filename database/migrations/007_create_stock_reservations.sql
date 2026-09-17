-- 007_create_stock_reservations.sql
--
-- Implements the reservation mechanism described in the product owner's Q&A:
--   available stock -> customer starts checkout -> RESERVE
--   -> payment succeeds -> commit (deduct from products.stock_quantity)
--   -> payment fails / expires (10 min) -> RELEASE (reservation deleted/expired, no deduction)
--
-- "Available stock" shown to customers = products.stock_quantity
--                                          - SUM(active, unexpired reservations for that product)

CREATE TABLE stock_reservations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id    UUID NOT NULL REFERENCES products(id),

    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    status        VARCHAR(20) NOT NULL DEFAULT 'active',
    -- allowed: active | committed | released

    expires_at    TIMESTAMPTZ NOT NULL,     -- created_at + 10 minutes
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_reservation_status CHECK (status IN ('active','committed','released'))
);

CREATE INDEX idx_reservations_product_active ON stock_reservations(product_id) WHERE status = 'active';
CREATE INDEX idx_reservations_order ON stock_reservations(order_id);
CREATE INDEX idx_reservations_expiry ON stock_reservations(expires_at) WHERE status = 'active';
