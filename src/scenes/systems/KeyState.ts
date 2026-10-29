type KeyTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

/** Elements where a key press is typing, not a game command. */
const TYPING_TAGS: ReadonlySet<string> = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Whether a key event from `target` is typing in a form field (no game command). */
export function isTyping(target: EventTarget | null): boolean {
  if (target === null || typeof target !== 'object') return false;
  const node = target as { tagName?: unknown; isContentEditable?: unknown };
  return (typeof node.tagName === 'string' && TYPING_TAGS.has(node.tagName.toUpperCase())) || node.isContentEditable === true;
}

/**
 * Which physical keys (`KeyboardEvent.code`) are held, from window key
 * events. A key pressed while typing in a form field is ignored, and a
 * lost window focus releases every key (no stuck camera pan).
 */
export class KeyState {
  private readonly down = new Set<string>();
  private readonly target: KeyTarget;

  constructor(target?: KeyTarget) {
    this.target = target ?? window;
    this.target.addEventListener('keydown', this.onDown);
    this.target.addEventListener('keyup', this.onUp);
    this.target.addEventListener('blur', this.onBlur);
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onDown);
    this.target.removeEventListener('keyup', this.onUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.down.clear();
  }

  private readonly onDown = (e: Event): void => {
    const key = e as KeyboardEvent;
    if (isTyping(key.target)) return;
    this.down.add(key.code);
  };

  /** A release always counts, even from a field (the press may have come before the field took focus). */
  private readonly onUp = (e: Event): void => {
    const { code } = e as KeyboardEvent;
    // While Cmd is held macOS swallows the other keys' keyup (Cmd+A would leave A "down"): its release frees them all.
    if (code === 'MetaLeft' || code === 'MetaRight') this.down.clear();
    else this.down.delete(code);
  };

  private readonly onBlur = (): void => {
    this.down.clear();
  };
}
