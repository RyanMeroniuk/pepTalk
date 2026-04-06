import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStack } from '../context/StackContext';
import ItemPickerModal from '../components/ItemPickerModal';
import StackReviewModal from '../components/StackReviewModal';

const API_URL = 'http://10.0.0.239:8000';

export default function StackScreen() {
  const { stack, addItem, removeItem } = useStack();
  const [showReview, setShowReview] = useState(false);

  // Data from backend
  const [peptides, setPeptides] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Add flow state
  const [pendingTimeSlot, setPendingTimeSlot] = useState(null); // 'morning' | 'night'
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [pickerCategory, setPickerCategory] = useState(null); // 'peptide' | 'supplement'
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDoseInput, setShowDoseInput] = useState(false);
  const [doseText, setDoseText] = useState('');

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

  const morningItems = stack.filter((s) => s.timeSlot === 'morning');
  const nightItems = stack.filter((s) => s.timeSlot === 'night');

  const handleAddPress = (timeSlot) => {
    setPendingTimeSlot(timeSlot);
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
    setDoseText('');
    setShowDoseInput(true);
  };

  const handleDoseConfirm = () => {
    if (selectedItem) {
      addItem({
        item: selectedItem.name,
        slug: selectedItem.slug,
        category: pickerCategory,
        dose: doseText.trim() || '',
        timeSlot: pendingTimeSlot,
      });
    }
    resetAddFlow();
  };

  const resetAddFlow = () => {
    setShowDoseInput(false);
    setShowItemPicker(false);
    setShowCategoryPicker(false);
    setPendingTimeSlot(null);
    setSelectedItem(null);
    setPickerCategory(null);
    setDoseText('');
  };

  const renderCard = (item) => (
    <View key={item.id} style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{item.item}</Text>
          <View
            style={[
              styles.categoryPill,
              item.category === 'peptide' ? styles.pillPeptide : styles.pillSupplement,
            ]}
          >
            <Text style={styles.pillText}>{item.category}</Text>
          </View>
        </View>
        {item.dose ? <Text style={styles.cardDose}>{item.dose}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const renderSection = (title, icon, items, timeSlot) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color="#fff" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>Tap + to add your first item</Text>
      ) : (
        items.map(renderCard)
      )}

      <TouchableOpacity style={styles.addBtn} onPress={() => handleAddPress(timeSlot)}>
        <Ionicons name="add" size={22} color="#2563eb" />
        <Text style={styles.addBtnText}>Add Item</Text>
      </TouchableOpacity>
    </View>
  );

  if (!dataLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {stack.length >= 2 && (
          <TouchableOpacity style={styles.reviewBtn} onPress={() => setShowReview(true)}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
            <Text style={styles.reviewBtnText}>Review My Stack</Text>
          </TouchableOpacity>
        )}
        {renderSection('Morning', 'sunny-outline', morningItems, 'morning')}
        {renderSection('Night', 'moon-outline', nightItems, 'night')}
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

      {/* Dose Input Modal */}
      <Modal visible={showDoseInput} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.doseModal}>
            <Text style={styles.modalTitle}>
              {selectedItem?.name}
            </Text>
            <Text style={styles.doseLabel}>Dose (optional)</Text>
            <TextInput
              style={styles.doseInput}
              placeholder="e.g. 250mcg 2x/day"
              placeholderTextColor="#666"
              value={doseText}
              onChangeText={setDoseText}
              autoFocus
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={handleDoseConfirm}>
              <Text style={styles.confirmBtnText}>Add to Stack</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetAddFlow}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    padding: 16,
    paddingBottom: 40,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  reviewBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLeft: {
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
  cardDose: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addBtnText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '500',
  },
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
  doseModal: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  doseLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
  },
  doseInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  confirmBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
