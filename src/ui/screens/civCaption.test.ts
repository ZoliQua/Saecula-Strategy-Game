import { describe, expect, it } from 'vitest';
import { AVAILABLE_CIVS, CIV_DEFS } from '../../config/civs';
import { CIV_BONUS } from '../../config/balance';
import { hu } from '../../i18n/hu';
import { civCaption } from './civCaption';

describe('civCaption', () => {
  it('shows the French unique unit and bonus lines', () => {
    const c = civCaption('french');
    expect(c.uniqueLine).toContain('Királyi muskétás');
    expect(c.uniqueLine).toBe('Egyedi egység: Királyi muskétás (a muskétás helyett)');
    expect(c.bonusLine).toBe('Istállói egységek +15% életerő');
  });

  it('uses "az" before a vowel (the Finnish sissi replaces the archer)', () => {
    expect(civCaption('finnish').uniqueLine).toBe('Egyedi egység: Sissi (az íjász helyett)');
  });

  it('gives every playable civ a bonus line and a screen-reader text with all lines', () => {
    for (const civ of AVAILABLE_CIVS) {
      const c = civCaption(civ);
      expect(c.uniqueLine).toContain(hu.units[CIV_DEFS[civ].uniqueUnit]);
      expect(c.bonusLine.length).toBeGreaterThan(5);
      expect(c.srText).toContain(hu.setup.civDesc[civ]);
      expect(c.srText).toContain(c.uniqueLine);
      expect(c.srText).toContain(c.bonusLine);
    }
  });

  it('formats the bonus percentage from CIV_BONUS', () => {
    const pct = (f: number) => `${Math.round(f * 100)}%`;
    expect(civCaption('hungarian').bonusLine).toContain(pct(CIV_BONUS.cavalrySpeed));
    expect(civCaption('english').bonusLine).toContain(pct(CIV_BONUS.farmFood));
    expect(civCaption('finnish').bonusLine).toContain(pct(CIV_BONUS.infantrySpeed));
    expect(civCaption('italian').bonusLine).toContain(pct(CIV_BONUS.buildSpeed));
  });
});
