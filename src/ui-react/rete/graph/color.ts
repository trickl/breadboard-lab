export function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  const c = color.trim();
  const m3 = /^#([0-9a-f]{3})$/i.exec(c);
  if (m3) {
    const r = parseInt(m3[1][0] + m3[1][0], 16);
    const g = parseInt(m3[1][1] + m3[1][1], 16);
    const b = parseInt(m3[1][2] + m3[1][2], 16);
    return { r, g, b };
  }
  const m6 = /^#([0-9a-f]{6})$/i.exec(c);
  if (m6) {
    const r = parseInt(m6[1].slice(0, 2), 16);
    const g = parseInt(m6[1].slice(2, 4), 16);
    const b = parseInt(m6[1].slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

export function toHex2(n: number): string {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return v.toString(16).padStart(2, '0');
}

export function mixWithWhite(hex: string, t: number): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;
  const clamped = Math.max(0, Math.min(1, t));
  const r = rgb.r + (255 - rgb.r) * clamped;
  const g = rgb.g + (255 - rgb.g) * clamped;
  const b = rgb.b + (255 - rgb.b) * clamped;
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}

export function mixWithBlack(hex: string, t: number): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;
  const clamped = Math.max(0, Math.min(1, t));
  const r = rgb.r * (1 - clamped);
  const g = rgb.g * (1 - clamped);
  const b = rgb.b * (1 - clamped);
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}
