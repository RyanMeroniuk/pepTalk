import { useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { generateDateRange } from '../utils/schedule';

const CELL_WIDTH = 56;
const PAST_DAYS = 90;
const FUTURE_DAYS = 90;
const TODAY_INDEX = PAST_DAYS;

const dates = generateDateRange(PAST_DAYS, FUTURE_DAYS);

export default function DateStrip({ selectedDate, onSelectDate }) {
  const listRef = useRef(null);

  const getItemLayout = useCallback(
    (_, index) => ({
      length: CELL_WIDTH,
      offset: CELL_WIDTH * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }) => {
      const isSelected = item.dateString === selectedDate;
      const isToday = item.isToday;

      return (
        <TouchableOpacity
          style={[styles.cell, isSelected && styles.cellSelected]}
          onPress={() => onSelectDate(item.dateString)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dayOfWeek, isSelected && styles.textSelected, isToday && !isSelected && styles.textToday]}>
            {item.dayOfWeek}
          </Text>
          <Text style={[styles.dayOfMonth, isSelected && styles.textSelected, isToday && !isSelected && styles.textToday]}>
            {item.dayOfMonth}
          </Text>
          {isToday && !isSelected && <View style={styles.todayDot} />}
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
}

const styles = StyleSheet.create({
  list: {
    flexGrow: 0,
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 8,
  },
  cell: {
    width: CELL_WIDTH,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 2,
  },
  cellSelected: {
    backgroundColor: '#2563eb',
  },
  dayOfWeek: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayOfMonth: {
    color: '#aaa',
    fontSize: 18,
    fontWeight: '700',
  },
  textSelected: {
    color: '#fff',
  },
  textToday: {
    color: '#2563eb',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2563eb',
    marginTop: 4,
  },
});
