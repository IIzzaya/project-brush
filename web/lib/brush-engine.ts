export type Brush = 'subway' | 'figures' | 'gunpla';
export type Point = { x: number; y: number; pressure?: number };
export type Settings = {
  size: number;
  density: number;
  detail: number;
  spread: number;
  lines: number;
  labels: boolean;
  color: number;
};
export type Stroke = {
  id: number;
  brush: Brush;
  points: Point[];
  settings: Settings;
  seed: number;
};
export const WIDTH = 1000,
  HEIGHT = 820;
export const PALETTES = [
  '#168775',
  '#ee6248',
  '#e3b439',
  '#507cbd',
  '#986797',
  '#263c37',
];
export const DEFAULTS: Settings = {
  size: 1,
  density: 1,
  detail: 1,
  spread: 1,
  lines: 4,
  labels: true,
  color: -1,
};
const STATIONS = [
  'Canal St',
  '14 St · Union Sq',
  'W 4 St',
  '23 St',
  'Times Sq · 42 St',
  'Grand Central',
  '59 St · Columbus Circle',
  'Lexington Av',
  'Atlantic Av',
  'Jay St · MetroTech',
  'Borough Hall',
  'Chambers St',
  'Fulton St',
  'Delancey St',
  'Essex St',
  'Bowery',
  'Prince St',
  'Spring St',
  'Broadway',
  'Queens Plaza',
];
export function random(seed: number) {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
export function resample(points: Point[], spacing: number): Point[] {
  if (!Number.isFinite(spacing) || spacing <= 0)
    throw new RangeError('Spacing must be a positive finite number');
  if (!points.length) return [];
  const out = [{ ...points[0] }];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      d = distance(a, b);
    if (!d) continue;
    let pos = spacing - carry;
    while (pos <= d) {
      const t = pos / d;
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        pressure:
          (a.pressure ?? 0.5) + ((b.pressure ?? 0.5) - (a.pressure ?? 0.5)) * t,
      });
      pos += spacing;
    }
    carry = d - (pos - spacing);
  }
  return out;
}
function poly(
  c: CanvasRenderingContext2D,
  points: number[][],
  close = false,
  fill?: string,
) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (close) c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  c.stroke();
}
function circle(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill?: string,
) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  c.stroke();
}
function smooth(c: CanvasRenderingContext2D, pts: Point[]) {
  c.beginPath();
  if (!pts.length) return;
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++)
    c.quadraticCurveTo(
      pts[i].x,
      pts[i].y,
      (pts[i].x + pts[i + 1].x) / 2,
      (pts[i].y + pts[i + 1].y) / 2,
    );
  if (pts.length > 1) c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  c.stroke();
}
function offsetPoints(pts: Point[], offset: number) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(pts.length - 1, i + 1)];
    const theta = Math.atan2(b.y - a.y, b.x - a.x);
    return {
      x: p.x - Math.sin(theta) * offset,
      y: p.y + Math.cos(theta) * offset,
    };
  });
}
function ink(s: Stroke, i = 0) {
  return PALETTES[
    s.settings.color < 0 ? (i + s.seed) % PALETTES.length : s.settings.color
  ];
}
function subway(c: CanvasRenderingContext2D, s: Stroke) {
  const { size, lines, labels, density, spread } = s.settings;
  const pts = s.points.length > 2 ? resample(s.points, 8) : s.points;
  if (pts.length < 2) {
    c.strokeStyle = ink(s);
    circle(c, pts[0]?.x ?? 0, pts[0]?.y ?? 0, 4 * size, '#fff');
    return;
  }
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let k = 0; k < lines; k++) {
    const offset = (k - (lines - 1) / 2) * 6 * size * spread;
    const route = offsetPoints(pts, offset);
    c.strokeStyle = '#fff';
    c.lineWidth = 5.1 * size;
    smooth(c, route);
    c.strokeStyle = ink(s, k);
    c.lineWidth = 2.8 * size;
    smooth(c, route);
    const stops = resample(route, (68 * size) / density);
    stops.forEach((p, j) => {
      c.strokeStyle = ink(s, k);
      c.lineWidth = 1.1 * size;
      circle(c, p.x, p.y, 2.2 * size, '#fff');
      if (labels && k === 0 && j % 2 === 1) {
        c.font = `${8.5 * size}px Arial`;
        c.textAlign = 'left';
        const text = STATIONS[(j + s.seed) % STATIONS.length];
        c.lineWidth = 4;
        c.strokeStyle = '#fff';
        c.strokeText(text, p.x + 10 * size, p.y - 21 * size);
        c.fillStyle = '#374841';
        c.fillText(text, p.x + 10 * size, p.y - 21 * size);
        c.fillStyle = ink(s, k);
        c.font = `bold ${6.5 * size}px Arial`;
        c.fillText(
          ['A C E', 'N Q R W', '4 5 6', 'B D F M'][j % 4],
          p.x + 10 * size,
          p.y - 11 * size,
        );
      }
    });
    const end = route[route.length - 1];
    c.strokeStyle = '#fff';
    c.lineWidth = 1.5;
    circle(c, end.x, end.y, 5.2 * size, ink(s, k));
  }
  if (labels) {
    const stops = resample(pts, (260 * size) / density);
    stops.slice(1).forEach((p) => {
      c.strokeStyle = '#263c37';
      c.lineWidth = 1;
      circle(c, p.x, p.y, 4.4 * size, '#fff');
      circle(c, p.x, p.y, 1.8 * size, '#263c37');
    });
  }
}
// Procedural elevation symbols: outlines remain upright along the gesture.
function figure(
  c: CanvasRenderingContext2D,
  kind: number,
  phase: number,
  detail: number,
) {
  c.lineWidth = 0.85;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const sway = Math.sin(phase) * 1.3;
  if (kind === 5) {
    circle(c, -2, -33, 3.6, '#fff');
    poly(
      c,
      [
        [-5, -28],
        [-7, -15],
        [7, -14],
        [15, -4],
        [19, -5],
        [11, -20],
        [2, -21],
        [2, -28],
      ],
      true,
      '#fff',
    );
    circle(c, -3, -9, 9);
    poly(c, [
      [-1, -17],
      [-1, -8],
      [10, -8],
    ]);
    return;
  }
  if (kind === 6) {
    poly(c, [
      [-12, -9],
      [-6, -16],
      [5, -15],
      [10, -20],
      [14, -18],
      [13, -11],
      [8, -8],
      [7, 0],
      [4, 0],
      [2, -7],
      [-5, -6],
      [-8, 0],
      [-11, 0],
      [-9, -8],
      [-16, -12],
    ]);
    return;
  }
  circle(c, sway, -43, 3.3, '#fff');
  const walk = kind === 1 || kind === 3;
  const dress = kind === 2;
  const stride = walk ? 8 + Math.sin(phase) * 2 : 3;
  if (kind === 4) {
    poly(
      c,
      [
        [-3, -37],
        [-7, -33],
        [-14, -43],
        [-17, -42],
        [-9, -28],
        [-6, -27],
        [-5, -18],
        [-7, 0],
        [-3, 0],
        [1, -16],
        [3, 0],
        [7, 0],
        [6, -27],
        [13, -32],
        [18, -44],
        [15, -46],
        [10, -36],
        [4, -38],
      ],
      true,
      '#fff',
    );
  } else {
    poly(
      c,
      [
        [-3 + sway, -38],
        [-6, -34],
        [-10, -22],
        [-8, -20],
        [-4, -29],
        [-4, -20],
        [-stride - 3, 0],
        [-stride + 1, 0],
        [1, -17],
        [stride - 1, 0],
        [stride + 3, 0],
        [5, -21],
        [4, -30],
        [9, -23],
        [11, -25],
        [6, -35],
        [3 + sway, -38],
      ],
      true,
      '#fff',
    );
  }
  if (dress)
    poly(
      c,
      [
        [-4, -29],
        [-10, -12],
        [10, -12],
        [4, -29],
      ],
      true,
      '#fff',
    );
  if (detail > 1.1) {
    poly(c, [
      [-3, -32],
      [3, -32],
    ]);
    poly(c, [
      [-2, -24],
      [3, -24],
    ]);
  }
  if (kind === 3) {
    c.strokeRect(9, -20, 9, 12);
    poly(c, [
      [11, -20],
      [11, -23],
      [16, -23],
      [16, -20],
    ]);
  }
}
function figures(c: CanvasRenderingContext2D, s: Stroke, time: number) {
  const rng = random(s.seed),
    { size, density, labels, detail } = s.settings;
  const pts = resample(s.points, (26 * size) / density);
  pts.forEach((p, i) => {
    const kind = Math.floor(rng() * 7),
      scale = size * (0.74 + rng() * 0.4) * (0.8 + (p.pressure ?? 0.5) * 0.4);
    c.save();
    c.translate(p.x, p.y);
    c.scale(scale, scale);
    c.strokeStyle = s.settings.color < 0 ? '#55718c' : ink(s);
    figure(c, kind, time * 1.6 + i, detail);
    c.restore();
    if (labels && i % 8 === 0) {
      c.fillStyle = '#82918e';
      c.font = `${7 * size}px monospace`;
      c.fillText(
        `P—${String(i + 1).padStart(2, '0')}`,
        p.x - 7,
        p.y + 13 * size,
      );
    }
  });
  if (detail > 0.7 && pts.length > 2) {
    c.save();
    c.setLineDash([2, 5]);
    c.strokeStyle = '#c5cfcb';
    c.lineWidth = 0.6;
    smooth(c, pts);
    c.restore();
  }
}
const PARTS = [
  [
    [-15, -23],
    [8, -25],
    [19, -13],
    [13, 20],
    [-7, 26],
    [-19, 11],
    [-15, -23],
  ],
  [
    [-11, -26],
    [11, -26],
    [14, -16],
    [9, -7],
    [13, 19],
    [7, 27],
    [-9, 24],
    [-15, 12],
    [-10, -6],
    [-15, -17],
  ],
  [
    [-23, -12],
    [-10, -22],
    [15, -20],
    [25, -8],
    [16, 0],
    [18, 12],
    [5, 21],
    [-12, 13],
    [-16, 1],
  ],
  [
    [-8, -29],
    [7, -27],
    [10, -10],
    [18, 2],
    [17, 23],
    [8, 28],
    [-14, 25],
    [-19, 16],
    [-17, -2],
    [-8, -10],
  ],
  [
    [-24, -8],
    [-11, -12],
    [-7, -21],
    [6, -21],
    [11, -12],
    [24, -8],
    [21, 11],
    [8, 16],
    [-9, 16],
    [-21, 9],
  ],
];
function component(
  c: CanvasRenderingContext2D,
  type: number,
  detail: number,
  color: string,
) {
  const outline = PARTS[type % PARTS.length];
  c.lineWidth = 0.9;
  c.lineJoin = 'miter';
  c.strokeStyle = color;
  poly(
    c,
    outline.map(([x, y]) => [x + 4, y - 3]),
    true,
    '#f0f2ef',
  );
  outline.forEach(([x, y], i) => {
    if (i % 2 === 0)
      poly(c, [
        [x, y],
        [x + 4, y - 3],
      ]);
  });
  poly(c, outline, true, '#fdfdfb');
  c.lineWidth = 0.65;
  poly(
    c,
    outline.map(([x, y]) => [x * 0.69, y * 0.69]),
    true,
  );
  circle(c, 0, 0, type % 2 ? 4 : 6);
  circle(c, 0, 0, 1.6);
  if (detail > 0.6) {
    poly(
      c,
      [
        [-5, -16],
        [5, -16],
        [7, -9],
        [-5, -9],
      ],
      true,
    );
    poly(c, [
      [-6, 12],
      [6, 12],
    ]);
    poly(c, [
      [-6, 15],
      [6, 15],
    ]);
  }
  if (detail > 1.1) {
    for (let j = 0; j < 4; j++)
      poly(c, [
        [9 + j * 1.5, 2],
        [10 + j * 1.5, 8],
      ]);
    circle(c, -8, 6, 1.4);
  }
}
function gunpla(c: CanvasRenderingContext2D, s: Stroke) {
  const rng = random(s.seed),
    { size, density, detail, labels, spread } = s.settings;
  const pts = resample(s.points, (68 * size) / density);
  c.lineCap = 'square';
  c.lineJoin = 'round';
  if (pts.length > 1) {
    c.strokeStyle = '#b4bdb5';
    c.lineWidth = 3.5 * size;
    smooth(c, s.points);
    c.strokeStyle = '#f7f8f4';
    c.lineWidth = 1.5 * size;
    smooth(c, s.points);
  }
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(pts.length - 1, i + 1)];
    const theta = Math.atan2(b.y - a.y, b.x - a.x);
    const side = i % 2 ? 1 : -1;
    const offset = 35 * size * spread * side;
    const x = p.x - Math.sin(theta) * offset,
      y = p.y + Math.cos(theta) * offset;
    c.strokeStyle = '#b0b8ae';
    c.lineWidth = 2 * size;
    poly(c, [
      [p.x, p.y],
      [x, y],
    ]);
    c.save();
    c.translate(x, y);
    c.rotate((rng() - 0.5) * 0.65);
    c.scale(size, size);
    component(
      c,
      Math.floor(rng() * PARTS.length),
      detail,
      s.settings.color < 0 ? '#647265' : ink(s),
    );
    c.restore();
    if (labels) {
      c.strokeStyle = '#8d9c88';
      c.lineWidth = 0.5;
      c.strokeRect(x + 20 * size, y - 26 * size, 21 * size, 12 * size);
      c.font = `${7 * size}px monospace`;
      c.fillStyle = '#687660';
      c.fillText(
        `${String.fromCharCode(65 + (s.seed % 4))}${i + 1}`,
        x + 23 * size,
        y - 17 * size,
      );
    }
  });
}
export function renderStroke(c: CanvasRenderingContext2D, s: Stroke, time = 0) {
  if (!s.points.length) return;
  c.save();
  if (s.brush === 'subway') subway(c, s);
  else if (s.brush === 'figures') figures(c, s, time);
  else gunpla(c, s);
  c.restore();
}
export function demoStrokes(
  brush: Brush,
  settings: Settings,
  seed: number,
): Stroke[] {
  const rng = random(seed),
    result: Stroke[] = [];
  const add = (points: number[][], index: number) =>
    result.push({
      id: seed * 100 + index,
      brush,
      settings: { ...settings },
      seed: seed + index,
      points: resample(
        points.map(([x, y]) => ({ x, y, pressure: 0.5 })),
        5,
      ),
    });
  if (brush === 'subway') {
    const routes = [
      [
        [150, 235],
        [250, 335],
        [380, 335],
        [455, 410],
        [600, 410],
        [650, 460],
        [800, 460],
        [850, 410],
        [850, 295],
      ],
      [
        [280, 175],
        [280, 270],
        [370, 360],
        [370, 515],
        [440, 585],
        [650, 585],
        [720, 515],
        [830, 515],
      ],
      [
        [135, 400],
        [205, 330],
        [300, 330],
        [470, 500],
        [635, 500],
        [745, 610],
        [835, 610],
      ],
      [
        [185, 545],
        [265, 465],
        [265, 425],
        [390, 300],
        [555, 300],
        [610, 245],
        [760, 245],
      ],
      [
        [410, 195],
        [475, 260],
        [475, 430],
        [560, 515],
        [560, 645],
        [620, 705],
      ],
    ];
    routes.forEach((p, i) =>
      add(
        p.map(([x, y]) => [
          x + (seed === 12 ? 0 : (rng() - 0.5) * 40),
          y + (seed === 12 ? 0 : (rng() - 0.5) * 35),
        ]),
        i,
      ),
    );
  } else if (brush === 'figures') {
    for (let j = 0; j < 7; j++) {
      const pts = [];
      for (let i = 0; i < 9; i++)
        pts.push([
          180 + i * 80 + (j % 2) * 18,
          240 + j * 62 + Math.sin(i * 0.7 + j) * 25,
        ]);
      add(pts, j);
    }
  } else {
    for (let j = 0; j < 4; j++)
      add(
        [
          [190, 225 + j * 125],
          [335, 225 + j * 125],
          [395, 255 + j * 125],
          [615, 255 + j * 125],
          [665, 225 + j * 125],
          [815, 225 + j * 125],
        ],
        j,
      );
  }
  return result;
}
