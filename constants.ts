import { BoardSize, PaletteColor } from './types';

export const BOARD_SIZES: BoardSize[] = [
  { label: 'Small (15x15)', width: 15, height: 15 },
  { label: 'Medium (29x29)', width: 29, height: 29 },
  { label: 'Large (45x45)', width: 45, height: 45 },
];

export const DEFAULT_BOARD_SIZE = BOARD_SIZES[1]; // 29x29

export const PALETTE: PaletteColor[] = [
  { id: 1, name: 'Red', hex: '#EF4444' },
  { id: 2, name: 'Orange', hex: '#F97316' },
  { id: 3, name: 'Yellow', hex: '#EAB308' },
  { id: 4, name: 'Lime', hex: '#84CC16' },
  { id: 5, name: 'Green', hex: '#22C55E' },
  { id: 6, name: 'Teal', hex: '#14B8A6' },
  { id: 7, name: 'Cyan', hex: '#06B6D4' },
  { id: 8, name: 'Blue', hex: '#3B82F6' },
  { id: 9, name: 'Purple', hex: '#A855F7' },
  { id: 10, name: 'Pink', hex: '#EC4899' },
  { id: 11, name: 'Brown', hex: '#854D0E' },
  { id: 12, name: 'Black', hex: '#171717' },
  { id: 13, name: 'Grey', hex: '#737373' },
  { id: 14, name: 'White', hex: '#F5F5F5' },
  { id: 15, name: 'Tan', hex: '#FDE68A' },
  { id: 16, name: 'Peach', hex: '#FDBA74' },
];

export const COLOR_MAP: Record<number, string> = PALETTE.reduce((acc, color) => {
  acc[color.id] = color.hex;
  return acc;
}, {} as Record<number, string>);