// PepTalk — Stack / daily protocol screen.
// Light-theme redesign matching design inspo/claudeDesignCode/stack-app.jsx.
//
// All state and persistence comes from the existing StackContext; this screen
// is a pure presentation rewrite. Add-flow modals (category picker → item picker
// → schedule form) are preserved as-is in their current dark styling and get
// restyled in Step 7.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStack } from '../context/StackContext';
import {
  getItemsForDate,
  todayString,
  getWeekDates,
  describeDays,
  formatDose,
} from '../utils/schedule';
import DateStrip from '../components/DateStrip';
import DoseProgress from '../components/DoseProgress';
import QuickActions from '../components/QuickActions';
import DoseCheckbox from '../components/DoseCheckbox';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import { COLORS, RADII, SPACING, FONT_SIZES, SHADOWS } from '../theme/tokens';

// Route values stored as 'oral' / 'subcutaneous' / 'intranasal' / 'intramuscular'.
// Display them as short uppercase labels matching the design.
const ROUTE_LABEL = {
  oral: 'ORAL',
  subcutaneous: 'SUBQ',
  intranasal: 'IN',
  intramuscular: 'IM',
};

// Items only carry a coarse timeSlot (the schedule form offers morning/night),
// so map each slot to a representative clock time for the "next at …" readout.
// Ordering decides which pending dose is "next".
const SLOT_TIME = {
  morning: '8:00 AM',
  midday: '12:00 PM',
  evening: '6:00 PM',
  night: '8:00 PM',
  bedtime: '10:00 PM',
};
const SLOT_ORDER = { morning: 0, midday: 1, evening: 2, night: 3, bedtime: 4 };

