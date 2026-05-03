// Noah design tokens — shared between mockups and the live app.
// Palette inspired by the Webster's Universal Unabridged Dictionary
// (deep navy + embossed gold + cream paper) with kid-friendly accents.

export const palette = {
  navy: '#1F3A6A',
  navyDim: '#2F4E83',
  navyDeep: '#14264A',

  gold: '#D4A847',
  goldBright: '#EFC669',
  goldDim: '#A8801E',
  goldPale: '#FBEDC4',

  cream: '#FBF7EC',
  paper: '#FFFFFF',
  warmCream: '#F5EED8',

  slate: '#5E6E84',
  slateLight: '#A8B5C4',
  parchmentEdge: '#D4C9A0',

  coral: '#F2A48A',
  coralDeep: '#C97961',
  coralPale: '#FDE2D6',

  sage: '#B7CEB8',
  sageDeep: '#88A98A',
  sagePale: '#E2EDDF',

  lavender: '#C5BFE0',
  lavenderPale: '#ECEAF6',

  sky: '#A5C8E0',
  skyPale: '#DCE9F2',

  errorPale: '#FDE2D6',
  error: '#B91C1C',
} as const;

// Per-child avatar color cycle. Names indexed by their first character
// fall consistently into the same color.
export const avatarColors = [
  { bg: palette.coral, fg: '#FFFFFF' },
  { bg: palette.sage, fg: palette.navyDeep },
  { bg: palette.goldBright, fg: palette.navyDeep },
  { bg: palette.lavender, fg: palette.navyDeep },
  { bg: palette.sky, fg: palette.navyDeep },
] as const;

export function avatarColorFor(name: string) {
  const code = (name.charCodeAt(0) || 0) % avatarColors.length;
  return avatarColors[code];
}

// Typography — see lib/fonts.ts for the loaded font names
export const fonts = {
  // Brand mark — gilt Webster cover
  wordmark: 'DMSerifDisplay_400Regular',
  // Words being learned (flashcards, library, stat numbers)
  contentSerif: 'Fraunces_700Bold',
  contentSerifBold: 'Fraunces_800ExtraBold',
  contentSerifSemi: 'Fraunces_600SemiBold',
  contentSerifItalic: 'DMSerifDisplay_400Regular_Italic',
  // UI / body
  body: 'Nunito_400Regular',
  bodyMedium: 'Nunito_500Medium',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyExtraBold: 'Nunito_800ExtraBold',
  // Hand-felt accents (taglines, "you did it!" moments)
  hand: 'Caveat_700Bold',
  handMedium: 'Caveat_500Medium',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  lift: {
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;
