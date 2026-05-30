// Renders the structured block array used by chat answers + Review AI analysis.
// Block shapes:
//   { type: 'p',  text: string, cites?: number[] }   — paragraph
//   { type: 'h',  text: string }                      — bold sub-heading
//   { type: 'li', text: string, cites?: number[] }   — bullet item
//
// Citation chips are rendered inline at the end of each paragraph / bullet.

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, SPACING, RADII } from '../theme/tokens';

function CitationChip({ n, onPress, accent = COLORS.bluePrimary }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: COLORS.blueTint }]}
    >
      <Text style={[styles.chipText, { color: accent }]}>{n}</Text>
    </TouchableOpacity>
  );
}

export default function RichBlocks({ blocks, accent = COLORS.bluePrimary, baseSize = FONT_SIZES.body, onCitePress }) {
  return (
    <View>
      {blocks.map((b, i) => {
        const cites = (b.cites || []).map((n) => (
          <CitationChip key={n} n={n} accent={accent} onPress={() => onCitePress?.(n)} />
        ));
        if (b.type === 'h') {
          return (
            <Text key={i} style={[styles.heading, { fontSize: baseSize + 2 }]}>{b.text}</Text>
          );
        }
        if (b.type === 'li') {
          return (
            <View key={i} style={styles.liRow}>
              <View style={styles.bullet} />
              <Text style={[styles.body, { fontSize: baseSize }]}>
                {b.text}
                {cites.length > 0 ? ' ' : ''}
                {cites}
              </Text>
            </View>
          );
        }
        return (
          <Text
            key={i}
            style={[
              styles.body,
              { fontSize: baseSize },
              i > 0 && { marginTop: SPACING.sm },
            ]}
          >
            {b.text}
            {cites.length > 0 ? ' ' : ''}
            {cites}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.l,
    marginBottom: SPACING.xs,
    letterSpacing: -0.2,
  },
  body: {
    color: COLORS.textPrimary,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  liRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.s,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textTertiary,
    marginTop: 9,
  },
  chip: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    marginLeft: 3,
    borderRadius: RADII.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    lineHeight: 14,
  },
});
