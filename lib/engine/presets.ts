import { SH, CH, Glyph } from './glyphs';

export type AsciiPreset = {
  n: string; bg: string; fg: string; acc: string; cm: string; gr?: string[]; g: Glyph[];
  cols: number; ca: number; fill: number; sizeBy: number; dither: string; inv: boolean; accAmt: number;
};

export const PRESETS: AsciiPreset[] = [
  { n: 'Obsidian matrix', bg: '#0B0B0C', fg: '#F2F2F2', acc: '#2F5BFF', cm: 'mono', g: SH('blank dot equals square-o square chain ring-dot'), cols: 84, ca: 1, fill: 1, sizeBy: 0, dither: 'none', inv: false, accAmt: 0 },
  { n: 'Cobalt dither', bg: '#F6F7FF', fg: '#2A55FF', acc: '#0B0B0C', cm: 'mono', g: SH('blank dot dots4 cross square block'), cols: 96, ca: 1, fill: 1, sizeBy: 0, dither: 'bayer', inv: true, accAmt: 0 },
  { n: 'Cobalt field', bg: '#2A55FF', fg: '#FFFFFF', acc: '#0A1240', cm: 'mono', g: SH('blank dot cross square-o square block'), cols: 90, ca: 1, fill: 0.95, sizeBy: 0, dither: 'bayer', inv: false, accAmt: 0 },
  { n: 'Block signal', bg: '#2F5BFF', fg: '#050A24', acc: '#FFFFFF', cm: 'mono', g: SH('blank block'), cols: 44, ca: 1, fill: 1, sizeBy: 0, dither: 'floyd', inv: true, accAmt: 0 },
  { n: 'Violet halftone', bg: '#120F24', fg: '#F1EDFF', acc: '#8A4BFF', cm: 'grad', gr: ['#2A1470', '#8A4BFF', '#F1EDFF'], g: SH('blank square square block-in'), cols: 72, ca: 1, fill: 0.9, sizeBy: 0.85, dither: 'none', inv: false, accAmt: 0 },
  { n: 'Phosphor CRT', bg: '#03100A', fg: '#39FF7A', acc: '#D6FFE3', cm: 'duo', g: CH(' .:-=+*#%@'), cols: 110, ca: 1.7, fill: 1, sizeBy: 0, dither: 'none', inv: false, accAmt: 0.01 },
  { n: 'Amber terminal', bg: '#140B02', fg: '#FFB000', acc: '#FFE7A8', cm: 'duo', g: CH(' .,:;i1tfLCG08@'), cols: 110, ca: 1.7, fill: 1, sizeBy: 0, dither: 'none', inv: false, accAmt: 0 },
  { n: 'Paper ink', bg: '#F4F1EA', fg: '#1A1A1A', acc: '#C2410C', cm: 'mono', g: CH(' .:-=+*#%@'), cols: 100, ca: 1.7, fill: 1, sizeBy: 0, dither: 'none', inv: true, accAmt: 0 },
  { n: 'Blueprint', bg: '#0F3D91', fg: '#DBE8FF', acc: '#FFFFFF', cm: 'mono', g: SH('blank dot plus cross square-o ring'), cols: 80, ca: 1, fill: 0.95, sizeBy: 0, dither: 'none', inv: false, accAmt: 0 },
  { n: 'Thermal', bg: '#07000F', fg: '#FFFFFF', acc: '#FFFFFF', cm: 'grad', gr: ['#2A0060', '#E5383B', '#FFE680'], g: SH('blank dot square block'), cols: 84, ca: 1, fill: 1, sizeBy: 0.3, dither: 'none', inv: false, accAmt: 0 },
  { n: 'Neon synth', bg: '#0D0221', fg: '#F706CF', acc: '#2DE2E6', cm: 'grad', gr: ['#3A0CA3', '#F706CF', '#2DE2E6'], g: SH('blank dot dot-lg ring-dot'), cols: 70, ca: 1, fill: 1, sizeBy: 0.4, dither: 'none', inv: false, accAmt: 0.02 },
  { n: 'Halftone print', bg: '#FFFFFF', fg: '#111111', acc: '#E5383B', cm: 'mono', g: SH('blank dot-lg'), cols: 70, ca: 1, fill: 1.45, sizeBy: 1, dither: 'none', inv: true, accAmt: 0 },
  { n: 'Braille fine', bg: '#0B0B0C', fg: '#E8E8E8', acc: '#2F5BFF', cm: 'mono', g: CH(' ⠁⠃⠇⠏⠟⠿⡿⣿'), cols: 150, ca: 1.8, fill: 1, sizeBy: 0, dither: 'none', inv: false, accAmt: 0 },
  { n: 'Box lines', bg: '#101014', fg: '#CFD3FF', acc: '#FF5C8A', cm: 'duo', g: CH(' ·─┼╋█'), cols: 96, ca: 1.7, fill: 1, sizeBy: 0, dither: 'none', inv: false, accAmt: 0.015 },
  { n: 'Binary rain', bg: '#020A04', fg: '#00FF66', acc: '#E6FFF0', cm: 'duo', g: CH(' 01'), cols: 90, ca: 1.6, fill: 1, sizeBy: 0, dither: 'bayer', inv: false, accAmt: 0 },
  { n: 'Katakana', bg: '#000000', fg: '#9DFFB0', acc: '#FFFFFF', cm: 'duo', g: CH(' ･ｰﾆｼﾂﾘﾈﾓﾜﾑ'), cols: 80, ca: 1.5, fill: 1, sizeBy: 0, dither: 'none', inv: false, accAmt: 0.01 },
  { n: 'Industrial orange', bg: '#E6E6E3', fg: '#0B0B0B', acc: '#E8501C', cm: 'mono', g: SH('blank dot dash plus square block'), cols: 78, ca: 1, fill: 0.95, sizeBy: 0, dither: 'none', inv: true, accAmt: 0.05 },
  { n: 'Mono rings', bg: '#F2F2F2', fg: '#0B0B0B', acc: '#2F5BFF', cm: 'mono', g: SH('blank dot ring ring-dot dot-lg'), cols: 64, ca: 1, fill: 1, sizeBy: 0, dither: 'none', inv: true, accAmt: 0 },
  { n: 'Colour mosaic', bg: '#0B0B0C', fg: '#FFFFFF', acc: '#FFFFFF', cm: 'image', g: SH('blank square block-in block'), cols: 72, ca: 1, fill: 0.92, sizeBy: 0, dither: 'none', inv: false, accAmt: 0 },
  { n: 'Chroma glyph', bg: '#050505', fg: '#FFFFFF', acc: '#FFFFFF', cm: 'image', g: CH(' .:-=+*#%@'), cols: 110, ca: 1.7, fill: 1, sizeBy: 0, dither: 'none', inv: false, accAmt: 0 },
];

