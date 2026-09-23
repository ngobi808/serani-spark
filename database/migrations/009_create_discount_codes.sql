-- 009_create_discount_codes.sql
--
-- Simple launch discount codes (e.g. LAUNCH10 = 10% off). Deliberately basic —
-- no per-affiliate attribution or commission tracking. If that's ever needed later,
-- this table's `code` field is the natural place to add an `owner_name` or
-- `commission_percent` column without breaking anything built now.

CREATE TABLE discount_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(30) UNIQUE NOT NULL,   -- stored uppercase, matched case-insensitively
    discount_type   VARCHAR(10) NOT NULL,           -- 'percent' | 'fixed'
    discount_value  NUMERIC(10,2) NOT NULL,         -- e.g. 10 for 10%, or 500 for KSh 500 off
    max_uses        INTEGER,                        -- NULL = unlimited
    used_count      INTEGER NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ,                    -- NULL = never expires
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_discount_type CHECK (discount_type IN ('percent', 'fixed'))
);

CREATE INDEX idx_discount_codes_code ON discount_codes(UPPER(code));

-- Record what discount (if any) an order actually used, snapshotted so it stays
-- accurate even if the code is later edited or deactivated.
ALTER TABLE orders ADD COLUMN discount_code VARCHAR(30);
ALTER TABLE orders ADD COLUMN discount_amount_kes NUMERIC(12,2) NOT NULL DEFAULT 0;
