// PepTalk design tokens — single source of truth for the light-theme redesign.
// Pulled directly from the design tokens table in the Claude Design prototype.

export const COLORS = {
  // surfaces
  surface: '#FFFFFF',
  background: '#F7F9FC',
  panel: '#EEF2F7',
  hairline: '#E2E8F0',

  // text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',

  // brand blue (peptide accent / primary CTA)
  bluePrimary: '#2563EB',
  blueDeep: '#1D4ED8',
  blueTint: '#EFF6FF',

  // green (supplement accent / success)
  green: '#10B981',
  greenDeep: '#047857',
  greenTint: '#ECFDF5',

  // amber (timing / warning)
  amber: '#F59E0B',
  amberDeep: '#D97706',
  amberTint: '#FFFBEB',

  // red (danger / conflict)
  danger: '#DC2626',
  dangerTint: '#FEF2F2',

  // indigo (AI deep-dive)
  indigo: '#4F46E5',
  indigoDeep: '#3730A3',
  indigoTint: '#EEF2FF',
};

// 4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 22 / 24 / 28 / 32
export const SPACING = {
  xxs: 4,
  xs: 6,
  s: 8,
  sm: 10,
  m: 12,
  ms: 14,
  md: 16,
  l: 18,
  lg: 22,
  xl: 24,
  xxl: 28,
  xxxl: 32,
};

export const RADII = {
  chip: 6,
  iconSquare: 8,
  panel: 10,
  input: 12,
  card: 14,
  answer: 16,
  empty: 18,
  pill: 22,
  full: 9999,
};

export const FONT_SIZES = {
  caption: 11, // small uppercase labels
  meta: 12, // metadata, dose subtext
  small: 13,
  body: 15,
  navTitle: 17,
  sectionTitle: 24,
  screenTitle: 26,
  display: 64, // syringe result number
};

// React Native shadow props — iOS values; elevation set for Android.
export const SHADOWS = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  cta: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
};