export const ANIMS: [string, string][] = [
  ['none', 'Still'], ['breathe', 'Breathing'], ['waves', 'Waves'], ['ripple', 'Ripple'], ['drift', 'Movement'], ['twinkle', 'Twinkle'],
  ['glitch', 'Glitch'], ['scan', 'Scanline'], ['dissolve', 'Dissolve'], ['swirl', 'Swirl'], ['rain', 'Rain'],
];
export const SOURCES: [string, string][] = [
  ['terrain', 'Terrain'], ['orb', 'Orb'], ['waves', 'Waves'], ['text', 'Text'], ['upload', 'Image'], ['math', 'Math (live)'], ['icon', 'Icon (live)'],
];
export const SIZES: Record<string, [string, number, number]> = {
  sq: ['Square 1080', 1080, 1080], pt: ['Portrait 1080×1350', 1080, 1350], st: ['Story 1080×1920', 1080, 1920],
  ls: ['Landscape 1920×1080', 1920, 1080], bn: ['Banner 1500×500', 1500, 500], ic: ['Icon 512', 512, 512],
};

export const ICONS: Record<string, [string, number][]> = {
  shield: [['M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5c-4.3-1.3-7.5-4.9-7.5-9.5V6z', 0], ['M9 12l2.2 2.2L15.5 10', 1]],
  check: [['M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0', 1], ['M8 12.4l2.8 2.8L16.4 9.6', 1]],
  bell: [['M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.8h-15z', 0], ['M10 20.6a2 2 0 0 0 4 0', 0]],
  lock: [['M5 11h14v10H5z', 1], ['M8 11V8a4 4 0 0 1 8 0v3', 1], ['M12 14.5v3', 1]],
  search: [['M17.5 10.5a7 7 0 1 1-14 0a7 7 0 1 1 14 0', 0], ['M15.6 15.6L21 21', 0]],
  pin: [['M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z', 1], ['M14.5 10a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0', 1]],
  globe: [['M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0', 0], ['M12 3c-3.2 3-3.2 15 0 18c3.2-3 3.2-15 0-18', 0], ['M3 12h18', 0]],
  eye: [['M2.5 12c2.5-4.5 6-6.5 9.5-6.5s7 2 9.5 6.5c-2.5 4.5-6 6.5-9.5 6.5s-7-2-9.5-6.5z', 1], ['M15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0', 1]],
  key: [['M11.5 15a4 4 0 1 1-8 0a4 4 0 1 1 8 0', 0], ['M10.5 12l9-9', 1], ['M16.5 6l2.5 2.5M14.5 8l2 2', 1]],
  user: [['M16 8a4 4 0 1 1-8 0a4 4 0 1 1 8 0', 0], ['M4.5 21c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7', 1]],
  finger: [['M5 10a7 7 0 0 1 14 0v2', 0], ['M8.4 20c-.9-2-1.4-4.2-1.4-7.5a5 5 0 0 1 10 0c0 2.2-.1 4.2-.6 6', 1], ['M12 12.5c0 3 .4 5.5 1.6 8', 0], ['M4.6 15.2c.3-1 .4-2 .4-3.2', 1]],
  wifi: [['M2.5 9a14 14 0 0 1 19 0', 0], ['M5.6 12.5a9.5 9.5 0 0 1 12.8 0', 0], ['M8.7 16a5 5 0 0 1 6.6 0', 1], ['M12 19.6h.01', 1]],
  cloud: [['M7 18.5h10.5a4 4 0 0 0 .4-8a6 6 0 0 0-11.6 1.2A3.4 3.4 0 0 0 7 18.5z', 0], ['M12 13v5M9.8 15.2L12 13l2.2 2.2', 1]],
  bolt: [['M13.5 2.5L4.5 13.5h7l-1 8l9-11h-7z', 0]],
  heart: [['M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z', 1]],
  star: [['M12 3l2.7 5.7 6.3.8-4.6 4.4 1.2 6.2L12 17.1 6.4 20.1l1.2-6.2L3 9.5l6.3-.8z', 0]],
  scan: [['M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5', 0], ['M7 12h10', 1]],
  chip: [['M7 7h10v10H7z', 0], ['M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4', 1]],
  term: [['M3 5h18v14H3z', 0], ['M7 10l3 2.2L7 14.4M12.5 15H17', 1]],
  alert: [['M12 3.5L21.5 20h-19z', 0], ['M12 10v4.5M12 17.4h.01', 1]],
};
export const ICON_ANIMS: [string, string][] = [
  ['none', 'Still'], ['draw', 'Draw on'], ['pulse', 'Pulse'], ['spin', 'Spin'], ['bounce', 'Bounce'], ['wiggle', 'Wiggle'], ['march', 'Dash march'], ['flicker', 'Pixel flicker'],
];

