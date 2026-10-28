import type { AudioSink } from './AudioManager';

/** Every enabled button click under `root` ticks (one delegated listener). Returns the unbind. */
export function bindUiSounds(root: HTMLElement, sink: AudioSink): () => void {
  const onClick = (e: MouseEvent): void => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button');
    if (button && !button.disabled) sink.playSFX('ui_click');
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
