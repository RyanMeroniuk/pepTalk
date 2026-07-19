// PepTalk — AI chat (Answer engine).
// Light-theme redesign matching design inspo/claudeDesignCode/chat-app.jsx.
//
// React Native fetch can't stream a response body incrementally, so we keep the
// original "await full text → parse SSE lines" approach. While the request is in
// flight we show an animated StreamingCard; on completion we render the full
// answer card. Source IDs come from the backend's {type:'sources'} SSE event.

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  useAnimatedValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MarkdownBubble from '../components/MarkdownBubble';
import Icon from '../components/Icon';
import SparkAvatar from '../components/SparkAvatar';
import { useStack } from '../context/StackContext';
import { COLORS, RADII, SPACING, FONT_SIZES, SHADOWS } from '../theme/tokens';
import { API_URL } from '../config';

// Starter prompts are built from the user's actual stack so they always retrieve
// real context (a question about an item you take pulls that item's sections).
// When the stack is empty we fall back to general/educational prompts — the
// compound-specific ones still work thanks to backend query→item detection.
function buildStarters(stack) {
  if (stack.length > 0) {
    const foodTarget = stack.find((s) => s.category === 'peptide') || stack[0];
    const starters = [
      { icon: 'shield', title: 'Review my stack for conflicts', sub: 'Checked against your stack' },
    ];
    if (foodTarget) {
      starters.push({
        icon: 'fork',
        title: `What should I eat on ${foodTarget.item}?`,
        sub: 'Foods to favor, foods to avoid, timing',
      });
    }
    starters.push(
      { icon: 'flame', title: 'Build a recomp protocol', sub: 'Personalized to your stack' },
      { icon: 'moon', title: 'Best supplements for sleep', sub: 'Compare melatonin, glycine, magnesium' }
    );
    return starters;
  }

  return [
    { icon: 'fork', title: 'What should I eat on tirzepatide?', sub: 'Foods to favor, foods to avoid, timing' },
    { icon: 'shield', title: 'How does semaglutide work?', sub: 'Mechanism, benefits, dosing' },
    { icon: 'flame', title: 'What is BPC-157 used for?', sub: 'Healing, dosing, stacking' },
    { icon: 'moon', title: 'Best supplements for sleep', sub: 'Compare melatonin, glycine, magnesium' },
  ];
}

// Inline add-to-stack tags: {{add:Name|amount|unit|slot}}. MarkdownBubble turns
// these into inline buttons for display, but they must be stripped from the text
// sent back to the model as conversation history. (See backend chat.py ADD_TAG_RE.)
const ADD_TAG_RE = /\{\{\s*add:\s*.*?\s*\}\}/gis;

