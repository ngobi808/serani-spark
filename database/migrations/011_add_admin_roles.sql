-- 011_add_admin_roles.sql
--
-- Multi-admin support. Safe to run BEFORE deploying the new code: it only adds
-- columns with defaults, which the currently-live code simply ignores.
--
-- The existing admin account (the only one today) becomes the 'owner', because
-- ADD COLUMN ... DEFAULT 'owner' backfills existing rows. Afterwards the default
-- for NEW rows is switched to the least-privileged role, so an admin inserted by
-- hand in SQL can never accidentally become an owner.

ALTER TABLE admin_users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'owner';
ALTER TABLE admin_users ADD CONSTRAINT chk_admin_role CHECK (role IN ('owner', 'operations', 'finance'));
ALTER TABLE admin_users ALTER COLUMN role SET DEFAULT 'operations';

-- Deactivating an account takes effect on the very next request.
ALTER TABLE admin_users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Set when an owner creates an account or resets a password: the person must
-- choose their own password before they can do anything else.
ALTER TABLE admin_users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