export default function StackScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    stack,
    removeItem,
    logs,
    loadLogsForDates,
    logDose,
    unlogDose,
    isLogged,
  } = useStack();

  const dateStripRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(todayString());

  // The Sunday-first week containing the selection — drives both the log fetch
  // and the DateStrip dot track.
  const week = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  useEffect(() => {
    loadLogsForDates(week.map((d) => d.dateString));
  }, [week, loadLogsForDates]);

  // Per-day adherence ratio (0..1) for the visible week. Days with no scheduled
  // items are omitted so DateStrip renders them as hairline.
  const adherenceByDate = useMemo(() => {
    const map = {};
    for (const { dateString } of week) {
      const items = getItemsForDate(stack, dateString);
      if (items.length === 0) continue;
      const dayLogs = logs[dateString] || [];
      const taken = items.filter((i) => dayLogs.includes(i.id)).length;
      map[dateString] = taken / items.length;
    }
    return map;
  }, [week, stack, logs]);

  const dayItems = getItemsForDate(stack, selectedDate);
  const morningItems = dayItems.filter((s) => s.timeSlot === 'morning');
  const nightItems = dayItems.filter((s) => s.timeSlot === 'night');
  const taken = dayItems.filter((i) => isLogged(selectedDate, i.id)).length;
  const remaining = dayItems.length - taken;
  const isToday = selectedDate === todayString();

  // The soonest pending (unlogged) dose drives the "next at …" readout.
  const nextTime = dayItems
    .filter((i) => !isLogged(selectedDate, i.id))
    .sort((a, b) => (SLOT_ORDER[a.timeSlot] ?? 99) - (SLOT_ORDER[b.timeSlot] ?? 99))
    .map((i) => SLOT_TIME[i.timeSlot] || null)[0] ?? null;

  // --- Dose toggle ---
  const handleToggleDose = useCallback(
    (itemId) => {
      if (isLogged(selectedDate, itemId)) {
        unlogDose(selectedDate, itemId);
      } else {
        logDose(selectedDate, itemId);
      }
    },
    [selectedDate, isLogged, logDose, unlogDose]
  );

  // --- Item more-menu (confirms before destructive delete) ---
  const handleMore = (item) => {
    Alert.alert(item.item, null, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove from stack',
        style: 'destructive',
        onPress: () => removeItem(item.id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACING.s }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — eyebrow + title + go-to-today */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>MY STACK</Text>
          </View>
          {!isToday && (
            <TouchableOpacity
              onPress={() => {
                setSelectedDate(todayString());
                dateStripRef.current?.scrollToToday();
              }}
              hitSlop={10}
            >
              <Text style={styles.goToday}>Go to Today</Text>
            </TouchableOpacity>
          )}
        </View>

        <DateStrip
          ref={dateStripRef}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          adherenceByDate={adherenceByDate}
        />

        {/* Dose progress ring — always shown, renders a zero-state when the day
            has no scheduled items */}
        <DoseProgress
          taken={taken}
          total={dayItems.length}
          remaining={remaining}
          nextTime={nextTime}
          isToday={isToday}
        />

        <QuickActions
          onCurrentStack={() => navigation.navigate('CurrentStack')}
          onSyringe={() => navigation.navigate('SyringeCalculator')}
          onReview={() => navigation.navigate('Review')}
        />

        {/* Sections / empty state */}
        {dayItems.length === 0 ? (
          <StackEmpty />
        ) : (
          <>
            {morningItems.length > 0 && (
              <>
                <SectionHeader icon="sun" label="Morning" count={morningItems.length} />
                {morningItems.map((item) => (
                  <DoseCard
                    key={item.id}
                    item={item}
                    checked={isLogged(selectedDate, item.id)}
                    onToggle={() => handleToggleDose(item.id)}
                    onMore={() => handleMore(item)}
                  />
                ))}
              </>
            )}
            {nightItems.length > 0 && (
              <View style={{ marginTop: SPACING.ms }}>
                <SectionHeader icon="moon" label="Night" count={nightItems.length} />
                {nightItems.map((item) => (
                  <DoseCard
                    key={item.id}
                    item={item}
                    checked={isLogged(selectedDate, item.id)}
                    onToggle={() => handleToggleDose(item.id)}
                    onMore={() => handleMore(item)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SectionHeader — sun/moon icon + uppercase label + count
// ─────────────────────────────────────────────────────────────
function SectionHeader({ icon, label, count }) {
  return (
    <View style={shStyles.row}>
      <Icon name={icon} size={13} color={COLORS.textSecondary} />
      <Text style={shStyles.label}>{label.toUpperCase()}</Text>
      <Text style={shStyles.count}>{count}</Text>
    </View>
  );
}

const shStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.xxs,
    paddingBottom: SPACING.s,
  },
  label: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.9,
  },
  count: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
});

// ─────────────────────────────────────────────────────────────
// DoseCard — main row: checkbox + name + badges + meta + more
// ─────────────────────────────────────────────────────────────
function DoseCard({ item, checked, onToggle, onMore }) {
  const isPep = item.category === 'peptide';
  const routeLabel = item.route ? ROUTE_LABEL[item.route] || item.route.toUpperCase() : null;
  const scheduleLabel =
    item.daysOfWeek && item.daysOfWeek.length < 7
      ? describeDays(item.daysOfWeek)
      : null;

  return (
    <View style={[dcStyles.card, checked && dcStyles.cardDim, SHADOWS.card]}>
      <View style={{ marginTop: 1 }}>
        <DoseCheckbox checked={checked} onToggle={onToggle} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={dcStyles.titleRow}>
          <Text
            style={[
              dcStyles.name,
              checked && {
                textDecorationLine: 'line-through',
                color: COLORS.textSecondary,
              },
            ]}
            numberOfLines={1}
          >
            {item.item}
          </Text>
          <Badge variant={isPep ? 'peptide' : 'supplement'}>
            {isPep ? 'Peptide' : 'Supplement'}
          </Badge>
        </View>
        <View style={dcStyles.metaRow}>
          {formatDose(item) ? <Text style={dcStyles.dose}>{formatDose(item)}</Text> : null}
          {routeLabel && <Badge variant="route">{routeLabel}</Badge>}
          {scheduleLabel && (
            <Text style={dcStyles.schedule}>· {scheduleLabel}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={onMore} hitSlop={8} style={dcStyles.moreBtn}>
        <Icon name="more" size={16} color={COLORS.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const dcStyles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.ms,
    marginBottom: SPACING.s,
    paddingVertical: SPACING.m,
    paddingLeft: SPACING.ms,
    paddingRight: SPACING.m,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.hairline,
    borderWidth: 1,
    borderRadius: RADII.card,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.m,
  },
  cardDim: {
    opacity: 0.62,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  dose: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  schedule: {
    fontSize: 11.5,
    color: COLORS.textTertiary,
  },
  moreBtn: {
    padding: 4,
    marginTop: 1,
  },
});

// ─────────────────────────────────────────────────────────────
// StackEmpty — dashed card with icon, hint, and category tags
// ─────────────────────────────────────────────────────────────
function StackEmpty() {
  return (
    <View style={emStyles.card}>
      <View style={emStyles.iconBox}>
        <Icon name="calendar" size={26} color={COLORS.textSecondary} strokeWidth={1.5} />
      </View>
      <View style={{ alignItems: 'center' }}>
        <Text style={emStyles.title}>Nothing scheduled</Text>
        <Text style={emStyles.subtitle}>
          Tap the <Text style={emStyles.subtitleBold}>+ Add item</Text> button above to add a peptide or supplement to your daily protocol.
        </Text>
      </View>
      <View style={emStyles.tagRow}>
        <View style={[emStyles.tag, { backgroundColor: COLORS.blueTint }]}>
          <Icon name="flask" size={12} color={COLORS.blueDeep} />
          <Text style={[emStyles.tagText, { color: COLORS.blueDeep }]}>Peptides</Text>
        </View>
        <View style={[emStyles.tag, { backgroundColor: COLORS.greenTint }]}>
          <Icon name="leaf" size={12} color={COLORS.greenDeep} />
          <Text style={[emStyles.tagText, { color: COLORS.greenDeep }]}>Supplements</Text>
        </View>
      </View>
    </View>
  );
}

const emStyles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.ms,
    marginTop: SPACING.xl,
    paddingVertical: 40,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.empty,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: SPACING.ms,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES.navTitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 260,
  },
  subtitleBold: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  tagRow: {
    flexDirection: 'row',
    gap: SPACING.s,
    marginTop: SPACING.xxs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.full,
  },
  tagText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});

// ─────────────────────────────────────────────────────────────
// Screen-level styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingTop: SPACING.m,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: FONT_SIZES.meta,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.7,
  },
  goToday: {
    color: COLORS.bluePrimary,
    fontSize: 13,
    fontWeight: '600',
    padding: 4,
  },
});
