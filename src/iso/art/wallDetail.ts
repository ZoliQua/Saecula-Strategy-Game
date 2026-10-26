import type { Ctx } from './canvas';
import type { WallStyle } from './isoPainter';
import { css, shade } from './palette';

/** Stone / brick / plank / log / plaster texture in face-local coords. */
export function paintWallDetail(
ctx: Ctx,
rand: () => number,
wall: WallStyle,
width: number,
height: number,
light: number,
): void {
  const h = height || 400;
  const dark = css(shade(wall.color, light * 0.62), 0.55);
  const lite = css(shade(wall.color, light * 1.25), 0.35);
  switch (wall.detail) {
    case 'stone': {
      for (let row = 0, y = 0; y < h; row++, y += 9) {
        for (let x = (row % 2) * -9; x < width; x += 18 + rand() * 6) {
          ctx.fillStyle = css(shade(wall.color, light * (0.85 + rand() * 0.3)));
          ctx.fillRect(x + 1, -y - 8, 16, 7.5);
          ctx.fillStyle = lite;
          ctx.fillRect(x + 1, -y - 8, 16, 1.2);
        }
      }
      break;
    }
    case 'fieldstone': {
      // Rounded river / field stones of mixed size in pale mortar.
      ctx.fillStyle = css(shade(wall.color, light * 0.78), 0.6);
      ctx.fillRect(0, -h, width, h);
      for (let row = 0, y = 0; y < h; row++) {
        const rh = 6 + rand() * 4;
        for (let x = -rand() * 8; x < width; ) {
          const sw = 7 + rand() * 9;
          ctx.fillStyle = css(shade(wall.color, light * (0.78 + rand() * 0.42)));
          ctx.beginPath();
          ctx.ellipse(x + sw / 2, -y - rh / 2, sw / 2 - 0.6, rh / 2 - 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = lite;
          ctx.fillRect(x + sw * 0.25, -y - rh + 1.2, sw * 0.4, 1);
          x += sw;
        }
        y += rh;
      }
      break;
    }
    case 'brick': {
      for (let row = 0, y = 0; y < h; row++, y += 5) {
        ctx.fillStyle = dark;
        ctx.fillRect(0, -y - 0.8, width, 0.8);
        for (let x = (row % 2) * 6; x < width; x += 12) ctx.fillRect(x, -y - 5, 0.8, 5);
      }
      break;
    }
    case 'planks': {
      for (let x = 0; x < width; x += 7) {
        ctx.fillStyle = rand() > 0.5 ? dark : lite;
        ctx.fillRect(x, -h, 1, h);
      }
      break;
    }
    case 'logs': {
      for (let y = 0; y < h; y += 8) {
        const g = ctx.createLinearGradient(0, -y - 8, 0, -y);
        g.addColorStop(0, css(shade(wall.color, light * 1.2)));
        g.addColorStop(1, css(shade(wall.color, light * 0.7)));
        ctx.fillStyle = g;
        ctx.fillRect(0, -y - 8, width, 7.5);
      }
      break;
    }
    case 'plaster': {
      for (let i = 0; i < (width * h) / 60; i++) {
        ctx.fillStyle = rand() > 0.5 ? dark : lite;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(rand() * width, -rand() * h, 2 + rand() * 3, 1.5);
      }
      ctx.globalAlpha = 1;
      // Stone plinth.
      ctx.fillStyle = css(shade(0x8a8378, light));
      ctx.fillRect(0, -7, width, 7);
      break;
    }
    default:
      break;
  }
}
