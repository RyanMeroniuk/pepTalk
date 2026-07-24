// Light-theme markdown renderer for AI answers. The backend streams real
// markdown, so rendering it (vs flattening to plain text) preserves headings,
// bold, and bullet structure — matching the design's rich answer body.
//
// Add-to-stack: the model marks each item it recommends with an inline tag
// {{add:Name|amount|unit|slot}}; the backend parses those into the validated
// `suggestions` array. Here we strip the tags from the displayed text and render
// each suggestion (that the user isn't already on) as a "+ <item>" chip below the
// answer. Tapping a chip opens ScheduleFormModal pre-filled with the AI's dose.

import { useState } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useStack } from '../context/StackContext';
import ScheduleFormModal from './ScheduleFormModal';
import Icon from './Icon';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../theme/tokens';

// Inline recommendation tag: {{add:Name|amount|unit|timeSlot}} — stripped from the
// displayed text (the backend already parsed these into `suggestions`).
const ADD_TAG_RE = /\{\{\s*add:\s*(.*?)\s*\}\}/gis;

export default function MarkdownBubble({ children, suggestions }) {
  const { stack, addItem } = useStack();
  const [addedSlugs, setAddedSlugs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [initialValues, setInitialValues] = useState(null);

  const source = String(children ?? '');
  const list = suggestions || [];

  // Hide items already in the stack or added this session.
  const stackSlugs = new Set(stack.map((s) => s.slug));
  const isHidden = (slug) => stackSlugs.has(slug) || addedSlugs.includes(slug);

  // Strip the inline markers from the displayed answer; every validated suggestion
  // the user isn't already on becomes a chip below.
  const md = source.replace(ADD_TAG_RE, '');
  const chips = list.filter((s) => !isHidden(s.slug));

  const openForm = (s) => {
    if (!s) return;
    setSelected(s);
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
    <View>
      <Markdown style={markdownStyles} mergeStyle>
        {md}
      </Markdown>

      {chips.length > 0 && (
        <View style={styles.chipsWrap}>
          <Text style={styles.chipsLabel}>SUGGESTED FOR YOUR STACK</Text>
          <View style={styles.chipRow}>
            {chips.map((s) => {
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
        </View>
      )}

      {list.length > 0 && (
        <ScheduleFormModal
          visible={selected !== null}
          itemName={selected?.name || ''}
          initialValues={initialValues}
          onConfirm={handleConfirm}
          onClose={closeForm}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipsWrap: {
    marginTop: SPACING.l,
    paddingTop: SPACING.ms,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  chipsLabel: {
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

const markdownStyles = StyleSheet.create({
  body: {
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  heading1: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  heading2: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  strong: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  em: {
    fontStyle: 'italic',
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  bullet_list_icon: {
    color: COLORS.textTertiary,
    fontSize: 8,
    marginTop: 8,
    marginRight: 10,
  },
  ordered_list_icon: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginRight: 8,
  },
  code_inline: {
    backgroundColor: COLORS.panel,
    color: COLORS.blueDeep,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  fence: {
    backgroundColor: COLORS.panel,
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  code_block: {
    backgroundColor: COLORS.panel,
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  hr: {
    backgroundColor: COLORS.hairline,
    height: 1,
    marginVertical: 8,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.hairline,
    paddingLeft: 10,
    marginVertical: 4,
  },
  link: {
    color: COLORS.bluePrimary,
  },
});
