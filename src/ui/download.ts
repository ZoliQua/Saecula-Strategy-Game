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

/** A downloaded file's local date part (YYYY-MM-DD): the statistics and save exports name their files with it. */
export function exportDate(now: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
