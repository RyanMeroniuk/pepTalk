// Uppercase tag pill. Used for: category (PEPTIDE/SUPPLEMENT), route (SUBQ/ORAL),
// severity (HIGH/MODERATE/LOW), and tool/section markers (TOOL).
//
// Variants map to a (bg, text) color pair. `solid` fills with the accent; `tint`
// uses a tinted background with the deeper text color (default look from design).

import { Text, View, StyleSheet } from 'react-native';
import { COLORS, RADII, FONT_SIZES } from '../theme/tokens';

const VARIANTS = {
  peptide: { bg: COLORS.blueTint, fg: COLORS.bluePrimary },
  supplement: { bg: COLORS.greenTint, fg: COLORS.greenDeep },
  route: { bg: COLORS.panel, fg: COLORS.textSecondary },
  high: { bg: COLORS.dangerTint, fg: COLORS.danger },
  moderate: { bg: COLORS.amberTint, fg: COLORS.amberDeep },
  low: { bg: COLORS.greenTint, fg: COLORS.greenDeep },
  tool: { bg: COLORS.blueTint, fg: COLORS.bluePrimary },
  neutral: { bg: COLORS.panel, fg: COLORS.textSecondary },
};

export default function Badge({ children, variant = 'neutral', style }) {
  const v = VARIANTS[variant] || VARIANTS.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.text, { color: v.fg }]}>{String(children).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADII.chip,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FONT_SIZES.caption - 1, // 10
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
