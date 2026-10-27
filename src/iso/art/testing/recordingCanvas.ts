import { createHash } from 'node:crypto';

/*
 * Test-only canvas shim for Node (Vitest): `document.createElement('canvas')`
 * returns a fake whose 2D context records every method call and property
 * write. Painters that only draw (no pixel read-back) are then fully
 * described by their draw log, so a hash of it pins their output.
 * The transform is tracked so getTransform() / DOMPoint work as in a
 * browser. getImageData returns transparent pixels.
 */

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

class FakePoint {
  constructor(
    readonly x = 0,
    readonly y = 0,
  ) {}
}

class FakeMatrix {
  constructor(private readonly m: Matrix) {}
  transformPoint(p: { x: number; y: number }): FakePoint {
    const [a, b, c, d, e, f] = this.m;
    return new FakePoint(a * p.x + c * p.y + e, b * p.x + d * p.y + f);
  }
}

class FakeImageData {
  readonly data: Uint8ClampedArray;
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(Math.max(0, width * height * 4));
  }
}

/**
 * Canonical form of a CSS colour, so equal colours log equally whatever
 * their spelling ('#2b1d12' = 'rgb(43,29,18)', 'rgba(1,2,3,.5)' =
 * 'rgba(1,2,3,0.5)'); other strings pass through.
 */
export function canonicalColor(s: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(s);
  if (hex?.[1]) {
    const n = parseInt(hex[1], 16);
    return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
  }
  const fn = /^rgba?\(([^)]*)\)$/.exec(s);
  if (!fn?.[1]) return s;
  const parts = fn[1].split(',').map((x) => Number(x.trim()));
  if (parts.some((x) => Number.isNaN(x))) return s;
  const [r, g, b, a = 1] = parts;
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

function fmt(v: unknown): string {
  if (typeof v === 'number') return Object.is(v, -0) ? '0' : String(v);
  if (typeof v === 'string') return JSON.stringify(canonicalColor(v));
  if (v === undefined || v === null) return String(v);
  if (typeof v === 'object' && 'logId' in v) return String((v as { logId: string }).logId);
  if (typeof v === 'object' && 'x' in v && 'y' in v) return `pt(${fmt((v as FakePoint).x)},${fmt((v as FakePoint).y)})`;
  if (typeof v === 'boolean') return String(v);
  return `<${typeof v}>`;
}

/** One fake canvas and its draw log. */
export interface RecordedCanvas {
  width: number;
  height: number;
  readonly log: string[];
}

const canvases: RecordedCanvas[] = [];

function makeContext(canvas: RecordedCanvas): object {
  let matrix: Matrix = [...IDENTITY];
  const stack: Matrix[] = [];
  let gradients = 0;
  const rec = (name: string, args: readonly unknown[]) => canvas.log.push(`${name}(${args.map(fmt).join(',')})`);
  const special: Record<string, (...args: number[]) => unknown> = {
    save: () => void stack.push([...matrix]),
    restore: () => {
      const m = stack.pop();
      if (m) matrix = m;
    },
    setTransform: (a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) => void (matrix = [a, b, c, d, e, f]),
    resetTransform: () => void (matrix = [...IDENTITY]),
    transform: (a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) => void (matrix = multiply(matrix, [a, b, c, d, e, f])),
    translate: (x = 0, y = 0) => void (matrix = multiply(matrix, [1, 0, 0, 1, x, y])),
    scale: (x = 1, y = 1) => void (matrix = multiply(matrix, [x, 0, 0, y, 0, 0])),
    rotate: (a = 0) => void (matrix = multiply(matrix, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0])),
    getTransform: () => new FakeMatrix([...matrix]),
    createLinearGradient: () => gradient(),
    createRadialGradient: () => gradient(),
    getImageData: (_x = 0, _y = 0, w = 0, h = 0) => new FakeImageData(w, h),
    createImageData: (w = 0, h = 0) => new FakeImageData(w, h),
  };
  function gradient(): object {
    const logId = `grad${gradients++}`;
    return {
      logId,
      addColorStop: (offset: number, color: string) => rec(`${logId}.stop`, [offset, color]),
    };
  }
  const props: Record<string, unknown> = {};
  return new Proxy(props, {
    get(target, key) {
      if (key === 'canvas') return canvas;
      if (typeof key !== 'string') return undefined;
      if (key in target) return target[key];
      return (...args: number[]) => {
        rec(key, args);
        return special[key]?.(...args);
      };
    },
    set(target, key, value: unknown) {
      if (typeof key !== 'string') return false;
      rec(`set ${key}`, [value]);
      target[key] = value;
      return true;
    },
  });
}

function createCanvas(): RecordedCanvas {
  const log: string[] = [];
  let ctx: object | null = null;
  const canvas: RecordedCanvas & { getContext: () => object } = {
    width: 300,
    height: 150,
    log,
    getContext: () => (ctx ??= makeContext(canvas)),
  };
  canvases.push(canvas);
  return canvas;
}

/** Installs the fake `document`, `DOMPoint` and `ImageData` globals (Node test env). */
export function installRecordingCanvas(): void {
  const g = globalThis as Record<string, unknown>;
  g.document = { createElement: (tag: string) => (tag === 'canvas' ? createCanvas() : {}) };
  g.DOMPoint = FakePoint;
  g.ImageData = FakeImageData;
}

/** Runs `paint` and returns a hash of every canvas it created (size + draw log) plus `extra` data. */
export function hashPainting(paint: () => unknown): string {
  canvases.length = 0;
  const extra = paint();
  const h = createHash('sha256');
  for (const c of canvases) {
    h.update(`canvas ${c.width}x${c.height}\n`);
    for (const line of c.log) h.update(`${line}\n`);
  }
  h.update(JSON.stringify(extra ?? null));
  return h.digest('hex').slice(0, 16);
}
