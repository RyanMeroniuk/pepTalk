// PepTalk — Add to Stack flow, presented as a modal from the center "+" tab button.
//
// Extracted from StackScreen so the add flow is reachable globally (from any tab)
// via the center FAB. Three steps: choose category → pick item → set schedule.
// The item catalog (peptides + supplements) is fetched from the backend on mount.

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStack } from '../context/StackContext';
import Icon from '../components/Icon';
import ItemPickerModal from '../components/ItemPickerModal';
import ScheduleFormModal from '../components/ScheduleFormModal';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../theme/tokens';
import { API_URL } from '../config';

export default function AddItemScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addItem } = useStack();

  const [peptides, setPeptides] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [pickerCategory, setPickerCategory] = useState(null);
  const [showItemPicker, setShowItemPicker] = useState(false);
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

  const handleCategorySelect = (category) => {
    setPickerCategory(category);
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
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.s }]}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Add to Stack</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {!dataLoaded ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.bluePrimary} />
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.prompt}>What are you adding?</Text>
          <TouchableOpacity
            style={styles.categoryBtn}
            activeOpacity={0.8}
            onPress={() => handleCategorySelect('peptide')}
          >
            <View style={[styles.catIcon, { backgroundColor: COLORS.blueTint }]}>
              <Icon name="flask" size={22} color={COLORS.bluePrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.categoryBtnText}>Peptide</Text>
              <Text style={styles.categoryBtnSub}>{peptides.length} available</Text>
            </View>
            <Icon name="chevron" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.categoryBtn}
            activeOpacity={0.8}
            onPress={() => handleCategorySelect('supplement')}
          >
            <View style={[styles.catIcon, { backgroundColor: COLORS.greenTint }]}>
              <Icon name="leaf" size={22} color={COLORS.greenDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.categoryBtnText}>Supplement</Text>
              <Text style={styles.categoryBtnSub}>{supplements.length} available</Text>
            </View>
            <Icon name="chevron" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      <ItemPickerModal
        visible={showItemPicker}
        title={pickerCategory === 'peptide' ? 'Select a Peptide' : 'Select a Supplement'}
        items={pickerCategory === 'peptide' ? peptides : supplements}
        onSelect={handleItemSelect}
        onClose={() => setShowItemPicker(false)}
      />

      <ScheduleFormModal
        visible={showScheduleForm}
        itemName={selectedItem?.name || ''}
        onConfirm={handleScheduleConfirm}
        onClose={() => setShowScheduleForm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.ms,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  cancel: {
    color: COLORS.bluePrimary,
    fontSize: 15,
    fontWeight: '600',
    padding: 4,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: SPACING.l,
    gap: SPACING.m,
  },
  prompt: {
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    marginBottom: SPACING.xs,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: SPACING.md,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: RADII.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBtnText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  categoryBtnSub: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    marginTop: 1,
  },
});
