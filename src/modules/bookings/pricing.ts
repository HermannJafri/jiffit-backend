export function money(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round((parsed + Number.EPSILON) * 100) / 100 : Number.NaN;
}

export function calculateTax(total: number, quantity: number, mode: string, value: unknown): number {
  const taxValue = money(value);
  if (!Number.isFinite(taxValue) || taxValue <= 0) return 0;
  if (mode === 'PERCENTAGE') return money((total * taxValue) / 100);
  if (mode === 'FIXED') return money(taxValue * quantity);
  return 0;
}

export interface ClientBookingItemPriceHint {
  serviceId?: number;
  serviceVariantId?: number;
  name: string;
  description?: string;
  quantity?: number;
  unitPrice: number;
  taxAmount?: number;
  totalAmount: number;
}

export interface AuthoritativeBookingItem {
  serviceId: number;
  serviceVariantId?: number;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  totalAmount: number;
  clientPriceMatched: boolean;
}

export class AuthoritativePricingError extends Error {
  constructor(
    public readonly code: 'CATALOG_ITEM_INVALID' | 'CATALOG_PRICE_UNAVAILABLE',
    message: string,
  ) {
    super(message);
    this.name = 'AuthoritativePricingError';
  }
}

type CatalogService = {
  id: number;
  name: string;
  description: string | null;
  price: unknown;
  taxMode: string;
  taxValue: unknown;
  isActive: boolean;
};

type CatalogVariant = {
  id: number;
  serviceId: number;
  name: string;
  description: string | null;
  singlePrice: unknown;
  mrp: unknown;
  isActive: boolean;
  service: CatalogService;
};

export function priceBookingItemsFromCatalog(
  items: ClientBookingItemPriceHint[],
  services: CatalogService[],
  variants: CatalogVariant[],
): AuthoritativeBookingItem[] {
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  return items.map((item) => {
    const quantity = Math.max(1, Math.trunc(Number(item.quantity ?? 1)));
    const variant = item.serviceVariantId ? variantsById.get(item.serviceVariantId) : undefined;
    const service = variant?.service ?? (item.serviceId ? servicesById.get(item.serviceId) : undefined);
    if (!service || !service.isActive || (item.serviceId && service.id !== item.serviceId)) {
      throw new AuthoritativePricingError('CATALOG_ITEM_INVALID', 'Selected service is unavailable');
    }
    if (item.serviceVariantId && (!variant || !variant.isActive || variant.serviceId !== service.id)) {
      throw new AuthoritativePricingError('CATALOG_ITEM_INVALID', 'Selected service option is unavailable');
    }
    const price = variant ? money(variant.singlePrice ?? variant.mrp) : money(service.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new AuthoritativePricingError('CATALOG_PRICE_UNAVAILABLE', 'Selected service does not have an active price');
    }
    const totalAmount = money(price * quantity);
    const taxAmount = calculateTax(totalAmount, quantity, service.taxMode, service.taxValue);
    return {
      serviceId: service.id,
      serviceVariantId: variant?.id,
      name: variant ? `${service.name} - ${variant.name}` : service.name,
      description: variant?.description ?? service.description ?? undefined,
      quantity,
      unitPrice: price,
      taxAmount,
      totalAmount,
      clientPriceMatched: money(item.unitPrice) === price && money(item.totalAmount) === totalAmount,
    };
  });
}

export function resolveDurationMinutes(
  items: { serviceId?: number | null; serviceVariantId?: number | null; quantity?: number | null }[],
  services: { id: number; duration: number | null }[],
  variants: { id: number; durationMinutes: number }[],
): number {
  if (items.length === 0) return 60;
  const serviceDurationById = new Map(services.map((service) => [service.id, service.duration]));
  const variantDurationById = new Map(variants.map((variant) => [variant.id, variant.durationMinutes]));
  return items.reduce((total, item) => {
    const variantDuration = item.serviceVariantId != null ? variantDurationById.get(item.serviceVariantId) : undefined;
    const serviceDuration = item.serviceId != null ? serviceDurationById.get(item.serviceId) : undefined;
    const unitDuration = variantDuration ?? serviceDuration ?? 60;
    return total + unitDuration * Math.max(1, Math.trunc(item.quantity ?? 1));
  }, 0);
}

export function resolveRequiredWorkers(workerCounts: Array<number | null | undefined>): number {
  return Math.max(1, ...workerCounts.map((count) => count ?? 1));
}

export function isOnlinePaymentMethod(method?: string | null): boolean {
  const normalized = (method ?? '').trim().toUpperCase();
  return normalized === 'ONLINE' || normalized === 'UPI' || normalized === 'CARD' || normalized === 'RAZORPAY' || normalized === 'ZOHO';
}

export function isPackageVariant(variant: { totalVisits?: number | null; visitsPerMonth?: number | null; validityDays?: number | null }): boolean {
  return (variant.totalVisits ?? variant.visitsPerMonth ?? 1) > 1 || (variant.validityDays ?? 1) > 1;
}
