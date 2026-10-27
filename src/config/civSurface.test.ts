import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CIV_IDS } from './civs';

/*
 * Civ extension surface (M5 Task 2, M4 review I4 / Recommendation 2):
 * adding a civ touches only the civ registry, the art registries, hu.ts
 * and the civ's own <civ>/ folders — never a shared painter or game
 * logic. This test reads every source file (tests and testkits aside)
 * and fails when a civ id shows up anywhere else.
 */

const SRC = join(process.cwd(), 'src');

/** Files (relative to src/, '/' separated) that may name civ ids. */
const ALLOWED = new Set([
  'types/index.ts',
  'config/civs.ts',
  'i18n/hu.ts',
  'iso/art/architecture/registry.ts',
  'iso/art/architecture/charges.ts',
  'iso/art/walls/wallStyles.ts',
  'iso/art/units/looks.ts',
  'iso/art/units/gearRegistry.ts',
  // The Hungarian base styles predate the per-civ folders.
  'iso/art/architecture/hungarianStyles.ts',
]);

/** Shared painters that must not depend on any civ's art. */
const CIV_FREE_PAINTERS = ['iso/art/units/gear.ts', 'iso/art/architecture/facade.ts'];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (/\.ts$/.test(entry.name) && !/\.(test|testkit)\.ts$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(path);
  }
  return out;
}

const rel = (path: string): string => relative(SRC, path).split(sep).join('/');
/** A civ's own art folders: iso/art/(architecture|walls|units)/<civ>/. */
const inCivFolder = (file: string): boolean =>
  CIV_IDS.some((civ) => new RegExp(`^iso/art/(architecture|walls|units)/${civ}/`).test(file));

/** Source without comments (a civ named in prose is fine). */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

/** Civ ids a file names in code: string literals, object keys and member accesses. */
function civMentions(text: string): string[] {
  const ids = CIV_IDS.join('|');
  const src = code(text);
  const found = new Set<string>();
  for (const m of src.matchAll(new RegExp(`(['"\`])(${ids})\\1`, 'g'))) found.add(`'${m[2]}'`);
  // Strip string literals before looking for bare identifiers (import paths name civ folders).
  const bare = src.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");
  for (const m of bare.matchAll(new RegExp(`(?:\\.(${ids})\\b|\\b(${ids})\\s*:(?!:))`, 'g'))) found.add(m[1] ?? m[2] ?? '');
  return [...found];
}

describe('civ extension surface', () => {
  const files = sourceFiles(SRC).map((path) => ({ file: rel(path), text: readFileSync(path, 'utf8') }));

  it('finds the source tree', () => {
    expect(files.some((f) => f.file === 'config/civs.ts')).toBe(true);
    expect(files.length).toBeGreaterThan(100);
  });

  it('names civ ids only in the registries, hu.ts and <civ>/ folders', () => {
    const offenders = files
      .filter(({ file }) => !ALLOWED.has(file) && !inCivFolder(file))
      .map(({ file, text }) => ({ file, civs: civMentions(text) }))
      .filter((o) => o.civs.length > 0)
      .map((o) => `${o.file}: ${o.civs.join(', ')}`);
    expect(offenders).toEqual([]);
  });

  it.each(CIV_FREE_PAINTERS)('%s imports nothing from a civ folder', (painter) => {
    const f = files.find((x) => x.file === painter);
    expect(f, painter).toBeDefined();
    const imports = [...(f?.text ?? '').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');
    expect(imports.filter((spec) => CIV_IDS.some((civ) => spec.split('/').includes(civ)))).toEqual([]);
  });

  it("accepts only a civ's own art folders, not any folder named after a civ", () => {
    expect(inCivFolder('iso/art/units/english/englishGear.ts')).toBe(true);
    expect(inCivFolder('iso/art/architecture/german/germanStyles.ts')).toBe(true);
    expect(inCivFolder('ai/german/plan.ts')).toBe(false);
    expect(inCivFolder('ui/english/panel.ts')).toBe(false);
  });

  it('spots civ ids in code, not in comments or import paths', () => {
    expect(civMentions(`// the english look\nimport { X } from './english/x';`)).toEqual([]);
    expect(civMentions(`if (civ === 'german') x();`)).toEqual(["'german'"]);
    expect(civMentions(`const a = CIV_DEFS.french;`)).toEqual(['french']);
    expect(civMentions(`const m = { finnish: 1 };`)).toEqual(['finnish']);
  });
});
