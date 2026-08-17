import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { slugify } from './slug';

describe('slugify', () => {
  it('turns names into URL slugs', () => {
    assert.equal(slugify('Car Cleaning'), 'car-cleaning');
  });

  it('falls back when the name has no latin characters', () => {
    assert.equal(slugify('!!!'), 'item');
  });
});
