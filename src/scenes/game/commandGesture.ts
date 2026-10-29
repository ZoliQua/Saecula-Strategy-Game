import type { CommandGesture } from '../../ui/settings';

export type ClickKind = 'select' | 'command' | 'other';
export type ClickLike = Pick<MouseEvent, 'button' | 'ctrlKey' | 'metaKey' | 'altKey'>;

/**
 * What a mouse press means, from the native event (Phaser turns every
 * macOS Ctrl+click into a right button, so its button flags cannot tell
 * the gesture apart). The right button always commands; a left click
 * with the settings' gesture modifier commands too and does not select.
 */
export function clickKind(e: ClickLike, gesture: CommandGesture): ClickKind {
  if (e.button === 2) return 'command';
  if (e.button !== 0) return 'other';
  return gestureHeld(e, gesture) ? 'command' : 'select';
}

/** Whether the gesture's modifier is held ('none' never is). */
export function gestureHeld(e: Pick<MouseEvent, 'ctrlKey' | 'metaKey' | 'altKey'>, gesture: CommandGesture): boolean {
  switch (gesture) {
    case 'ctrl':
      return e.ctrlKey;
    case 'meta':
      return e.metaKey;
    case 'alt':
      return e.altKey;
    case 'none':
      return false;
  }
}
