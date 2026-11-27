import { describe, expect, it } from 'vitest';
import { hu } from '../../i18n/hu';
import { wonderCompletedText } from './WonderTimers';

describe('wonderCompletedText', () => {
  const allyTwo = (id: number) => id === 1 || id === 2;

  it('own, ally and enemy Wonders get their own toast (M16)', () => {
    expect(wonderCompletedText(1, allyTwo)).toBe(hu.hud.wonderOwn);
    expect(wonderCompletedText(2, allyTwo)).toBe(hu.hud.wonderAlly);
    expect(wonderCompletedText(3, allyTwo)).toBe(hu.hud.wonderEnemy(3));
  });

  it('without allies every other Wonder is an enemy one', () => {
    expect(wonderCompletedText(2, (id) => id === 1)).toBe(hu.hud.wonderEnemy(2));
  });
});
