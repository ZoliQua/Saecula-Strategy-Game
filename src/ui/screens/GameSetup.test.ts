import { afterEach, describe, expect, it, vi } from 'vitest';

// The card's pictures and the menu behind it are not under test.
vi.mock('./MainMenu', () => ({ E_UP_S: 1 }));
vi.mock('../civPreview', () => ({ civPreview: () => null }));
vi.mock('./CivPicker', async () => {
  const { el } = await import('../dom');
  return { CivPicker: class { root = el('div'); caption = el('div'); set(): void {} } };
});

import { defaultSetupConfig, withSetup } from '../../game/GameSetupConfig';
import { hu } from '../../i18n/hu';
import { installDomStub, type StubNode } from '../testing/domStub.testkit';
import { GameSetup } from './GameSetup';

function openSetup({ reducedMotion = false } = {}) {
  const dom = installDomStub();
  vi.stubGlobal('window', {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    setTimeout: () => 0,
    clearTimeout: () => undefined,
    matchMedia: (query: string) => ({ matches: reducedMotion && query === '(prefers-reduced-motion: reduce)' }),
  });
  new GameSetup(withSetup(defaultSetupConfig(1), { template: 'meadow', victory: 'hill' }), { onStart: vi.fn(), onBack: vi.fn() });
  const all = dom.body.all();
  const option = all.find((n) => n.getAttribute('role') === 'radio' && n.textContent === hu.setup.victories.hill) as StubNode;
  const hint = all.find((n) => n.classList.contains('victory-hint')) as StubNode;
  const template = (id: string) => void all.find((n) => n.dataset['tpl'] === id)?.fire('click');
  return { option, hint, template };
}

afterEach(() => void vi.unstubAllGlobals());

describe('setup card and the hill (M19)', () => {
  it('ties the disabled option to the line that says why, only while it is off', () => {
    const { option, hint, template } = openSetup();
    expect(option.getAttribute('aria-describedby')).toBeNull();
    template('islands');
    expect(option.disabled).toBe(true);
    const id = hint.getAttribute('id');
    expect(id).toBeTruthy();
    expect(option.getAttribute('aria-describedby')).toBe(id);
    expect(hint.textContent).not.toBe('');
    template('meadow');
    expect(option.disabled).toBe(false);
    expect(option.getAttribute('aria-describedby')).toBeNull();
  });

  it.each([
    [false, 'smooth'],
    [true, 'auto'],
  ])('reduced motion %s: a reset scrolls into view with behaviour %s', (reducedMotion, behavior) => {
    const { hint, template } = openSetup({ reducedMotion });
    template('islands');
    expect(hint.scrolled).toEqual([{ block: 'nearest', behavior }]);
  });
});
