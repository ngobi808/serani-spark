-- 005_create_payments.sql
-- One row per STK Push attempt. An order can have multiple rows if a customer
-- retries after a failed/expired attempt. mpesa_receipt_number is the source of
-- truth for "was this actually paid" and is set only from the verified Daraja callback.

CREATE TABLE payments (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id               UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    checkout_request_id    VARCHAR(100) UNIQUE,   -- Daraja CheckoutRequestID, used to match callback to attempt
    merchant_request_id    VARCHAR(100),

    amount_kes             NUMERIC(12,2) NOT NULL,
    phone_number           VARCHAR(20) NOT NULL,

    status                 VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- allowed: pending | confirmed | failed

    mpesa_receipt_number   VARCHAR(50),           -- set only on confirmed callback
    result_code            INTEGER,               -- raw Daraja ResultCode, kept for debugging
    result_desc            TEXT,

    raw_callback_payload   JSONB,                 -- store the full callback for audit/debugging

    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_payment_status CHECK (status IN ('pending','confirmed','failed'))
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_checkout_request ON payments(checkout_request_id);
CREATE INDEX idx_payments_status ON payments(status);
