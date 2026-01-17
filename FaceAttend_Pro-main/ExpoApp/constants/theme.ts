const palette = {
  primary: "#2563EB",
  primaryLight: "#DBEAFE",
  background: "#F8FAFC",
  card: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  border: "#E5E7EB"
};

export const Colors = {
  light: {
    ...palette,
    text: palette.textPrimary,
    tint: palette.primary,
    icon: palette.textSecondary,
    tabIconDefault: palette.textSecondary,
    tabIconSelected: palette.primary,
  },
  dark: {
    ...palette,
    text: '#ECEDEE',
    background: '#151718',
    tint: palette.primary,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: palette.primary,
    card: '#1F2937',
    textPrimary: '#F9FAFB',
    textSecondary: '#D1D5DB',
  },
};

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20
};
