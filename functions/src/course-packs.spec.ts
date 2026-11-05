import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COURSE_PACKS,
  getCoursePack,
  getCoursePackManualBenefit,
} from './course-packs.js';

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

test('grants only published document credits and explicit premium durations', () => {
  assert.deepEqual(
    COURSE_PACKS.map(({ id, documentCredits, gameAccessMonths }) => [
      id,
      documentCredits,
      gameAccessMonths,
    ]),
    [
      ['deb-jeune', 1, 0],
      ['deb-adulte', 2, 3],
      ['deb-premium', 4, 12],
      ['int-jeune', 0, 0],
      ['int-adulte', 1, 0],
      ['int-premium', 4, 0],
      ['solo-jeune', 0, 0],
      ['solo-adulte', 1, 0],
      ['solo-premium', 3, 12],
      ['chan-jeune', 2, 0],
      ['chan-adulte', 4, 0],
      ['chan-premium', 5, 12],
    ],
  );
  assert.equal(
    getCoursePackManualBenefit('int-premium', 'platform-premium-duration')
      ?.title,
    'Accès premium à la plateforme — durée à préciser',
  );
  assert.equal(
    getCoursePackManualBenefit('deb-premium', 'masterclasses')?.title,
    'Accès aux masterclass',
  );
  assert.equal(
    getCoursePackManualBenefit('chan-jeune', 'age-appropriate-repertoire')
      ?.title,
    'Répertoire adapté à l’âge',
  );
  assert.equal(
    getCoursePackManualBenefit('deb-jeune', 'masterclasses'),
    undefined,
  );
});
