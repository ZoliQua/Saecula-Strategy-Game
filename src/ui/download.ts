import { el } from './dom';

/**
 * Hands `text` to the browser as a file download named `fileName`
 * (an object URL, revoked once the click has been handled).
 */
export function downloadText(fileName: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a', { href: url, download: fileName, class: 'st-download' });
  document.body.append(a);
  a.click();
  a.remove();
  // The download has its own reference; the URL can go once the click has been handled.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
