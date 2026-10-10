import test from 'node:test';
import assert from 'node:assert/strict';
import { clampHeroBuddyPoint } from './heroBuddyPosition';

test('floating assistant clamps to its measured desktop dimensions', () => {
  assert.deepEqual(
    clampHeroBuddyPoint({ x: 1500, y: 900 }, { width: 1280, height: 800 }, { width: 400, height: 320 }),
    { x: 872, y: 472 },
  );
  assert.deepEqual(
    clampHeroBuddyPoint({ x: 180, y: 200 }, { width: 1280, height: 800 }, { width: 400, height: 320 }),
    { x: 180, y: 200 },
  );
});

test('mobile and reopened panels remain within the viewport after resizing', () => {
  const previous = { x: 850, y: 610 };
  assert.deepEqual(
    clampHeroBuddyPoint(previous, { width: 375, height: 667 }, { width: 320, height: 600 }),
    { x: 47, y: 59 },
  );
  assert.deepEqual(
    clampHeroBuddyPoint(previous, { width: 375, height: 667 }, { width: 280, height: 240 }),
    { x: 87, y: 419 },
  );
});

test('negative, non-finite and oversized layouts cannot generate offscreen negative CSS positions', () => {
  assert.deepEqual(
    clampHeroBuddyPoint({ x: -150, y: Number.NaN }, { width: 375, height: 667 }, { width: 320, height: 600 }),
    { x: 8, y: 8 },
  );
  assert.deepEqual(
    clampHeroBuddyPoint({ x: 99, y: 99 }, { width: 280, height: 300 }, { width: 320, height: 350 }),
    { x: 0, y: 0 },
  );
});
