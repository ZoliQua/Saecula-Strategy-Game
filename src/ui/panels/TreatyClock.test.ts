import { describe, expect, it } from 'vitest';
import { hu } from '../../i18n/hu';
import { treatyEnded, treatyLabel } from './TreatyClock';

describe('treaty clock (M16)', () => {
  it('reads "Fegyverszünet: m:ss" while it holds, nothing once over or with no treaty', () => {
    expect(treatyLabel(600_000)).toBe(hu.treaty.clock('10:00'));
    expect(treatyLabel(600_000)).toBe('Fegyverszünet: 10:00');
    expect(treatyLabel(65_500)).toBe('Fegyverszünet: 1:06');
    // Rounded up: the last second reads 0:01, never 0:00 while the treaty still holds.
    expect(treatyLabel(400)).toBe('Fegyverszünet: 0:01');
    expect(treatyLabel(60_000)).toBe('Fegyverszünet: 1:00');
    expect(treatyLabel(0)).toBeNull();
    expect(treatyLabel(null)).toBeNull();
  });

  it('announces the end once: running → 0; never on a reset or on a load past the end', () => {
    expect(treatyEnded(1_000, 0)).toBe(true);
    expect(treatyEnded(0, 0)).toBe(false);
    expect(treatyEnded(null, 0)).toBe(false);
    expect(treatyEnded(1_000, null)).toBe(false);
    expect(treatyEnded(2_000, 1_000)).toBe(false);
  });
});
