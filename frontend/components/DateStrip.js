// Horizontal date picker — 7-day window into a 180-day range (90 past, 90 future).
// Active day fills with brand blue, inactive days show the day-of-week label in
// secondary text + day-of-month in primary text.
//
// Keeps the existing imperative `scrollToToday()` ref API used by StackScreen.

import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { generateDateRange } from '../utils/schedule';
import { COLORS, RADII, FONT_SIZES, SPACING } from '../theme/tokens';

const CELL_WIDTH = 48;
const PAST_DAYS = 90;
const FUTURE_DAYS = 90;
const TODAY_INDEX = PAST_DAYS;

const dates = generateDateRange(PAST_DAYS, FUTURE_DAYS);

const DateStrip = forwardRef(function DateStrip({ selectedDate, onSelectDate }, ref) {
  const listRef = useRef(null);

  useImperativeHandle(ref, () => ({
    scrollToToday: () => {
      listRef.current?.scrollToIndex({ index: TODAY_INDEX, animated: true, viewPosition: 0.5 });
    },
  }));

  const getItemLayout = useCallback(
    (_, index) => ({
      length: CELL_WIDTH + 6, // cell + horizontal margin
      offset: (CELL_WIDTH + 6) * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }) => {
      const isSelected = item.dateString === selectedDate;
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onSelectDate(item.dateString)}
          style={[styles.cell, isSelected && styles.cellSelected]}
        >
          <Text
            style={[
              styles.dow,
              isSelected ? styles.dowActive : item.isToday && styles.dowToday,
            ]}
          >
            {item.dayOfWeek.toUpperCase()}
          </Text>
          <Text
            style={[
              styles.dom,
              isSelected ? styles.domActive : item.isToday && styles.domToday,
            ]}
          >
            {item.dayOfMonth}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedDate, onSelectDate]
  );

  return (
    <FlatList
      ref={listRef}
      data={dates}
      renderItem={renderItem}
      keyExtractor={(item) => item.dateString}
      horizontal
      showsHorizontalScrollIndicator={false}
      getItemLayout={getItemLayout}
      initialScrollIndex={TODAY_INDEX}
      style={styles.list}
      contentContainerStyle={styles.content}
    />
  );
});

export default DateStrip;

const styles = StyleSheet.create({
  list: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: SPACING.ms,
    paddingTop: SPACING.xxs,
    paddingBottom: SPACING.ms,
  },
  cell: {
    width: CELL_WIDTH,
    paddingVertical: SPACING.s,
    alignItems: 'center',
    borderRadius: RADII.input,
    marginHorizontal: 3,
    gap: SPACING.xxs,
  },
  cellSelected: {
    backgroundColor: COLORS.bluePrimary,
  },
  dow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: COLORS.textSecondary,
  },
  dowActive: {
    color: '#FFFFFF',
    opacity: 0.85,
  },
  dowToday: {
    color: COLORS.bluePrimary,
  },
  dom: {
    fontSize: FONT_SIZES.navTitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  domActive: {
    color: '#FFFFFF',
  },
  domToday: {
    color: COLORS.bluePrimary,
  },
});
