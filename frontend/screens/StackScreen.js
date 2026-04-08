import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStack } from '../context/StackContext';
import { getItemsForDate, todayString, formatDateHeader, describeDays } from '../utils/schedule';
import DateStrip from '../components/DateStrip';
import QuickActions from '../components/QuickActions';
import DoseCheckbox from '../components/DoseCheckbox';
import ItemPickerModal from '../components/ItemPickerModal';
import ScheduleFormModal from '../components/ScheduleFormModal';
import StackReviewModal from '../components/StackReviewModal';

const API_URL = 'http://10.0.0.83:8000';

export default function StackScreen() {
  const navigation = useNavigation();
  const { stack, addItem, removeItem, loadLogsForDate, logDose, unlogDose, isLogged } = useStack();

  const [selectedDate, setSelectedDate] = useState(todayString());
  const [showReview, setShowReview] = useState(false);

  // Backend data
  const [peptides, setPeptides] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Add flow state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [pickerCategory, setPickerCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Fetch backend data
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

  // Load dose logs when date changes
  useEffect(() => {
    loadLogsForDate(selectedDate);
  }, [selectedDate, loadLogsForDate]);

  // Compute items for the selected date
  const dayItems = getItemsForDate(stack, selectedDate);
  const morningItems = dayItems.filter((s) => s.timeSlot === 'morning');
  const nightItems = dayItems.filter((s) => s.timeSlot === 'night');

  // --- Add Flow ---
  const handleAddPress = () => {
    setShowCategoryPicker(true);
  };

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

  // --- Dose Logging ---
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

  // --- Rendering ---
  const renderCard = (item) => {
    const checked = isLogged(selectedDate, item.id);
    return (
      <View key={item.id} style={[styles.card, checked && styles.cardChecked]}>
        <DoseCheckbox checked={checked} onToggle={() => handleToggleDose(item.id)} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardName, checked && styles.cardNameChecked]}>{item.item}</Text>
            <View
              style={[
                styles.categoryPill,
                item.category === 'peptide' ? styles.pillPeptide : styles.pillSupplement,
              ]}
            >
              <Text style={styles.pillText}>{item.category}</Text>
            </View>
          </View>
          <View style={styles.cardMeta}>
            {item.dose ? <Text style={styles.cardDose}>{item.dose}</Text> : null}
            {item.route && (
              <View style={styles.routePill}>
                <Text style={styles.routeText}>{item.route}</Text>
              </View>
            )}
          </View>
          {item.daysOfWeek && item.daysOfWeek.length < 7 && (
            <Text style={styles.cardSchedule}>{describeDays(item.daysOfWeek)}</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#555" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSection = (title, icon, items) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon} size={18} color="#888" />
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{items.length}</Text>
        </View>
        {items.map(renderCard)}
      </View>
    );
  };

  if (!dataLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const isToday = selectedDate === todayString();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions Widget */}
        <QuickActions
          onAdd={handleAddPress}
          onSyringe={() => navigation.navigate('SyringeCalculator')}
          onReview={() => setShowReview(true)}
          stackCount={stack.length}
        />

        {/* Date Strip */}
        <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {/* Date Header */}
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>
            {isToday ? 'Today' : formatDateHeader(selectedDate)}
          </Text>
          {!isToday && (
            <TouchableOpacity onPress={() => setSelectedDate(todayString())}>
              <Text style={styles.todayLink}>Go to Today</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Day Summary */}
        {dayItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#333" />
            <Text style={styles.emptyTitle}>Nothing scheduled</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button above to add a peptide or supplement
            </Text>
          </View>
        ) : (
          <>
            {renderSection('Morning', 'sunny-outline', morningItems)}
            {renderSection('Night', 'moon-outline', nightItems)}

            {/* Completion summary */}
            <View style={styles.completionBar}>
              <Text style={styles.completionText}>
                {dayItems.filter((i) => isLogged(selectedDate, i.id)).length} / {dayItems.length} completed
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.categoryModal}>
            <Text style={styles.modalTitle}>What are you adding?</Text>
            <TouchableOpacity
              style={styles.categoryBtn}
              onPress={() => handleCategorySelect('peptide')}
            >
              <Ionicons name="flask-outline" size={22} color="#2563eb" />
              <Text style={styles.categoryBtnText}>Peptide</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.categoryBtn}
              onPress={() => handleCategorySelect('supplement')}
            >
              <Ionicons name="leaf-outline" size={22} color="#22c55e" />
              <Text style={styles.categoryBtnText}>Supplement</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetAddFlow}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Item Picker */}
      <ItemPickerModal
        visible={showItemPicker}
        title={pickerCategory === 'peptide' ? 'Select a Peptide' : 'Select a Supplement'}
        items={pickerCategory === 'peptide' ? peptides : supplements}
        onSelect={handleItemSelect}
        onClose={resetAddFlow}
      />

      {/* Schedule Form */}
      <ScheduleFormModal
        visible={showScheduleForm}
        itemName={selectedItem?.name || ''}
        onConfirm={handleScheduleConfirm}
        onClose={resetAddFlow}
      />

      {/* Stack Review */}
      <StackReviewModal
        visible={showReview}
        onClose={() => setShowReview(false)}
        stack={stack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Date header
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dateHeaderText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  todayLink: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  // Sections
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    color: '#555',
    fontSize: 13,
    fontWeight: '500',
  },
  // Cards
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardChecked: {
    opacity: 0.7,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardNameChecked: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pillPeptide: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
  },
  pillSupplement: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#aaa',
    textTransform: 'uppercase',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  cardDose: {
    color: '#888',
    fontSize: 14,
  },
  routePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#222',
  },
  routeText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  cardSchedule: {
    color: '#555',
    fontSize: 12,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 8,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#555',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  // Completion bar
  completionBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  completionText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '500',
  },
  // Modals (category picker)
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  categoryModal: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  categoryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelBtnText: {
    color: '#888',
    fontSize: 15,
  },
});
