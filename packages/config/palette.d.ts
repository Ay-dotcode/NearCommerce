export type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
export type Scale = Record<Shade, string>;
export interface Palette {
  white: string;
  slate: Scale;
  brand: Scale;
  red: Scale;
  emerald: Scale;
  amber: Scale;
  yellow: Scale;
}
export const light: Palette;
export const dark: Palette;
export const constants: { onbrand: string; scrim: string };
export const SHADES: Shade[];
