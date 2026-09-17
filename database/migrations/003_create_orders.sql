-- 003_create_orders.sql

CREATE TABLE orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_reference   VARCHAR(20) UNIQUE NOT NULL,   -- e.g. SS-1042
    customer_id       UUID NOT NULL REFERENCES customers(id),

    status            VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
    -- allowed: pending_payment | paid | processing | fulfilled | cancelled | failed

    total_kes         NUMERIC(12,2) NOT NULL,
    amount_paid_kes   NUMERIC(12,2) NOT NULL DEFAULT 0,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_order_status CHECK (
        status IN ('pending_payment','paid','processing','fulfilled','cancelled','failed')
    )
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_reference ON orders(order_reference);
