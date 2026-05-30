// Three-column quick-action grid: Add item / Syringe calc / AI Review.
// Each card has a tinted icon square, a primary label, and a secondary subtitle.
//
// The Review action is always rendered; tapping with an empty stack will just
// navigate to a Review screen that shows the "no items" empty state — better
// UX than hiding the button entirely.

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { COLORS, RADII, SPACING, FONT_SIZES, SHADOWS } from '../theme/tokens';

const ACTIONS = [
  { key: 'add', icon: 'plus', label: 'Add item', sub: 'Peptide or supp' },
  { key: 'syringe', icon: 'syringe', label: 'Syringe calc', sub: 'Dose by mg/mL' },
  { key: 'review', icon: 'shield', label: 'AI Review', sub: 'Check conflicts' },
];

export default function QuickActions({ onAdd, onSyringe, onReview }) {
  const handlers = { add: onAdd, syringe: onSyringe, review: onReview };
  return (
    <View style={styles.row}>
      {ACTIONS.map((a) => (
        <TouchableOpacity
          key={a.key}
          activeOpacity={0.7}
          onPress={handlers[a.key]}
          style={styles.card}
        >
          <View style={styles.iconSquare}>
            <Icon name={a.icon} size={16} color={COLORS.bluePrimary} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.label}>{a.label}</Text>
            <Text style={styles.sub}>{a.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.ms,
    gap: SPACING.s,
    marginBottom: SPACING.ms,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.hairline,
    borderWidth: 1,
    borderRadius: RADII.card,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.s,
    ...SHADOWS.card,
  },
  iconSquare: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  sub: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
});
