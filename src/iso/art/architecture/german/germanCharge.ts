import type { ChargePainter } from '../charges';

/**
 * German crest charge (charges.ts): the black Reichsadler, displayed
 * with spread pinions, edged in gold so it reads on dark team fields too.
 */
export const GERMAN_CHARGES = {
  eagle: (ctx, x, y, s) => {
    const k = s * 0.95;
    ctx.beginPath();
    // Head and neck (looking to the dexter side), body, tail fan.
    ctx.moveTo(x - k * 0.08, y - k * 0.78);
    ctx.lineTo(x - k * 0.3, y - k * 0.68);
    ctx.lineTo(x - k * 0.1, y - k * 0.6);
    ctx.lineTo(x - k * 0.12, y - k * 0.42);
    // Dexter wing: three pinions.
    ctx.lineTo(x - k * 0.78, y - k * 0.66);
    ctx.lineTo(x - k * 0.62, y - k * 0.36);
    ctx.lineTo(x - k * 0.8, y - k * 0.3);
    ctx.lineTo(x - k * 0.58, y - k * 0.08);
    ctx.lineTo(x - k * 0.72, y);
    ctx.lineTo(x - k * 0.16, y - k * 0.05);
    // Legs and tail.
    ctx.lineTo(x - k * 0.34, y + k * 0.3);
    ctx.lineTo(x - k * 0.12, y + k * 0.22);
    ctx.lineTo(x - k * 0.2, y + k * 0.62);
    ctx.lineTo(x, y + k * 0.46);
    ctx.lineTo(x + k * 0.2, y + k * 0.62);
    ctx.lineTo(x + k * 0.12, y + k * 0.22);
    ctx.lineTo(x + k * 0.34, y + k * 0.3);
    ctx.lineTo(x + k * 0.16, y - k * 0.05);
    // Sinister wing.
    ctx.lineTo(x + k * 0.72, y);
    ctx.lineTo(x + k * 0.58, y - k * 0.08);
    ctx.lineTo(x + k * 0.8, y - k * 0.3);
    ctx.lineTo(x + k * 0.62, y - k * 0.36);
    ctx.lineTo(x + k * 0.78, y - k * 0.66);
    ctx.lineTo(x + k * 0.12, y - k * 0.42);
    ctx.lineTo(x + k * 0.1, y - k * 0.7);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(0.8, s * 0.14);
    ctx.strokeStyle = 'rgba(232,192,84,.95)';
    ctx.stroke();
    ctx.fillStyle = '#16120f';
    ctx.fill();
    // Red beak and tongue.
    ctx.fillStyle = '#c8202e';
    ctx.fillRect(x - k * 0.34, y - k * 0.7, k * 0.12, k * 0.06);
  },
} satisfies Record<string, ChargePainter>;
