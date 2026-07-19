// Light-theme markdown renderer for AI answers. The backend streams real
// markdown, so rendering it (vs flattening to plain text) preserves headings,
// bold, and bullet structure — matching the design's rich answer body.
//
// Add-to-stack: the model marks each item it recommends with an inline tag
// {{add:Name|amount|unit|slot}} placed right where it names the item. When a
// `suggestions` array is supplied (the backend-validated recommendations), each
// tag whose item is in that list is rendered as a tappable inline "+ Add" pill
// (via a custom markdown link rule); tapping opens ScheduleFormModal pre-filled
// with the AI's dose. Any suggestion not placed inline (e.g. the free-text
// fallback) is shown as a chip below the answer. Tags with no matching validated
// suggestion — already in the stack, or hallucinated — are stripped silently.

import { useState } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useStack } from '../context/StackContext';
import ScheduleFormModal from './ScheduleFormModal';
import Icon from './Icon';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../theme/tokens';

// Inline recommendation tag: {{add:Name|amount|unit|timeSlot}} (fields optional).
const ADD_TAG_RE = /\{\{\s*add:\s*(.*?)\s*\}\}/gis;

// Loose key for matching a tag's raw name to a validated suggestion — both come
// from the model's own text, so lowercased-alphanumeric comparison is reliable.
const normKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

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

  // Match a suggestion by the raw name written in the tag (falling back to its
  // resolved display name).
  const byKey = {};
  for (const s of list) {
    byKey[normKey(s.matchName)] = s;
    byKey[normKey(s.name)] = s;
  }

  // Transform inline tags → markdown links we render as pill buttons. Track which
  // suggestions were placed inline so the rest fall through to bottom chips.
  const inlined = new Set();
  const md = source.replace(ADD_TAG_RE, (_, raw) => {
    const name = (raw.split('|')[0] || '').trim();
    const s = byKey[normKey(name)];
    if (!s || isHidden(s.slug)) return '';
    inlined.add(s.slug);
    return ` [add](add:${s.slug})`;
  });

  const leftover = list.filter((s) => !inlined.has(s.slug) && !isHidden(s.slug));

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

  // Custom link rule: `add:<slug>` → inline pill button; else → normal link.
  // The pill is a rounded View (Text can't round its corners mid-paragraph) which
  // RN lays out inline within the surrounding answer text.
  const rules = {
    link: (node, childNodes) => {
      const href = node.attributes?.href || '';
      if (href.startsWith('add:')) {
        const slug = href.slice(4);
        const s = list.find((x) => x.slug === slug);
        if (!s) return null;
        const isPep = s.category === 'peptide';
        const tint = isPep ? COLORS.blueTint : COLORS.greenTint;
        const accent = isPep ? COLORS.bluePrimary : COLORS.greenDeep;
        return (
          <View key={node.key} style={[styles.inlinePill, { backgroundColor: tint }]}>
            <Text
              style={[styles.inlinePillText, { color: accent }]}
              onPress={() => openForm(s)}
              suppressHighlighting
            >
              + Add
            </Text>
          </View>
        );
      }
      return (
        <Text
          key={node.key}
          style={markdownStyles.link}
          onPress={() => Linking.openURL(href).catch(() => {})}
        >
          {childNodes}
        </Text>
      );
    },
  };

  return (
    <View>
      <Markdown style={markdownStyles} rules={rules} mergeStyle>
        {md}
      </Markdown>

      {leftover.length > 0 && (
        <View style={styles.chipsWrap}>
          <Text style={styles.chipsLabel}>SUGGESTED FOR YOUR STACK</Text>
          <View style={styles.chipRow}>
            {leftover.map((s) => {
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
  // Inline "+ Add" pill rendered within answer prose. A rounded View so it matches
  // the bottom chips' pill shape; RN lays it out inline among the text runs. RN
  // aligns an inline View near the text's top, so nudge it down to sit centered
  // on the line (fontSize 15 / lineHeight 22).
  inlinePill: {
    borderRadius: RADII.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    transform: [{ translateY: 4 }],
  },
  inlinePillText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
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
