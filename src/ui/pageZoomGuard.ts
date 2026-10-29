/** A browser pinch reaches the page as a wheel event with `ctrlKey` set (the canvas zooms the camera on it itself). */
export function blocksPageZoom(e: { readonly ctrlKey: boolean }): boolean {
  return e.ctrlKey;
}

const NOT_PASSIVE: AddEventListenerOptions = { passive: false };
/** Safari's own pinch events (it also zooms the page on them). */
const GESTURES = ['gesturestart', 'gesturechange'] as const;

/**
 * Keeps a trackpad pinch over the DOM HUD (side panel, minimap, selection
 * panel, …) from zooming the browser page: a non-passive `wheel` listener on
 * `root` cancels a ctrl wheel, and Safari's `gesturestart` / `gesturechange`
 * are cancelled on `doc`. A plain wheel is left alone (panels still scroll).
 * Returns the disposer; the HUD installs it for the match and removes it
 * when it is destroyed (HUDScene shutdown).
 */
export function guardPageZoom(root: EventTarget, doc: EventTarget): () => void {
  const onWheel = (e: Event): void => {
    if (blocksPageZoom(e as WheelEvent)) e.preventDefault();
  };
  const onGesture = (e: Event): void => e.preventDefault();
  root.addEventListener('wheel', onWheel, NOT_PASSIVE);
  for (const type of GESTURES) doc.addEventListener(type, onGesture, NOT_PASSIVE);
  return () => {
    root.removeEventListener('wheel', onWheel);
    for (const type of GESTURES) doc.removeEventListener(type, onGesture);
  };
}
