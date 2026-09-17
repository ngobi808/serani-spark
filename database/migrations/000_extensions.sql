-- 000_extensions.sql
-- Required for gen_random_uuid() used as the default for every id column.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
