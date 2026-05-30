// Base white card. Used for dose cards, quick action tiles, starter prompts,
// chat answer cards. Consistent borderRadius (14) + subtle shadow.
//
// Two pass-throughs: `style` for layout overrides (margin, padding) and
// `inner` for content padding control. Pass `noShadow` to skip the elevation
// when nesting inside a parent that already has one.

import { View, StyleSheet } from 'react-native';
import { COLORS, RADII, SHADOWS } from '../theme/tokens';

export default function Card({ children, style, noShadow = false }) {
  return (
    <View style={[styles.card, !noShadow && SHADOWS.card, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
});
