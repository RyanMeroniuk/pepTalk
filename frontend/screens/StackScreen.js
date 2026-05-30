// PepTalk — Stack / daily protocol screen.
// Light-theme redesign matching design inspo/claudeDesignCode/stack-app.jsx.
//
// All state and persistence comes from the existing StackContext; this screen
// is a pure presentation rewrite. Add-flow modals (category picker → item picker
// → schedule form) are preserved as-is in their current dark styling and get
// restyled in Step 7.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStack } from '../context/StackContext';
import {
  getItemsForDate,
  todayString,
  formatDateHeader,
  describeDays,
} from '../utils/schedule';
import DateStrip from '../components/DateStrip';
import QuickActions from '../components/QuickActions';
import DoseCheckbox from '../components/DoseCheckbox';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import ItemPickerModal from '../components/ItemPickerModal';
import ScheduleFormModal from '../components/ScheduleFormModal';
import { COLORS, RADII, SPACING, FONT_SIZES, SHADOWS } from '../theme/tokens';
import { API_URL } from '../config';

// Route values stored as 'oral' / 'subcutaneous' / 'intranasal' / 'intramuscular'.
// Display them as short uppercase labels matching the design.
const ROUTE_LABEL = {
  oral: 'ORAL',
  subcutaneous: 'SUBQ',
  intranasal: 'IN',
  intramuscular: 'IM',
};

export default function StackScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    stack,
    addItem,
    removeItem,
    loadLogsForDate,
    logDose,
    unlogDose,
    isLogged,
  } = useStack();

  const dateStripRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(todayString());

  // Backend item catalog (for the add flow)
  const [peptides, setPeptides] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Add-flow state — unchanged from original
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [pickerCategory, setPickerCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/peptides`).then((r) => r.json()),
      fetch(`${API_URL}/supplements`).then((r) => r.json()),
    ])
      .then(([pepData, supData]) => {
        setPeptides(pepData.items || []);
        setSupplements(supData.items || []);
        setDataLoaded(true);
      })
      .catch(() => setDataLoaded(true));
  }, []);

  useEffect(() => {
    loadLogsForDate(selectedDate);
  }, [selectedDate, loadLogsForDate]);

  const dayItems = getItemsForDate(stack, selectedDate);
  const morningItems = dayItems.filter((s) => s.timeSlot === 'morning');
  const nightItems = dayItems.filter((s) => s.timeSlot === 'night');
  const taken = dayItems.filter((i) => isLogged(selectedDate, i.id)).length;
  const isToday = selectedDate === todayString();

  // --- Add flow ---
  const handleAddPress = () => setShowCategoryPicker(true);
  const handleCategorySelect = (category) => {
    setPickerCategory(category);
    setShowCategoryPicker(false);
    setShowItemPicker(true);
  };
  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setShowItemPicker(false);
    setShowScheduleForm(true);
  };
  const handleScheduleConfirm = (scheduleData) => {
    if (selectedItem) {
      addItem({
        item: selectedItem.name,
        slug: selectedItem.slug,
        category: pickerCategory,
        ...scheduleData,
      });
    }
    resetAddFlow();
  };
  const resetAddFlow = () => {
    setShowScheduleForm(false);
    setShowItemPicker(false);
    setShowCategoryPicker(false);
    setSelectedItem(null);
    setPickerCategory(null);
  };

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

  if (!dataLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.bluePrimary} />
      </View>
    );
  }

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
            <Text style={styles.title}>
              {isToday ? 'Today' : formatDateHeader(selectedDate)}
            </Text>
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
        />

        <QuickActions
          onAdd={handleAddPress}
          onSyringe={() => navigation.navigate('SyringeCalculator')}
          onReview={() => navigation.navigate('Review')}
        />

        {/* Adherence summary — only shown when there are items today */}
        {dayItems.length > 0 && (
          <AdherenceBar taken={taken} total={dayItems.length} />
        )}

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

      {/* --- Add-flow modals (still legacy dark styling — restyled in Step 7) --- */}
      <Modal visible={showCategoryPicker} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.categoryModal}>
            <Text style={styles.modalTitle}>What are you adding?</Text>
            <TouchableOpacity
              style={styles.categoryBtn}
              onPress={() => handleCategorySelect('peptide')}
            >
              <Icon name="flask" size={22} color={COLORS.bluePrimary} />
              <Text style={styles.categoryBtnText}>Peptide</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.categoryBtn}
              onPress={() => handleCategorySelect('supplement')}
            >
              <Icon name="leaf" size={22} color={COLORS.greenDeep} />
              <Text style={styles.categoryBtnText}>Supplement</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetAddFlow}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ItemPickerModal
        visible={showItemPicker}
        title={pickerCategory === 'peptide' ? 'Select a Peptide' : 'Select a Supplement'}
        items={pickerCategory === 'peptide' ? peptides : supplements}
        onSelect={handleItemSelect}
        onClose={resetAddFlow}
      />

      <ScheduleFormModal
        visible={showScheduleForm}
        itemName={selectedItem?.name || ''}
        onConfirm={handleScheduleConfirm}
        onClose={resetAddFlow}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// AdherenceBar — "X of Y doses taken · NN%" with progress bar.
// When all doses are logged, switches to green with a check.
// ─────────────────────────────────────────────────────────────
function AdherenceBar({ taken, total }) {
  const pct = total === 0 ? 0 : Math.round((taken / total) * 100);
  const complete = taken === total && total > 0;
  return (
    <View style={[adStyles.wrap, SHADOWS.card]}>
      <View style={adStyles.row}>
        <View style={adStyles.leftRow}>
          {complete && (
            <View style={adStyles.checkDot}>
              <Icon name="check" size={11} color="#fff" strokeWidth={3.5} />
            </View>
          )}
          <Text style={adStyles.label}>
            {complete ? 'All doses logged' : `${taken} of ${total} doses taken`}
          </Text>
        </View>
        <Text
          style={[
            adStyles.pct,
            { color: complete ? COLORS.greenDeep : COLORS.textSecondary },
          ]}
        >
          {pct}%
        </Text>
      </View>
      <View style={adStyles.track}>
        <View
          style={[
            adStyles.fill,
            {
              width: `${pct}%`,
              backgroundColor: complete ? COLORS.green : COLORS.bluePrimary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const adStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: SPACING.ms,
    marginBottom: SPACING.l,
    paddingHorizontal: SPACING.ms,
    paddingVertical: SPACING.m,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.hairline,
    borderWidth: 1,
    borderRadius: RADII.input,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.s,
  },
  leftRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s },
  checkDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pct: {
    fontSize: FONT_SIZES.meta,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: RADII.full,
    backgroundColor: COLORS.panel,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADII.full,
  },
});

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
          {item.dose ? <Text style={dcStyles.dose}>{item.dose}</Text> : null}
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
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  title: {
    fontSize: FONT_SIZES.screenTitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  goToday: {
    color: COLORS.bluePrimary,
    fontSize: 13,
    fontWeight: '600',
    padding: 4,
  },

  // --- Legacy add-flow modal (Step 7 cleanup) ---
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  categoryModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.navTitle,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.l,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    backgroundColor: COLORS.background,
    borderRadius: RADII.input,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  categoryBtnText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.m,
    marginTop: SPACING.xxs,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.body,
  },
});
