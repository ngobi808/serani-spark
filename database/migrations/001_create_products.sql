-- 001_create_products.sql
-- Core catalogue table. Note cost_price_kes is ADMIN-ONLY and must never be
-- returned by any public-facing API endpoint (see backend/src/controllers/productController.ts).

CREATE TABLE products (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    category          VARCHAR(100) NOT NULL,
    sku               VARCHAR(100) UNIQUE,

    packaging_unit    VARCHAR(50) NOT NULL,       -- e.g. 'bale', 'dozen', 'carton', 'pack'
    units_per_package  INTEGER,                    -- individual items inside one packaging unit

    selling_price_kes NUMERIC(12,2) NOT NULL,      -- price of ONE packaging unit (public)
    cost_price_kes    NUMERIC(12,2),                -- buying price (ADMIN ONLY, never public)

    moq               INTEGER NOT NULL DEFAULT 1,  -- minimum order quantity, in packaging units
    stock_quantity    INTEGER NOT NULL DEFAULT 0,  -- physical stock, admin-controlled, in packaging units

    image_urls        TEXT[] DEFAULT '{}',
    is_active         BOOLEAN NOT NULL DEFAULT true,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('english', name));

COMMENT ON COLUMN products.cost_price_kes IS 'ADMIN ONLY. Never expose via public API. Used for gross profit/margin reporting (Metabase-ready).';
