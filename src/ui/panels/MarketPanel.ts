import { MARKET } from '../../config/balance';
import { HUMAN_PLAYER_ID } from '../../config/constants';
import { MARKET_RESOURCES, type MarketQuotes, type MarketResource } from '../../game/market';
import { hu } from '../../i18n/hu';
import type { Resources } from '../../types';
import { el } from '../dom';
import { dispatchCommand } from '../events';
import { icons } from '../icons';
import type { SelectedEntityInfo } from '../store';

type Side = 'buy' | 'sell';

/** Whether the human can make this trade with what the UI store holds now. */
export function canTrade(side: Side, resource: MarketResource, quotes: MarketQuotes, have: Readonly<Resources>): boolean {
  return side === 'buy' ? have.gold >= quotes[resource].buy : have[resource] >= MARKET.lot;
}

/** A trade button's label: "Vétel 100 étel — 112 arany". */
export function tradeLabel(side: Side, resource: MarketResource, quotes: MarketQuotes): string {
  const name = hu.hud.market.lot[resource];
  return side === 'buy' ? hu.hud.market.buy(MARKET.lot, name, quotes[resource].buy) : hu.hud.market.sell(MARKET.lot, name, quotes[resource].sell);
}

/**
 * The selection panel's exchange buttons for the human's own finished
 * market (M17): buy and sell one lot of food or wood at the current
 * price. Persistent elements updated in place (the delete button
 * precedent); a button the stockpile cannot pay for is greyed and does
 * nothing.
 */
export class MarketPanel {
  readonly row: HTMLElement;
  private readonly buttons: Array<{ side: Side; resource: MarketResource; button: HTMLButtonElement; text: HTMLElement }> = [];
  private marketId: number | null = null;
  private quotes: MarketQuotes | null = null;
  private have: Readonly<Resources> = { food: 0, wood: 0, gold: 0 };

  constructor() {
    for (const side of ['buy', 'sell'] as const) {
      for (const resource of MARKET_RESOURCES) {
        const text = el('span', {});
        const button = el('button', { class: `sel-trade ${side}`, type: 'button', title: hu.hud.market.tip }, el('span', { html: icons[resource] }), text);
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.marketId === null || !this.quotes || !canTrade(side, resource, this.quotes, this.have)) return;
          dispatchCommand({ type: side === 'buy' ? 'market-buy' : 'market-sell', marketId: this.marketId, resource });
        });
        this.buttons.push({ side, resource, button, text });
      }
    }
    this.row = el('div', { class: 'sel-market', 'aria-label': hu.hud.market.title }, ...this.buttons.map((b) => b.button));
    this.row.hidden = true;
  }

  render(sel: SelectedEntityInfo | null, quotes: MarketQuotes | null, have: Readonly<Resources>): void {
    const shown =
      sel?.kind === 'building' && sel.buildingType === 'market' && sel.ownerId === HUMAN_PLAYER_ID && sel.constructionProgress === undefined && quotes !== null;
    this.marketId = shown ? sel.id : null;
    this.quotes = quotes;
    this.have = have;
    this.row.hidden = !shown;
    if (!shown || !quotes) return;
    for (const b of this.buttons) {
      const label = tradeLabel(b.side, b.resource, quotes);
      if (b.text.textContent !== label) b.text.textContent = label;
      const ok = canTrade(b.side, b.resource, quotes, have);
      b.button.classList.toggle('disabled', !ok);
      b.button.setAttribute('aria-disabled', String(!ok));
    }
  }
}
