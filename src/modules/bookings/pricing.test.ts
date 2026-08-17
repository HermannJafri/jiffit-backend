import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { priceBookingItemsFromCatalog, resolveDurationMinutes, AuthoritativePricingError } from './pricing';

const service = {
  id: 1,
  name: 'Car Cleaning',
  description: 'Exterior',
  price: 499,
  taxMode: 'PERCENTAGE',
  taxValue: 5,
  isActive: true,
};

describe('priceBookingItemsFromCatalog', () => {
  it('ignores client prices and applies catalog tax', () => {
    const priced = priceBookingItemsFromCatalog(
      [{ name: 'hack', serviceId: 1, unitPrice: 1, totalAmount: 1, quantity: 2 }],
      [service],
      [],
    );
    assert.equal(priced[0].unitPrice, 499);
    assert.equal(priced[0].totalAmount, 998);
    assert.equal(priced[0].taxAmount, 49.9);
    assert.equal(priced[0].clientPriceMatched, false);
  });

  it('uses variant singlePrice over service price', () => {
    const priced = priceBookingItemsFromCatalog(
      [{ name: 'x', serviceId: 1, serviceVariantId: 9, unitPrice: 799, totalAmount: 799, quantity: 1 }],
      [service],
      [{ id: 9, serviceId: 1, name: 'SUV', description: null, singlePrice: 799, mrp: 999, isActive: true, service }],
    );
    assert.equal(priced[0].unitPrice, 799);
    assert.equal(priced[0].name, 'Car Cleaning - SUV');
  });

  it('rejects inactive catalog rows', () => {
    assert.throws(
      () =>
        priceBookingItemsFromCatalog(
          [{ name: 'x', serviceId: 1, unitPrice: 499, totalAmount: 499 }],
          [{ ...service, isActive: false }],
          [],
        ),
      (error: unknown) => error instanceof AuthoritativePricingError && error.code === 'CATALOG_ITEM_INVALID',
    );
  });
});

describe('resolveDurationMinutes', () => {
  it('multiplies quantity and prefers variant duration', () => {
    assert.equal(
      resolveDurationMinutes(
        [{ serviceId: 1, serviceVariantId: 2, quantity: 2 }],
        [{ id: 1, duration: 45 }],
        [{ id: 2, durationMinutes: 60 }],
      ),
      120,
    );
  });
});
