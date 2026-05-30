import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../theme/tokens';

export default function ItemPickerModal({ visible, onClose, onSelect, items, title }) {
  const [search, setSearch] = useState('');

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item) => {
    setSearch('');
    onSelect(item);
  };

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.search}
          placeholder="Search..."
          placeholderTextColor={COLORS.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoFocus
        />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.classification && (
                <Text style={styles.itemClass}>{item.classification}</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No results found</Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.navTitle,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: COLORS.bluePrimary,
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  search: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    margin: SPACING.md,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.m,
    fontSize: FONT_SIZES.body,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 40,
  },
  item: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.input,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: SPACING.ms,
    marginBottom: SPACING.s,
  },
  itemName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  itemClass: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  empty: {
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: FONT_SIZES.body,
  },
});
