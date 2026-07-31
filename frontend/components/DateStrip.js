// Compact date navigator — arrow-stepped label over a 7-dot week track.
//
// Prev/next chevrons step selectedDate by one day (local time only, never
// toISOString). The centered label reads "Today" (with the short date beneath)
// when the selection is today, otherwise the short form "Tue, May 27". Below it,
// a Sunday-first week track shows one dot per day, colored by dose adherence.
//
// Keeps the existing imperative scrollToToday() ref API used by StackScreen —
// it now simply jumps the selection back to today.

import { forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { toLocalDateString, todayString, getWeekDates } from '../utils/schedule';
import Icon from './Icon';
import { COLORS, SPACING, FONT_SIZES } from '../theme/tokens';

// Shift a "YYYY-MM-DD" string by whole days in local time.
function shiftDate(dateString, delta) {
  const d = new Date(dateString + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toLocalDateString(d);
}

// "Tue, May 27"
function shortDate(dateString) {
  const d = new Date(dateString + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Resolve a day's dot appearance. Selection always wins; otherwise the color
// reflects the day's adherence ratio (0..1). Missing/absent ratios read as
// hairline ("nothing logged").
function dotFor(dateString, selectedDate, adherenceByDate) {
  if (dateString === selectedDate) {
    return { size: 8, color: COLORS.bluePrimary, opacity: 1 };
  }
  const ratio = adherenceByDate ? adherenceByDate[dateString] : undefined;
  if (ratio >= 1) return { size: 6, color: COLORS.green, opacity: 1 };
  if (ratio > 0) return { size: 6, color: COLORS.bluePrimary, opacity: 0.33 };
  return { size: 6, color: COLORS.hairline, opacity: 1 };
}

const DateStrip = forwardRef(function DateStrip(
  { selectedDate, onSelectDate, adherenceByDate },
  ref
) {
  useImperativeHandle(ref, () => ({
    scrollToToday: () => onSelectDate(todayString()),
  }));

  const isToday = selectedDate === todayString();
  const week = getWeekDates(selectedDate);

  return (
    <View style={styles.container}>
      {/* Arrow-stepped label */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => onSelectDate(shiftDate(selectedDate, -1))}
          hitSlop={10}
          style={styles.arrow}
        >
          <Icon name="back" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.labelWrap}>
          {isToday ? (
            <>
              <Text style={styles.todayTitle}>Today</Text>
              <Text style={styles.todaySub}>{shortDate(selectedDate)}</Text>
            </>
          ) : (
            <Text style={styles.todayTitle}>{shortDate(selectedDate)}</Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() => onSelectDate(shiftDate(selectedDate, 1))}
          hitSlop={10}
          style={styles.arrow}
        >
          <Icon name="chevron" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Sunday-first week dot track */}
      <View style={styles.track}>
        {week.map((day) => {
          const dot = dotFor(day.dateString, selectedDate, adherenceByDate);
          return (
            <TouchableOpacity
              key={day.dateString}
              onPress={() => onSelectDate(day.dateString)}
              activeOpacity={0.7}
              style={styles.column}
            >
              <Text style={styles.dayLetter}>{day.letter}</Text>
              <View style={styles.dotSlot}>
                <View
                  style={{
                    width: dot.size,
                    height: dot.size,
                    borderRadius: dot.size / 2,
                    backgroundColor: dot.color,
                    opacity: dot.opacity,
                  }}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

export default DateStrip;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.ms,
    paddingTop: SPACING.xxs,
    paddingBottom: SPACING.ms,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    padding: SPACING.xs,
  },
  labelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  todayTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  todaySub: {
    fontSize: FONT_SIZES.meta,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  track: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  column: {
    width: 34,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dayLetter: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
  },
  dotSlot: {
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
