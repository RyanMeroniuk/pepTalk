import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { todayString } from '../utils/schedule';

const TIME_SLOTS = ['morning', 'night'];
const ROUTES = [
  { key: 'oral', label: 'Oral' },
  { key: 'subcutaneous', label: 'SubQ' },
  { key: 'intranasal', label: 'Intranasal' },
  { key: 'intramuscular', label: 'IM' },
];
const FREQUENCIES = ['daily', 'weekly', 'biweekly'];

export default function ScheduleFormModal({ visible, itemName, onConfirm, onClose }) {
  const [dose, setDose] = useState('');
  const [timeSlot, setTimeSlot] = useState('morning');
  const [route, setRoute] = useState(null);
  const [frequency, setFrequency] = useState('daily');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const needsStartDate = frequency === 'weekly' || frequency === 'biweekly';

  const handleConfirm = () => {
    onConfirm({
      dose: dose.trim(),
      timeSlot,
      route,
      frequency,
      startDate: needsStartDate
        ? startDate.toISOString().slice(0, 10)
        : todayString(),
      endDate: null,
    });
    // Reset
    setDose('');
    setTimeSlot('morning');
    setRoute(null);
    setFrequency('daily');
    setStartDate(new Date());
    setShowDatePicker(false);
  };

  const handleClose = () => {
    setDose('');
    setTimeSlot('morning');
    setRoute(null);
    setFrequency('daily');
    setStartDate(new Date());
    setShowDatePicker(false);
    onClose();
  };

  const formatDate = (d) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const frequencyLabel = (f) => {
    if (f === 'daily') return 'Every day';
    if (f === 'weekly') return `Every ${startDate.toLocaleDateString('en-US', { weekday: 'long' })}`;
    return `Every other ${startDate.toLocaleDateString('en-US', { weekday: 'long' })}`;
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

          {/* Frequency */}
          <Text style={styles.label}>Frequency</Text>
          <View style={styles.segmented}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.segment, frequency === f && styles.segmentActive]}
                onPress={() => {
                  setFrequency(f);
                  if (f === 'weekly' || f === 'biweekly') {
                    setShowDatePicker(true);
                  }
                }}
              >
                <Text style={[styles.segmentText, frequency === f && styles.segmentTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Start Date (for weekly/biweekly) */}
          {needsStartDate && (
            <View style={styles.dateSection}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
                <Text style={styles.dateHint}>{frequencyLabel(frequency)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    if (date) setStartDate(date);
                    if (Platform.OS === 'android') setShowDatePicker(false);
                  }}
                  minimumDate={new Date()}
                  themeVariant="dark"
                  style={styles.datePicker}
                />
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
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
  dateSection: {
    marginTop: 4,
  },
  dateButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateHint: {
    color: '#2563eb',
    fontSize: 13,
    marginTop: 4,
  },
  datePicker: {
    marginTop: 8,
  },
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
