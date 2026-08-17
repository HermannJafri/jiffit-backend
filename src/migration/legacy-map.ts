export type LegacyTarget =
  | 'customers'
  | 'heroes'
  | 'dashboard_users'
  | 'customer_addresses'
  | 'bookings'
  | 'booking_items'
  | 'legacy_booking_visits'
  | 'service_categories'
  | 'services'
  | 'invoices'
  | 'legacy_wallet_transactions'
  | 'cities'
  | 'coupons'
  | 'skip_secrets'
  | 'skip_unmapped';

export const LEGACY_TABLE_MAP: Record<string, { target: LegacyTarget; notes: string }> = {
  users: { target: 'customers', notes: 'Split by role: 0 customers, 1 heroes (legacyUserId)' },
  admin: { target: 'dashboard_users', notes: 'Ops users; passwords must be reset' },
  address: { target: 'customer_addresses', notes: 'Preserve lat/lng and city' },
  orders: { target: 'bookings', notes: 'legacyOrderId; items JSON → booking_items; status map to LEGACY_ARCHIVED unless completed/cancelled' },
  tasks: { target: 'legacy_booking_visits', notes: 'Never live assignment' },
  tags: { target: 'service_categories', notes: 'Plus service_groups as needed' },
  vendor_rates: { target: 'services', notes: 'Catalog reconstruction reference' },
  invoices: { target: 'invoices', notes: 'Preserve amounts; FY prefix continuation is a manual decision' },
  wallet_trn: { target: 'legacy_wallet_transactions', notes: 'Reconcile SUM(amount)' },
  cities: { target: 'cities', notes: 'Need a default hub per city' },
  offers: { target: 'coupons', notes: 'If still valid; else archive' },
  slots: { target: 'skip_unmapped', notes: 'Historical label only; live slots are capacity pool' },
  settings: { target: 'skip_secrets', notes: 'Do not migrate secrets' },
  track_location: { target: 'skip_unmapped', notes: 'Do not bulk-import breadcrumbs' },
};

export const REQUIRED_REHEARSAL_TABLES = ['users', 'address', 'orders', 'tasks', 'invoices', 'cities', 'admin', 'wallet_trn'] as const;

export function mapLegacyTable(table: string) {
  return LEGACY_TABLE_MAP[table] ?? { target: 'skip_unmapped' as const, notes: 'No mapping yet — log and do not drop silently' };
}
