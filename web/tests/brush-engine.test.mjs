import test from 'node:test';
import assert from 'node:assert/strict';
import {
  random,
  distance,
  resample,
  demoStrokes,
  DEFAULTS,
} from '../lib/brush-engine.ts';
import { registerBrushTools } from '../lib/webmcp.ts';
test('distance-based sampling is independent of pointer event frequency', () => {
  const sparse = resample(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      5,
    ),
    dense = resample(
      Array.from({ length: 101 }, (_, x) => ({ x, y: 0 })),
      5,
    );
  assert.equal(sparse.length, dense.length);
  assert.equal(sparse.length, 21);
  sparse.forEach((p, i) => assert.ok(distance(p, dense[i]) < 1e-9));
});
test('sampling keeps its remainder through corners and repeated points', () => {
  const points = resample(
    [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 10 },
    ],
    5,
  );
  assert.deepEqual(
    points.map(({ x, y }) => ({ x, y })),
    [
      { x: 0, y: 0 },
      { x: 3, y: 2 },
      { x: 3, y: 7 },
    ],
  );
  assert.deepEqual(resample([], 5), []);
  assert.throws(() => resample([{ x: 0, y: 0 }], 0), RangeError);
});
test('pen pressure interpolates smoothly', () => {
  const p = resample(
    [
      { x: 0, y: 0, pressure: 0.2 },
      { x: 10, y: 0, pressure: 1 },
    ],
    5,
  );
  assert.ok(Math.abs(p[1].pressure - 0.6) < 1e-10);
  assert.equal(p[2].pressure, 1);
});
test('seeded compositions reproduce and have unique, finite stroke geometry', () => {
  for (const brush of ['subway', 'figures', 'gunpla']) {
    const a = demoStrokes(brush, DEFAULTS, 73),
      b = demoStrokes(brush, DEFAULTS, 73);
    assert.deepEqual(a, b);
    assert.equal(new Set(a.map((s) => s.id)).size, a.length);
    for (const s of a) {
      assert.ok(s.points.length > 10);
      assert.notEqual(s.settings, DEFAULTS);
      for (const p of s.points)
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    }
    assert.notDeepEqual(a, demoStrokes(brush, DEFAULTS, 74));
  }
});
test('random stream is stable, bounded, and changes with seed', () => {
  const a = random(83),
    b = random(83),
    c = random(84);
  let different = false;
  for (let i = 0; i < 1000; i++) {
    const n = a();
    assert.equal(n, b());
    assert.ok(n >= 0 && n < 1);
    different ||= n !== c();
  }
  assert.ok(different);
});
test('resampled points never exceed the input path length', () => {
  const rng = random(27),
    points = Array.from({ length: 100 }, () => ({
      x: rng() * 500,
      y: rng() * 500,
    }));
  const length = points
    .slice(1)
    .reduce((n, p, i) => n + distance(points[i], p), 0);
  assert.equal(resample(points, 17).length, Math.floor(length / 17) + 1);
});
test('agent tool contract validates before changing a drawing and cleans up', () => {
  const registered = new Map();
  let state = { brush: 'subway', seed: 1 },
    mutations = 0;
  const stop = registerBrushTools(
    {
      registerTool(tool, { signal }) {
        registered.set(tool.name, tool);
        signal.addEventListener('abort', () => registered.delete(tool.name));
      },
    },
    () => state,
    (brush, seed) => {
      mutations++;
      return (state = { brush, seed });
    },
  );
  assert.equal(registered.size, 2);
  const compose = registered.get('compose_drawing'),
    read = registered.get('read_drawing');
  assert.equal(read.annotations.readOnlyHint, true);
  assert.equal(compose.annotations.readOnlyHint, false);
  assert.throws(() => compose.execute({ brush: 'unknown', seed: 10 }));
  assert.throws(() => compose.execute({ brush: 'figures', seed: 0 }));
  assert.throws(() =>
    compose.execute({ brush: 'figures', seed: 10, extra: true }),
  );
  assert.equal(mutations, 0);
  assert.deepEqual(compose.execute({ brush: 'figures', seed: 91 }), {
    brush: 'figures',
    seed: 91,
  });
  assert.deepEqual(read.execute({}), state);
  assert.equal(mutations, 1);
  stop();
  assert.equal(registered.size, 0);
});
