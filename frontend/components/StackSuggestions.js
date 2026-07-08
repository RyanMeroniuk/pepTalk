// PepTalk — Add-to-stack suggestion chips.
//
// Rendered under an AI answer (chat) or the Stack Review deep-dive. The backend
// parses the items the AI actively recommends (and the user isn't already taking)
// out of the answer and sends them as a {type:'suggestions'} SSE event; each
// becomes a "+ <name>" chip. Tapping a chip opens the existing ScheduleFormModal
// pre-filled with the AI's suggested dose/timing; confirming adds it to the stack.

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useStack } from '../context/StackContext';
import Icon from './Icon';
import ScheduleFormModal from './ScheduleFormModal';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../theme/tokens';

export default function StackSuggestions({ suggestions }) {
  const { stack, addItem } = useStack();
  const [addedSlugs, setAddedSlugs] = useState([]);
  const [selected, setSelected] = useState(null); // the suggestion being scheduled
  const [initialValues, setInitialValues] = useState(null);

  // Hide anything already in the stack or added during this session.
  const stackSlugs = new Set(stack.map((s) => s.slug));
  const visible = (suggestions || []).filter(
    (s) => s.slug && !stackSlugs.has(s.slug) && !addedSlugs.includes(s.slug)
  );

  if (visible.length === 0) return null;

  const openForm = (s) => {
    setSelected(s);
    // Stable reference for the modal's open-sync effect (built once per tap).
    setInitialValues({
      doseAmount: s.doseAmount ?? null,
      doseUnit: s.doseUnit || null,
      timeSlot: s.timeSlot || null,
    });
  };

  const closeForm = () => {
    setSelected(null);
    setInitialValues(null);
  };

  const handleConfirm = (scheduleData) => {
    if (selected) {
      addItem({
        item: selected.name,
        slug: selected.slug,
        category: selected.category,
        ...scheduleData,
      });
      setAddedSlugs((prev) => [...prev, selected.slug]);
    }
    closeForm();
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>SUGGESTED FOR YOUR STACK</Text>
      <View style={styles.chipRow}>
        {visible.map((s) => {
          const isPep = s.category === 'peptide';
          const tint = isPep ? COLORS.blueTint : COLORS.greenTint;
          const accent = isPep ? COLORS.bluePrimary : COLORS.greenDeep;
          return (
            <TouchableOpacity
              key={s.slug}
              activeOpacity={0.7}
              onPress={() => openForm(s)}
              style={[styles.chip, { backgroundColor: tint }]}
            >
              <Icon name="plus" size={13} color={accent} strokeWidth={2.5} />
              <Text style={[styles.chipText, { color: accent }]}>{s.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScheduleFormModal
        visible={selected !== null}
        itemName={selected?.name || ''}
        initialValues={initialValues}
        onConfirm={handleConfirm}
        onClose={closeForm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: SPACING.l,
    paddingTop: SPACING.ms,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  label: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.7,
    marginBottom: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: RADII.full,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
