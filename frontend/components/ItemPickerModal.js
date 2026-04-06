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
          placeholderTextColor="#666"
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
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#2563eb',
    fontSize: 16,
  },
  search: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  item: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemClass: {
    color: '#888',
    fontSize: 13,
    marginTop: 3,
  },
  empty: {
    color: '#555',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
});
