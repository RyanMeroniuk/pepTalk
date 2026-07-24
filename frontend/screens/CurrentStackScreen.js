// PepTalk — Current Stack master list, presented as a modal from Stack quick actions.
//
// The daily Protocol view only shows items scheduled for the selected date, so
// removing everything meant flipping through days. This screen lists the ENTIRE
// stack (every item, regardless of schedule) in one place, grouped by category,
// so the user can edit or delete any item without hunting across dates.
//
// Edit reuses ScheduleFormModal (pre-filled via initialValues) → updateItem.
// Delete confirms first, then removeItem.

import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStack } from '../context/StackContext';
import { formatDose, describeDays } from '../utils/schedule';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import ScheduleFormModal from '../components/ScheduleFormModal';
import { COLORS, RADII, SPACING, FONT_SIZES, SHADOWS } from '../theme/tokens';

const ROUTE_LABEL = {
  oral: 'ORAL',
  subcutaneous: 'SUBQ',
  intranasal: 'IN',
  intramuscular: 'IM',
};

export default function CurrentStackScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { stack, removeItem, updateItem } = useStack();
  const [editing, setEditing] = useState(null); // the item being edited

  const peptides = stack.filter((s) => s.category === 'peptide');
  const supplements = stack.filter((s) => s.category === 'supplement');

  const confirmRemove = (item) => {
    Alert.alert(
      `Remove ${item.item}?`,
      'This removes it from your stack entirely.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeItem(item.id) },
      ]
    );
  };

  const handleEditConfirm = (scheduleData) => {
    if (editing) updateItem(editing.id, scheduleData);
    setEditing(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.s }]}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Current Stack</Text>
          <Text style={styles.headerSub}>
            {stack.length} {stack.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.done}>Done</Text>
        </TouchableOpacity>
      </View>

      {stack.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Icon name="stack" size={26} color={COLORS.textSecondary} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Your stack is empty</Text>
          <Text style={styles.emptySub}>
            Tap the + button to add a peptide or supplement.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {peptides.length > 0 && (
            <Section
              label="Peptides"
              count={peptides.length}
              items={peptides}
              onEdit={setEditing}
              onRemove={confirmRemove}
            />
          )}
          {supplements.length > 0 && (
            <Section
              label="Supplements"
              count={supplements.length}
              items={supplements}
              onEdit={setEditing}
              onRemove={confirmRemove}
            />
          )}
        </ScrollView>
      )}

      <ScheduleFormModal
        visible={editing !== null}
        itemName={editing?.item || ''}
        subtitle="Edit protocol"
        confirmLabel="Save changes"
        initialValues={
          editing
            ? {
                doseAmount: editing.doseAmount ?? null,
                doseUnit: editing.doseUnit || null,
                timeSlot: editing.timeSlot || null,
                route: editing.route || null,
                daysOfWeek: editing.daysOfWeek || null,
              }
            : null
        }
        onConfirm={handleEditConfirm}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

function Section({ label, count, items, onEdit, onRemove }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      {items.map((item) => (
        <ItemRow key={item.id} item={item} onEdit={onEdit} onRemove={onRemove} />
      ))}
    </View>
  );
}

function ItemRow({ item, onEdit, onRemove }) {
  const isPep = item.category === 'peptide';
  const routeLabel = item.route ? ROUTE_LABEL[item.route] || item.route.toUpperCase() : null;
  const schedule =
    item.daysOfWeek && item.daysOfWeek.length < 7 ? describeDays(item.daysOfWeek) : 'Every day';
  const dose = formatDose(item);

  return (
    <View style={[styles.row, SHADOWS.card]}>
      <TouchableOpacity
        style={styles.rowBody}
        activeOpacity={0.6}
        onPress={() => onEdit(item)}
      >
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.item}
          </Text>
          <Badge variant={isPep ? 'peptide' : 'supplement'}>
            {isPep ? 'Peptide' : 'Supplement'}
          </Badge>
        </View>
        <View style={styles.metaRow}>
          {dose ? <Text style={styles.dose}>{dose}</Text> : null}
          {routeLabel && <Badge variant="route">{routeLabel}</Badge>}
          <Text style={styles.schedule}>· {schedule}</Text>
        </View>
        <View style={styles.editHint}>
          <Icon name="pencil" size={11} color={COLORS.textTertiary} />
          <Text style={styles.editHintText}>Tap to edit</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(item)}
        hitSlop={8}
        activeOpacity={0.7}
      >
        <Icon name="x" size={15} color={COLORS.danger} strokeWidth={2.5} />
      </TouchableOpacity>
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
  headerSub: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  done: {
    color: COLORS.bluePrimary,
    fontSize: 15,
    fontWeight: '600',
    padding: 4,
  },
  scroll: {
    padding: SPACING.md,
    paddingBottom: 40,
    gap: SPACING.lg,
  },
  section: {
    gap: SPACING.s,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.xxs,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.9,
  },
  sectionCount: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.hairline,
    borderWidth: 1,
    borderRadius: RADII.card,
    paddingVertical: SPACING.m,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.s,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
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
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  editHintText: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.full,
    backgroundColor: COLORS.dangerTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.s,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.ms,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: FONT_SIZES.navTitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
});
