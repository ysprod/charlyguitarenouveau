import assert from 'node:assert/strict';
import test from 'node:test';

import { COURSE_PACKS, getCoursePack } from './course-packs.js';

test('keeps the payable course pack prices aligned with the published offers', () => {
  assert.deepEqual(
    COURSE_PACKS.map(({ id, priceXof }) => [id, priceXof]),
    [
      ['deb-jeune', 100_000],
      ['deb-adulte', 120_000],
      ['deb-premium', 200_000],
      ['int-jeune', 90_000],
      ['int-adulte', 110_000],
      ['int-premium', 160_000],
      ['solo-jeune', 70_000],
      ['solo-adulte', 80_000],
      ['solo-premium', 150_000],
      ['chan-jeune', 140_000],
      ['chan-adulte', 160_000],
      ['chan-premium', 250_000],
    ],
  );
  assert.equal(getCoursePack('not-a-pack'), undefined);
  assert.equal(getCoursePack(undefined), undefined);
});
