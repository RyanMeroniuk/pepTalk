// Circular dose-progress tracker for the selected day. A ring shows taken /
// total with the count in the center, beside a "Doses taken today" headline and
// a "N remaining · next at H:MM" subline. Every value is derived from the user's
// stack + dose logs by StackScreen — nothing here is hard-coded. When the day is
// fully logged the ring closes to green and the subline switches to a done state.

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, RADII, SPACING, FONT_SIZES, SHADOWS } from '../theme/tokens';

const SIZE = 74;
const STROKE = 7;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export default function DoseProgress({ taken, total, remaining, nextTime, isToday }) {
  const complete = total > 0 && taken >= total;
  const pct = total > 0 ? Math.min(taken / total, 1) : 0;
  const dash = CIRC * pct;
  const arcColor = complete ? COLORS.green : COLORS.bluePrimary;

  const subtitle =
    total === 0
      ? 'Nothing scheduled'
      : complete
      ? 'All doses logged'
      : `${remaining} remaining${nextTime ? ` · next at ${nextTime}` : ''}`;

  return (
    <View style={styles.card}>
      <View style={styles.ring}>
        <Svg width={SIZE} height={SIZE}>
          {/* Track */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={COLORS.panel}
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Progress arc — starts at 12 o'clock, sweeps clockwise */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={arcColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${CIRC - dash}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.count}>{taken}</Text>
          <Text style={styles.countTotal}>of {total}</Text>
        </View>
      </View>

      <View style={styles.textCol}>
        <Text style={styles.title}>{isToday ? 'Doses taken today' : 'Doses taken'}</Text>
        <Text style={[styles.subtitle, complete && { color: COLORS.greenDeep }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.ms,
    marginBottom: SPACING.l,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.hairline,
    borderWidth: 1,
    borderRadius: RADII.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  ring: {
    width: SIZE,
    height: SIZE,
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  countTotal: {
    fontSize: FONT_SIZES.meta,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.navTitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
});
