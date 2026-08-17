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
  tags: { target: 'skip_unmapped', notes: 'Excluded from live activation: legacy hierarchy is only a catalog reconstruction reference' },
  vendor_rates: { target: 'skip_unmapped', notes: 'Excluded from live activation: rates require explicit product review and mapping to the reconstructed catalog' },
  invoices: { target: 'invoices', notes: 'Preserve amounts; FY prefix continuation is a manual decision' },
  wallet_trn: { target: 'legacy_wallet_transactions', notes: 'Reconcile SUM(amount)' },
  cities: { target: 'cities', notes: 'Need a default hub per city' },
  offers: { target: 'skip_unmapped', notes: 'Excluded: expired/legacy promotion rules must not become active coupons' },
  slots: { target: 'skip_unmapped', notes: 'Historical label only; live slots are capacity pool' },
  settings: { target: 'skip_secrets', notes: 'Do not migrate secrets' },
  track_location: { target: 'skip_unmapped', notes: 'Excluded: stale high-volume location telemetry is not operational state and carries privacy risk' },
  banners: { target: 'skip_unmapped', notes: 'Excluded from activation pending editorial review; source remains in the immutable dump' },
  blog_authors: { target: 'skip_unmapped', notes: 'Excluded with legacy editorial content; no operational dependency' },
  blog_cats: { target: 'skip_unmapped', notes: 'Excluded with legacy editorial content; no operational dependency' },
  blogs: { target: 'skip_unmapped', notes: 'Excluded from activation pending editorial review' },
  faqs: { target: 'skip_unmapped', notes: 'Excluded from activation pending editorial review' },
  pages: { target: 'skip_unmapped', notes: 'Excluded from activation pending editorial review' },
  testimonials: { target: 'skip_unmapped', notes: 'Excluded from activation pending editorial review' },
  messages: { target: 'skip_unmapped', notes: 'Excluded: legacy support messages are not part of the v1 support cutover' },
  courses: { target: 'skip_unmapped', notes: 'Excluded: no active course rows or target operational dependency' },
  currency: { target: 'skip_unmapped', notes: 'Excluded: replaced by application currency configuration' },
  language: { target: 'skip_unmapped', notes: 'Excluded: replaced by application language configuration' },
  migrations: { target: 'skip_unmapped', notes: 'Excluded: legacy framework migration metadata is not business data' },
  orderstats: { target: 'skip_unmapped', notes: 'Excluded: derived status lookup replaced by the target booking-status enum' },
  permission_role: { target: 'skip_unmapped', notes: 'Excluded: legacy authorization model is incompatible with target RBAC' },
  permissions: { target: 'skip_unmapped', notes: 'Excluded: legacy authorization model is incompatible with target RBAC' },
  roles: { target: 'skip_unmapped', notes: 'Excluded: legacy authorization model is incompatible with target RBAC' },
  vendor_photos: { target: 'skip_unmapped', notes: 'Excluded: orphaned legacy vendor media reference with no live vendor target' },
  vendor_tags: { target: 'skip_unmapped', notes: 'Excluded: legacy vendor/catalog join is retained only as reconstruction reference' },
  vendor_types: { target: 'skip_unmapped', notes: 'Excluded: legacy vendor taxonomy is not used by the target operating model' },
  vpushes: { target: 'skip_unmapped', notes: 'Excluded: historical push queue must never be replayed' },
};

export const REQUIRED_REHEARSAL_TABLES = ['users', 'address', 'orders', 'tasks', 'invoices', 'cities', 'admin', 'wallet_trn'] as const;

export function mapLegacyTable(table: string) {
  return LEGACY_TABLE_MAP[table] ?? {
    target: 'skip_unmapped' as const,
    notes: 'Excluded: no target business entity or cutover dependency; retained in the immutable source dump',
  };
}
