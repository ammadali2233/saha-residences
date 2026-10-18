import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const brand = JSON.parse(readFileSync('design/brand-tokens.json', 'utf8'));
const css = readFileSync('src/styles/tokens.css', 'utf8');

// The guide is the source of truth: every value must reach the CSS unchanged (CLAUDE.md, D-019).
describe('brand tokens', () => {
  it('emits every brand colour verbatim', () => {
    for (const [name, hex] of Object.entries<string>(brand.color)) {
      expect(css).toContain(`--color-${name}: ${hex};`);
    }
  });

  it('emits the spacing scale, radii and control sizes', () => {
    for (const [k, v] of Object.entries<string>(brand.space)) expect(css).toContain(`--space-${k}: ${v};`);
    for (const [k, v] of Object.entries<string>(brand.radius)) expect(css).toContain(`--radius-${k}: ${v};`);
    expect(css).toContain(`--control-height: ${brand.control.height};`);
    expect(css).toContain(`--control-focus-ring: ${brand.control['focus-ring']};`);
  });

  it('uses mobile type sizes by default and desktop sizes from the md breakpoint', () => {
    const [mobile, desktop] = css.split(`@media (min-width: ${brand.breakpoint.md})`);
    expect(mobile).toContain(`--type-h1-size: ${brand.type.h1.size[0]};`);
    expect(desktop).toContain(`--type-h1-size: ${brand.type.h1.size[1]};`);
  });

  it('only approves text pairings that meet WCAG AA for body text', () => {
    for (const p of brand.approvedTextPairings) {
      expect(contrast(p.fg, p.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
