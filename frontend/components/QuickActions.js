import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function QuickActions({ onAdd, onSyringe, onReview, stackCount }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.action} onPress={onAdd} activeOpacity={0.7}>
        <View style={[styles.iconCircle, styles.iconAdd]}>
          <Ionicons name="add" size={22} color="#fff" />
        </View>
        <Text style={styles.actionLabel}>Add</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.action} onPress={onSyringe} activeOpacity={0.7}>
        <View style={[styles.iconCircle, styles.iconSyringe]}>
          <Ionicons name="calculator-outline" size={20} color="#fff" />
        </View>
        <Text style={styles.actionLabel}>Syringe</Text>
      </TouchableOpacity>

      {stackCount >= 2 && (
        <TouchableOpacity style={styles.action} onPress={onReview} activeOpacity={0.7}>
          <View style={[styles.iconCircle, styles.iconReview]}>
            <Ionicons name="clipboard-outline" size={20} color="#fff" />
          </View>
          <Text style={styles.actionLabel}>Review</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    gap: 20,
  },
  action: {
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAdd: {
    backgroundColor: '#2563eb',
  },
  iconSyringe: {
    backgroundColor: '#7c3aed',
  },
  iconReview: {
    backgroundColor: '#059669',
  },
  actionLabel: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600',
  },
});
