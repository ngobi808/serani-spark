-- 012_create_customer_accounts.sql
--
-- Adds real customer accounts (email + password), separate from the existing
-- `customers` table, which stays exactly as it was: a per-order snapshot of
-- contact/delivery details, written on every checkout, guest or not.
--
-- customer_accounts is the new, persistent thing: one row per person who has
-- registered. Orders link to it via a nullable customer_account_id, so guest
-- checkout (no account) keeps working exactly as before.

CREATE TABLE customer_accounts (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                 VARCHAR(255) UNIQUE NOT NULL,
    password_hash         VARCHAR(255) NOT NULL,

    business_name         VARCHAR(255),
    contact_name          VARCHAR(255) NOT NULL,
    phone_number          VARCHAR(20) NOT NULL,
    mpesa_phone_number    VARCHAR(20),
    delivery_zone         VARCHAR(100),
    address               TEXT,
    landmark              VARCHAR(255),
    city_or_county        VARCHAR(100),

    reset_token_hash      VARCHAR(255),
    reset_token_expires_at TIMESTAMPTZ,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at         TIMESTAMPTZ
);

CREATE INDEX idx_customer_accounts_email ON customer_accounts(LOWER(email));

-- Links an order to a registered account. NULL means it was a guest checkout.
ALTER TABLE orders ADD COLUMN customer_account_id UUID REFERENCES customer_accounts(id);

-- Lets a GUEST optionally receive an order-confirmation email without registering.
ALTER TABLE customers ADD COLUMN email VARCHAR(255);
