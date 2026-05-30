import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { WEEKDAYS, describeDays } from '../utils/schedule';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../theme/tokens';

const TIME_SLOTS = ['morning', 'night'];
const ROUTES = [
  { key: 'oral', label: 'Oral' },
  { key: 'subcutaneous', label: 'SubQ' },
  { key: 'intranasal', label: 'Intranasal' },
  { key: 'intramuscular', label: 'IM' },
];

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function ScheduleFormModal({ visible, itemName, onConfirm, onClose }) {
  const [dose, setDose] = useState('');
  const [timeSlot, setTimeSlot] = useState('morning');
  const [route, setRoute] = useState(null);
  const [daysOfWeek, setDaysOfWeek] = useState(ALL_DAYS);

  const toggleDay = (dayIndex) => {
    setDaysOfWeek((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const selectAllDays = () => setDaysOfWeek(ALL_DAYS);
  const selectWeekdays = () => setDaysOfWeek([1, 2, 3, 4, 5]);

  const handleConfirm = () => {
    onConfirm({
      dose: dose.trim(),
      timeSlot,
      route,
      daysOfWeek,
    });
    resetForm();
  };

  const resetForm = () => {
    setDose('');
    setTimeSlot('morning');
    setRoute(null);
    setDaysOfWeek(ALL_DAYS);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <Text style={styles.title}>{itemName}</Text>
          <Text style={styles.subtitle}>Configure your protocol</Text>

          {/* Dose */}
          <Text style={styles.label}>Dose</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 250mcg, 500mg, 2 capsules"
            placeholderTextColor={COLORS.textTertiary}
            value={dose}
            onChangeText={setDose}
            autoFocus
          />

          {/* Time Slot */}
          <Text style={styles.label}>Time of Day</Text>
          <View style={styles.segmented}>
            {TIME_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[styles.segment, timeSlot === slot && styles.segmentActive]}
                onPress={() => setTimeSlot(slot)}
              >
                <Text style={[styles.segmentText, timeSlot === slot && styles.segmentTextActive]}>
                  {slot.charAt(0).toUpperCase() + slot.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Route */}
          <Text style={styles.label}>Route (optional)</Text>
          <View style={styles.pillRow}>
            {ROUTES.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[styles.pill, route === r.key && styles.pillActive]}
                onPress={() => setRoute(route === r.key ? null : r.key)}
              >
                <Text style={[styles.pillText, route === r.key && styles.pillTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Schedule — Day Picker */}
          <Text style={styles.label}>Schedule</Text>
          <Text style={styles.hint}>Which days do you take this?</Text>

          {/* Quick presets */}
          <View style={styles.presetRow}>
            <TouchableOpacity
              style={[styles.presetBtn, daysOfWeek.length === 7 && styles.presetBtnActive]}
              onPress={selectAllDays}
            >
              <Text style={[styles.presetText, daysOfWeek.length === 7 && styles.presetTextActive]}>
                Every Day
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.presetBtn,
                daysOfWeek.length === 5 &&
                  daysOfWeek.every((d) => d >= 1 && d <= 5) &&
                  styles.presetBtnActive,
              ]}
              onPress={selectWeekdays}
            >
              <Text
                style={[
                  styles.presetText,
                  daysOfWeek.length === 5 &&
                    daysOfWeek.every((d) => d >= 1 && d <= 5) &&
                    styles.presetTextActive,
                ]}
              >
                Weekdays
              </Text>
            </TouchableOpacity>
          </View>

          {/* Day circles */}
          <View style={styles.dayRow}>
            {WEEKDAYS.map((day) => {
              const selected = daysOfWeek.includes(day.index);
              return (
                <TouchableOpacity
                  key={day.index}
                  style={[styles.dayCircle, selected && styles.dayCircleActive]}
                  onPress={() => toggleDay(day.index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayLetter, selected && styles.dayLetterActive]}>
                    {day.short}
                  </Text>
                  <Text style={[styles.dayLabel, selected && styles.dayLabelActive]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{describeDays(daysOfWeek)}</Text>
            <Text style={styles.summaryCount}>
              {daysOfWeek.length} {daysOfWeek.length === 1 ? 'day' : 'days'} per week
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.confirmBtn, daysOfWeek.length === 0 && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={daysOfWeek.length === 0}
          >
            <Text style={styles.confirmBtnText}>Add to Stack</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: SPACING.xl,
    paddingBottom: 140,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: SPACING.xxl,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    marginTop: SPACING.l,
    marginBottom: SPACING.s,
  },
  hint: {
    color: COLORS.textTertiary,
    fontSize: 13,
    marginBottom: SPACING.m,
    marginTop: -4,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.input,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.ms,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.body,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.panel,
    borderRadius: RADII.panel,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADII.iconSquare,
  },
  segmentActive: {
    backgroundColor: COLORS.bluePrimary,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  pill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  pillActive: {
    backgroundColor: COLORS.bluePrimary,
    borderColor: COLORS.bluePrimary,
  },
  pillText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
  },
  // Day picker
  presetRow: {
    flexDirection: 'row',
    gap: SPACING.s,
    marginBottom: SPACING.md,
  },
  presetBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.s,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  presetBtnActive: {
    backgroundColor: COLORS.bluePrimary,
    borderColor: COLORS.bluePrimary,
  },
  presetText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  presetTextActive: {
    color: '#fff',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 44,
    height: 56,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
  },
  dayCircleActive: {
    backgroundColor: COLORS.bluePrimary,
    borderColor: COLORS.bluePrimary,
  },
  dayLetter: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  dayLetterActive: {
    color: '#fff',
  },
  dayLabel: {
    color: COLORS.textTertiary,
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  dayLabelActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  summaryCard: {
    backgroundColor: COLORS.panel,
    borderRadius: RADII.input,
    padding: SPACING.ms,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  summaryText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  // Bottom
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.l,
    paddingBottom: 40,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  confirmBtn: {
    backgroundColor: COLORS.bluePrimary,
    borderRadius: RADII.input,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: FONT_SIZES.body,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.m,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.body,
  },
});
