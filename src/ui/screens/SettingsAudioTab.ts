import { hu } from '../../i18n/hu';
import { el } from '../dom';
import { settingsStore, VOLUME_CHANNELS, type SettingsStore, type VolumeChannel } from '../settings';

const ICONS = {
  speaker: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4Z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11"/></svg>`,
  muted: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/></svg>`,
} as const;

interface VolumeRow {
  readonly input: HTMLInputElement;
  readonly value: HTMLElement;
}

/** The settings card's "Hang" tab: a slider per volume channel and the mute switch. */
export class SettingsAudioTab {
  readonly root: HTMLElement;
  private readonly section: HTMLElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly muteIcon: HTMLElement;
  private readonly volumes = new Map<VolumeChannel, VolumeRow>();

  /** `after` runs a store change and reports a refused write (the shell's notice). */
  constructor(private readonly after: (change: () => void) => void) {
    this.muteIcon = el('span', { class: 'set-mute-icon' });
    this.muteBtn = el('button', { class: 'set-switch', type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-label': hu.settings.mute }, el('i', {}));
    this.muteBtn.addEventListener('click', () => this.after(() => settingsStore.getState().setMuted(!settingsStore.getState().muted)));
    this.section = el(
      'section',
      { class: 'set-section', style: '--i:0' },
      el(
        'header',
        { class: 'set-section-head' },
        el('span', { class: 'set-section-icon', html: ICONS.speaker }),
        el('h3', {}, hu.settings.audio),
        el('label', { class: 'set-mute' }, this.muteIcon, el('span', {}, hu.settings.mute), this.muteBtn),
      ),
      el('div', { class: 'set-panel set-volumes' }, ...VOLUME_CHANNELS.map((ch) => this.volumeRow(ch))),
    );
    this.root = this.section;
  }

  focusFirst(): void {
    this.volumes.get('master')?.input.focus({ preventScroll: true });
  }

  sync(s: SettingsStore): void {
    for (const [ch, { input, value }] of this.volumes) {
      const v = s.volume[ch];
      if (input.value !== String(v)) input.value = String(v);
      input.style.setProperty('--fill', `${v}%`);
      value.textContent = `${v}%`;
    }
    this.muteBtn.setAttribute('aria-checked', String(s.muted));
    this.muteIcon.innerHTML = s.muted ? ICONS.muted : ICONS.speaker;
    this.section.classList.toggle('muted', s.muted);
  }

  private volumeRow(ch: VolumeChannel): HTMLElement {
    const id = `set-vol-${ch}`;
    const input = el('input', { id, class: 'set-range', type: 'range', min: 0, max: 100, step: 1 });
    input.addEventListener('input', () => this.after(() => settingsStore.getState().setVolume(ch, Number(input.value))));
    const value = el('output', { class: 'set-value', for: id });
    this.volumes.set(ch, { input, value });
    return el('div', { class: `set-volume${ch === 'master' ? ' master' : ''}` }, el('label', { class: 'set-label', for: id }, hu.settings.volumes[ch]), input, value);
  }
}