export function presetFields(i: number) {
  const p = PRESETS[i];
  return {
    preset: i, bg: p.bg, fg: p.fg, acc: p.acc, cm: p.cm, gr: (p.gr || [p.bg, p.fg, p.acc]).slice(),
    glyphs: p.g.map((x) => ({ ...x })), cols: p.cols, ca: p.ca, fill: p.fill, sizeBy: p.sizeBy, dither: p.dither, inv: p.inv, accAmt: p.accAmt,
  };
}

export const defaultAscii = () => ({
  src: 'terrain', text: 'SIGNAL', anim: 'waves', amp: 0.5, freq: 2, speed: 1, bright: 0, contrast: 1.25, gamma: 1, fit: 'cover', wt: 400, zoom: 1, panX: 0, panY: 0,
  sel: 1, gtab: 'shape', ...presetFields(0),
});
export const defaultIcon = () => ({
  icon: 'shield', stroke: 1.6, cap: 'square', join: 'miter', tone: 'duo', p: '#8A4BFF', s: '#EDEBFF', canvas: '#120F24', bgShape: 'none', bgc: '#1E1A3A',
  scale: 0.62, pad: 0.08, fillA: 0, cutSeg: 0, cutGap: 1.4, echo: 0, glow: 0, anim: 'draw', pixel: 'off', res: 40, pshape: 'square', ghost: 0.08, rot: 0,
  offX: 0, offY: 0, custom: 'M4 12h16M12 4v16',
});
