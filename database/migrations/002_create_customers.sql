-- 002_create_customers.sql
-- No login/auth for customers in MVP (guest checkout). This table just captures
-- delivery/contact details per order so support can arrange delivery and Metabase
-- can eventually compute repeat-customer metrics by phone_number.

CREATE TABLE customers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name       VARCHAR(255),
    contact_name        VARCHAR(255) NOT NULL,
    phone_number        VARCHAR(20) NOT NULL,
    mpesa_phone_number  VARCHAR(20) NOT NULL,

    delivery_zone       VARCHAR(100),
    address             TEXT,
    landmark            VARCHAR(255),
    city_or_county      VARCHAR(100),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_phone ON customers(phone_number);