// Format a backend source id ("peptides/semaglutide/dosing-protocols") into a
// readable breadcrumb + kind. Defensive: works for any "/"-delimited id.
function formatSource(id) {
  const parts = String(id).split('/').filter(Boolean);
  const KINDS = { peptides: 'Peptide', supplements: 'Supplement', lifestyle: 'Lifestyle' };
  let kind = 'Reference';
  let crumbs = parts;
  if (parts.length > 1 && KINDS[parts[0]]) {
    kind = KINDS[parts[0]];
    crumbs = parts.slice(1);
  }
  const titleize = (s) =>
    s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { breadcrumb: crumbs.map(titleize).join(' › '), kind };
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { stack } = useStack();
  const [prompt, setPrompt] = useState('');
  const [turns, setTurns] = useState([]); // {question, answer, sources, error}
  const [history, setHistory] = useState([]);
  const [streamingQuestion, setStreamingQuestion] = useState(null);
  const scrollRef = useRef(null);

  const loading = streamingQuestion !== null;
  const isEmpty = turns.length === 0 && !loading;
  const starters = useMemo(() => buildStarters(stack), [stack]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(
    async (textOverride) => {
      const text = (textOverride ?? prompt).trim();
      if (!text || loading) return;

      setPrompt('');
      setStreamingQuestion(text);
      scrollToEnd();

      try {
        const res = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            stack: stack.map((s) => ({
              item: s.item,
              category: s.category,
              slug: s.slug,
              doseAmount: s.doseAmount,
              doseUnit: s.doseUnit,
              daysOfWeek: s.daysOfWeek,
              timeSlot: s.timeSlot,
              route: s.route,
            })),
            history,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP ${res.status}`);
        }

        const rawText = await res.text();
        let fullReply = '';
        let sources = [];
        let suggestions = [];

        for (const line of rawText.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'token') fullReply += event.content;
            else if (event.type === 'sources') sources = event.sources || [];
            else if (event.type === 'suggestions') suggestions = event.suggestions || [];
            else if (event.type === 'error') throw new Error(event.content);
          } catch {
            // skip malformed SSE line
          }
        }

        // Strip any inline "Sources:" tail the model may append (we render the
        // structured sources event instead). Inline {{add:…}} tags are KEPT in the
        // displayed answer — MarkdownBubble turns them into inline buttons.
        fullReply = fullReply.replace(/\n{1,3}---\n*Sources?:.*$/s, '').trim();

        // History fed back to the model must not contain the button tags.
        const answerForHistory = fullReply.replace(ADD_TAG_RE, '').trim();

        setTurns((prev) => [
          ...prev,
          { question: text, answer: fullReply || 'No response.', sources, suggestions },
        ]);
        setHistory((prev) => [
          ...prev,
          { role: 'user', content: text },
          { role: 'assistant', content: answerForHistory },
        ]);
      } catch (err) {
        setTurns((prev) => [
          ...prev,
          { question: text, answer: null, error: err.message, sources: [] },
        ]);
      } finally {
        setStreamingQuestion(null);
        scrollToEnd();
      }
    },
    [prompt, loading, stack, history, scrollToEnd]
  );

  const newChat = () => {
    if (loading) return;
    setTurns([]);
    setHistory([]);
    setPrompt('');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.s }]}>
        <View style={styles.headerLeft}>
          <SparkAvatar size={30} />
          <View>
            <Text style={styles.headerTitle}>PepTalk</Text>
            <Text style={styles.headerSub}>Answer engine · grounded</Text>
          </View>
        </View>
        <TouchableOpacity onPress={newChat} style={styles.newChatBtn} hitSlop={6}>
          <Icon name="plus" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isEmpty ? (
            <EmptyState onPick={(q) => send(q)} prompts={starters} />
          ) : (
            <View style={styles.turnList}>
              {turns.map((t, i) => (
                <Turn key={i} turn={t} />
              ))}
              {loading && <StreamingCard question={streamingQuestion} />}
            </View>
          )}
        </ScrollView>

        {/* Composer */}
        <View style={[styles.composer, { paddingBottom: insets.bottom + SPACING.s }]}>
          {stack.length > 0 && (
            <View style={styles.stackChip}>
              <Icon name="stack" size={13} color={COLORS.bluePrimary} />
              <Text style={styles.stackChipText}>
                Using your stack · <Text style={styles.stackChipBold}>{stack.length} items</Text>
              </Text>
            </View>
          )}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Ask about your stack, dosing, interactions…"
              placeholderTextColor={COLORS.textTertiary}
              multiline
            />
            <TouchableOpacity
              onPress={() => send()}
              disabled={!prompt.trim() || loading}
              style={[
                styles.sendBtn,
                prompt.trim() && !loading ? styles.sendBtnActive : styles.sendBtnIdle,
              ]}
            >
              <Icon
                name="arrowUp"
                size={16}
                strokeWidth={2.5}
                color={prompt.trim() && !loading ? '#fff' : COLORS.textTertiary}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>Educational information · not medical advice</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state — intro + starter prompts
// ─────────────────────────────────────────────────────────────
function EmptyState({ onPick, prompts }) {
  return (
    <View style={es.wrap}>
      <View style={es.intro}>
        <View style={es.logo}>
          <SparkAvatar size={44} />
        </View>
        <View>
          <Text style={es.title}>Ask PepTalk</Text>
          <Text style={es.subtitle}>
            Evidence-based answers about peptides, supplements & protocols — grounded in your curated library.
          </Text>
        </View>
        <View style={es.groundedPill}>
          <Icon name="shield" size={13} color={COLORS.bluePrimary} />
          <Text style={es.groundedText}>Grounded in 1,837 curated files</Text>
        </View>
      </View>

      <View style={es.starters}>
        <Text style={es.startHere}>START HERE</Text>
        {prompts.map((s, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            onPress={() => onPick(s.title)}
            style={es.starterCard}
          >
            <View style={es.starterIcon}>
              <Icon name={s.icon} size={16} color={COLORS.bluePrimary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={es.starterTitle}>{s.title}</Text>
              <Text style={es.starterSub}>{s.sub}</Text>
            </View>
            <Icon name="chevron" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={es.infoBox}>
        <Icon name="info" size={14} color={COLORS.textSecondary} />
        <Text style={es.infoText}>
          Educational information, not medical advice. Always consult a qualified clinician before changing your protocol.
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Turn — user bubble + AI answer card
// ─────────────────────────────────────────────────────────────
function Turn({ turn }) {
  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={tn.userBubble}>
        <Text style={tn.userText}>{turn.question}</Text>
      </View>

      <View style={[tn.answerCard, SHADOWS.elevated]}>
        <View style={tn.answerHeader}>
          <SparkAvatar size={22} />
          <Text style={tn.answerLabel}>ANSWER</Text>
          <View style={{ flex: 1 }} />
          <Text style={tn.grounded}>Grounded · 1,837 files</Text>
        </View>

        {turn.error ? (
          <Text style={tn.errorText}>Error: {turn.error}</Text>
        ) : (
          <MarkdownBubble suggestions={turn.suggestions}>{turn.answer}</MarkdownBubble>
        )}

        {turn.sources && turn.sources.length > 0 && (
          <SourcesFooter sources={turn.sources} />
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SourcesFooter — collapsible list of cited sources
// ─────────────────────────────────────────────────────────────
function SourcesFooter({ sources }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={sf.wrap}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setOpen((o) => !o)}
        style={sf.toggle}
      >
        <View style={sf.toggleLeft}>
          <Icon name="doc" size={13} color={COLORS.textSecondary} />
          <Text style={sf.toggleText}>SOURCES · {sources.length}</Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="chevron" size={14} color={COLORS.textTertiary} />
        </View>
      </TouchableOpacity>
      {open && (
        <View style={{ marginTop: SPACING.sm }}>
          {sources.map((id, i) => {
            const { breadcrumb, kind } = formatSource(id);
            return (
              <View key={i} style={sf.row}>
                <View style={sf.num}>
                  <Text style={sf.numText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={sf.breadcrumb} numberOfLines={1}>
                    {breadcrumb}
                  </Text>
                  <Text style={sf.kind}>{kind}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// StreamingCard — "Searching 1,837 files" + animated dots + skeleton
// ─────────────────────────────────────────────────────────────
function StreamingCard({ question }) {
  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={tn.userBubble}>
        <Text style={tn.userText}>{question}</Text>
      </View>
      <View style={[tn.answerCard, SHADOWS.elevated]}>
        <View style={tn.answerHeader}>
          <SparkAvatar size={22} />
          <Text style={[tn.answerLabel, { color: COLORS.bluePrimary }]}>SEARCHING 1,837 FILES</Text>
          <Dots />
        </View>
        <View style={{ gap: SPACING.sm, marginTop: SPACING.xxs }}>
          <Skeleton width="92%" />
          <Skeleton width="78%" />
          <Skeleton width="85%" />
          <Skeleton width="40%" />
        </View>
      </View>
    </View>
  );
}

function Dots() {
  const a = useAnimatedValue(0.3);
  const b = useAnimatedValue(0.3);
  const c = useAnimatedValue(0.3);
  useEffect(() => {
    const pulse = (v, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
    const anims = [pulse(a, 0), pulse(b, 150), pulse(c, 300)];
    anims.forEach((x) => x.start());
    return () => anims.forEach((x) => x.stop());
  }, [a, b, c]);
  return (
    <View style={sc.dots}>
      {[a, b, c].map((v, i) => (
        <Animated.View key={i} style={[sc.dot, { opacity: v }]} />
      ))}
    </View>
  );
}

function Skeleton({ width }) {
  const shimmer = useAnimatedValue(0.5);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  return <Animated.View style={[sc.skel, { width, opacity: shimmer }]} />;
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.ms,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.panel,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
  },
  turnList: {
    padding: SPACING.md,
    gap: SPACING.lg,
  },

  // Composer
  composer: {
    paddingHorizontal: SPACING.ms,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  stackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    paddingVertical: 5,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.full,
    marginBottom: SPACING.sm,
  },
  stackChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  stackChipBold: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.s,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADII.pill,
    paddingLeft: SPACING.ms,
    paddingRight: SPACING.xs,
    paddingVertical: SPACING.xs,
    ...SHADOWS.card,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.s,
    maxHeight: 120,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: RADII.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: COLORS.bluePrimary,
    ...SHADOWS.cta,
  },
  sendBtnIdle: {
    backgroundColor: COLORS.panel,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 10.5,
    color: COLORS.textTertiary,
    marginTop: SPACING.s,
  },
});

const es = StyleSheet.create({
  wrap: {
    padding: SPACING.l,
    gap: SPACING.l,
  },
  intro: {
    alignItems: 'flex-start',
    gap: SPACING.ms,
  },
  logo: {
    ...SHADOWS.cta,
    borderRadius: RADII.input,
  },
  title: {
    fontSize: FONT_SIZES.screenTitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: SPACING.xxs,
    lineHeight: 21,
    maxWidth: 320,
  },
  groundedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.blueTint,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.full,
  },
  groundedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.bluePrimary,
  },
  starters: {
    gap: SPACING.sm,
    marginTop: SPACING.xxs,
  },
  startHere: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.7,
  },
  starterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADII.card,
    paddingVertical: 13,
    paddingHorizontal: SPACING.ms,
    ...SHADOWS.card,
  },
  starterIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: COLORS.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  starterSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.s,
    padding: SPACING.m,
    backgroundColor: COLORS.panel,
    borderRadius: RADII.panel,
  },
  infoText: {
    flex: 1,
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
});

const tn = StyleSheet.create({
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: COLORS.panel,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.ms,
    borderRadius: RADII.card,
    borderTopRightRadius: 4,
  },
  userText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  answerCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADII.answer,
    padding: SPACING.l,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.m,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  grounded: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    lineHeight: 20,
  },
});

const sf = StyleSheet.create({
  wrap: {
    marginTop: SPACING.l,
    paddingTop: SPACING.ms,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  num: {
    width: 22,
    height: 22,
    borderRadius: RADII.chip,
    backgroundColor: COLORS.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.bluePrimary,
  },
  breadcrumb: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  kind: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
});

const sc = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.bluePrimary,
  },
  skel: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.panel,
  },
});
