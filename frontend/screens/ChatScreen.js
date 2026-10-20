// PepTalk — AI chat tab (simplified).
//
// React Native fetch can't stream a response body incrementally, so we keep the
// original "await full text → parse SSE lines" approach. While the request is in
// flight we show animated dots; on completion we render the full answer.
// Source IDs come from the backend's {type:'sources'} SSE event.

import { useState, useRef, useCallback, useEffect } from 'react';
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
import { useStack } from '../context/StackContext';
import { COLORS, RADII, SPACING, FONT_SIZES } from '../theme/tokens';
import { API_URL } from '../config';

// Inline add-to-stack tags: {{add:Name|amount|unit|slot}}. MarkdownBubble turns
// these into inline buttons for display, but they must be stripped from the text
// sent back to the model as conversation history. (See backend chat.py ADD_TAG_RE.)
const ADD_TAG_RE = /\{\{\s*add:\s*.*?\s*\}\}/gis;

// Format a backend source id ("peptides/semaglutide/dosing-protocols") into a
// readable label like "Semaglutide · Dosing Protocols".
function formatSource(id) {
  const parts = String(id).split('/').filter(Boolean);
  const KINDS = { peptides: 'Peptide', supplements: 'Supplement', lifestyle: 'Lifestyle' };
  let crumbs = parts;
  if (parts.length > 1 && KINDS[parts[0]]) {
    crumbs = parts.slice(1);
  }
  const titleize = (s) =>
    s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return crumbs.map(titleize).join(' · ');
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

        let streamError = null;
        for (const line of rawText.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'token') fullReply += event.content;
            else if (event.type === 'sources') sources = event.sources || [];
            else if (event.type === 'suggestions') suggestions = event.suggestions || [];
            else if (event.type === 'error') streamError = event.content;
          } catch {
            // skip malformed SSE line
          }
        }
        if (streamError) throw new Error(streamError);

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
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>PepTalk</Text>
        <TouchableOpacity onPress={newChat} style={styles.newChatBtn} hitSlop={6}>
          <Icon name="pencil" size={20} color={COLORS.textPrimary} />
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
          contentContainerStyle={[styles.scroll, isEmpty && styles.scrollEmpty]}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isEmpty ? (
            <View style={styles.emptyCenter}>
              <Text style={styles.emptyText}>What can I help with?</Text>
              <View style={styles.inputBar}>
                <TouchableOpacity style={styles.plusBtn} hitSlop={4}>
                  <Icon name="plus" size={18} color={COLORS.textTertiary} />
                </TouchableOpacity>
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
            </View>
          ) : (
            <View style={styles.turnList}>
              {turns.map((t, i) => (
                <Turn key={i} turn={t} />
              ))}
              {loading && <StreamingIndicator question={streamingQuestion} />}
            </View>
          )}
        </ScrollView>

        {/* Composer — only shown when there are messages */}
        {!isEmpty && (
          <View style={[styles.composer, { paddingBottom: insets.bottom + SPACING.s }]}>
            <View style={styles.inputBar}>
              <TouchableOpacity style={styles.plusBtn} hitSlop={4}>
                <Icon name="plus" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
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
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Turn — user bubble + AI answer (plain text, no card)
// ─────────────────────────────────────────────────────────────
function Turn({ turn }) {
  return (
    <View style={{ gap: SPACING.md }}>
      <View style={tn.userBubble}>
        <Text style={tn.userText}>{turn.question}</Text>
      </View>

      <View style={tn.answerWrap}>
        {turn.error ? (
          <Text style={tn.errorText}>Error: {turn.error}</Text>
        ) : (
          <MarkdownBubble suggestions={turn.suggestions}>{turn.answer}</MarkdownBubble>
        )}

        {turn.sources && turn.sources.length > 0 && (
          <SourcesList sources={turn.sources} />
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SourcesList — always-visible flat list of cited sources
// ─────────────────────────────────────────────────────────────
function SourcesList({ sources }) {
  return (
    <View style={sl.wrap}>
      {sources.map((id, i) => (
        <View key={i} style={sl.row}>
          <View style={sl.num}>
            <Text style={sl.numText}>{i + 1}</Text>
          </View>
          <Text style={sl.label} numberOfLines={1}>
            {formatSource(id)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// StreamingIndicator — user bubble + animated dots
// ─────────────────────────────────────────────────────────────
function StreamingIndicator({ question }) {
  return (
    <View style={{ gap: SPACING.md }}>
      <View style={tn.userBubble}>
        <Text style={tn.userText}>{question}</Text>
      </View>
      <Dots />
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
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontSize: FONT_SIZES.navTitle,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  newChatBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
  },
  scrollEmpty: {
    justifyContent: 'center',
  },
  emptyCenter: {
    paddingHorizontal: SPACING.l,
    alignItems: 'center',
    gap: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  turnList: {
    padding: SPACING.md,
    gap: SPACING.xl,
  },

  // Composer
  composer: {
    paddingHorizontal: SPACING.ms,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.s,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADII.pill,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  plusBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: COLORS.textPrimary,
  },
  sendBtnIdle: {
    backgroundColor: COLORS.panel,
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
  answerWrap: {
    paddingLeft: SPACING.xxs,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    lineHeight: 20,
  },
});

const sl = StyleSheet.create({
  wrap: {
    marginTop: SPACING.l,
    gap: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.xxs,
  },
  num: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: COLORS.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.greenDeep,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});

const sc = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: SPACING.xxs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textTertiary,
  },
});
