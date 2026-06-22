export type ColorPalette = {
  primary: string; primaryLight: string; primaryDark: string; primaryMuted: string;
  gold: string; goldLight: string; goldBright: string; goldPale: string;
  success: string; successLight: string; warning: string; warningLight: string;
  danger: string; dangerLight: string; info: string; infoLight: string;
  white: string; background: string; surface: string; border: string; borderLight: string;
  text: string; textSecondary: string; textTertiary: string; textInverse: string;
  overlay: string; shadow: string; cardShadow: string;
};

export type ThemeName = 'peacock' | 'atelier';

const Peacock: ColorPalette = {
  primary: '#226880',
  primaryLight: '#E3EEF1',
  primaryDark: '#15495C',
  primaryMuted: '#5A95A8',

  gold: '#CF9A2E',
  goldLight: '#FBF1DA',
  goldBright: '#E6B84E',
  goldPale: '#F2D27A',

  success: '#1D8A5F',
  successLight: '#DDF0E6',
  warning: '#C97A1E',
  warningLight: '#FBEEDB',
  danger: '#C1473F',
  dangerLight: '#FAE6E4',
  info: '#226880',
  infoLight: '#E3EEF1',

  white: '#FFFFFF',
  background: '#F6F3EC',
  surface: '#FFFFFF',
  border: '#E5DFD0',
  borderLight: '#F0EBDF',

  text: '#1C2B30',
  textSecondary: '#5C6E73',
  textTertiary: '#8FA0A4',
  textInverse: '#FFFFFF',

  overlay: 'rgba(20, 35, 40, 0.45)',
  shadow: 'rgba(34, 104, 128, 0.08)',
  cardShadow: 'rgba(34, 104, 128, 0.10)',
};

const Atelier: ColorPalette = {
  primary: '#8B3A5B',
  primaryLight: '#F7E8EF',
  primaryDark: '#621B3E',
  primaryMuted: '#B87090',

  gold: '#CF9A2E',
  goldLight: '#FBF1DA',
  goldBright: '#E6B84E',
  goldPale: '#F2D27A',

  success: '#1D8A5F',
  successLight: '#DDF0E6',
  warning: '#C97A1E',
  warningLight: '#FBEEDB',
  danger: '#C1473F',
  dangerLight: '#FAE6E4',
  info: '#8B3A5B',
  infoLight: '#F7E8EF',

  white: '#FFFFFF',
  background: '#FBF4F7',
  surface: '#FFFFFF',
  border: '#EAD9E0',
  borderLight: '#F4EBF0',

  text: '#2B1A23',
  textSecondary: '#705060',
  textTertiary: '#A08090',
  textInverse: '#FFFFFF',

  overlay: 'rgba(40, 20, 30, 0.45)',
  shadow: 'rgba(139, 58, 91, 0.08)',
  cardShadow: 'rgba(139, 58, 91, 0.10)',
};

export const THEMES: Record<ThemeName, ColorPalette> = { peacock: Peacock, atelier: Atelier };

// Mutable active palette — mutated in-place by ThemeContext when theme changes
export const Colors: ColorPalette = { ...Peacock };
