/**
 * Who can do what. This is the ONLY place role rules live. The backend enforces
 * these on every route, and sends the list to the frontend (via GET /admin/me)
 * purely so the UI can hide buttons a person can't use. Hiding a button is
 * cosmetic; the backend check is the real lock.
 *
 * To change what a role can do, edit ROLE_PERMISSIONS below. Nothing else needs to move.
 */

export const ROLES = ['owner', 'operations', 'finance'] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | 'dashboard:view'        // order-count tiles on the dashboard
  | 'reports:view'          // sales totals, profit, sales report, product sales history
  | 'costs:view'            // buying prices and margins
  | 'products:view'
  | 'products:edit'         // create products and edit their details (never cost price, see costs:view)
  | 'products:deactivate'
  | 'stock:adjust'          // stock take and quick stock corrections
  | 'orders:view'
  | 'orders:update_status'
  | 'orders:delete'
  | 'discounts:manage'
  | 'users:manage';

const ALL: Permission[] = [
  'dashboard:view', 'reports:view', 'costs:view',
  'products:view', 'products:edit', 'products:deactivate', 'stock:adjust',
  'orders:view', 'orders:update_status', 'orders:delete',
  'discounts:manage', 'users:manage',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // Everything, including managing other people's accounts.
  owner: ALL,

  // Day-to-day running: fulfil orders, keep stock and product details right.
  // Cannot see buying prices, profit or sales totals, and cannot delete anything.
  operations: [
    'dashboard:view',
    'products:view', 'products:edit', 'stock:adjust',
    'orders:view', 'orders:update_status',
  ],

  // Read-only view of the money side: sales, cost, profit, reports. Changes nothing.
  finance: [
    'dashboard:view', 'reports:view', 'costs:view',
    'products:view',
    'orders:view',
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  operations: 'Operations & Support',
  finance: 'Finance',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function permissionsFor(role: string): Permission[] {
  return isRole(role) ? ROLE_PERMISSIONS[role] : [];
}

export function hasPermission(role: string | undefined, permission: Permission): boolean {
  return !!role && permissionsFor(role).includes(permission);
}
