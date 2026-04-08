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
            placeholderTextColor="#555"
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
    backgroundColor: '#111',
  },
  scroll: {
    padding: 24,
    paddingBottom: 140,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 28,
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  hint: {
    color: '#666',
    fontSize: 13,
    marginBottom: 12,
    marginTop: -4,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#2563eb',
  },
  segmentText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  pillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pillText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
  },
  // Day picker
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  presetBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  presetText: {
    color: '#888',
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
    backgroundColor: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: '#333',
  },
  dayCircleActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  dayLetter: {
    color: '#666',
    fontSize: 16,
    fontWeight: '700',
  },
  dayLetterActive: {
    color: '#fff',
  },
  dayLabel: {
    color: '#555',
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  dayLabelActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  summaryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  summaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCount: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  // Bottom
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  confirmBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: '#888',
    fontSize: 15,
  },
});
